'use strict';

// Funções compartilhadas pelos hooks, pelo validador e pelo instalador.
//
// Tudo aqui roda igual em Linux, macOS e Windows, em qualquer terminal: é por isso que o
// ferramental é Node, sem bash e sem jq. O que varia de sistema fica concentrado nestas
// funções, e o resto do código trabalha com caminho em barra normal.
//
// Configuração por projeto é opcional. Um `.sdd.json` na raiz do repositório pode
// sobrescrever os padrões:
//
//   { "specsDir": "docs/specs", "baseBranch": "main", "formatCommand": "make fmt" }
//
// Sem o arquivo, tudo funciona por detecção.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const isWindows = process.platform === 'win32';

// Entrada que não é JSON vira objeto vazio: hook não tem o que decidir sem evento.
function readHookInput() {
  try {
    const parsed = JSON.parse(fs.readFileSync(0, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Sem process.exit depois disto: no Windows a escrita em pipe é assíncrona, e sair na
// sequência pode cortar a resposta que o harness está esperando.
function writeHookDecision(decision, reason) {
  process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  })}\n`);
}

// Devolve a saída sem as pontas, ou null quando o git falha. Saída vazia é sucesso. O
// limite de saída é folgado porque o diff de uma branch grande passa fácil de 1 MB.
function git(cwd, ...args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// Caminho em barra normal. No Windows o evento traz `C:\repo\x.ts` e o git devolve
// `C:/repo`; o Git Bash ainda pode entregar `/c/repo`. No resto, contrabarra é caractere
// legítimo de nome de arquivo e fica como está.
function toPosix(p, platform = process.platform) {
  if (platform !== 'win32') return p;
  const slashed = p.replace(/\\/g, '/');
  const msys = slashed.match(/^\/([a-zA-Z])(\/|$)/);
  return msys ? `${msys[1].toUpperCase()}:/${slashed.slice(3)}` : slashed;
}

// Caminho de `file` relativo a `root`, ou null se estiver fora. O Windows não diferencia
// maiúscula no sistema de arquivos, então a comparação também não pode diferenciar.
function relativeTo(root, file, platform = process.platform) {
  const base = toPosix(root, platform).replace(/\/+$/, '');
  const target = toPosix(file, platform);
  return fold(target, platform).startsWith(`${fold(base, platform)}/`)
    ? target.slice(base.length + 1)
    : null;
}

function realPath(p) {
  return fs.realpathSync.native(p);
}

// Resolve o ancestral existente mais próximo de um arquivo que talvez ainda não exista.
// Sobe pelo caminho DO ARQUIVO, nunca pelo cwd da sessão, que pode estar em outro
// repositório. O resolve é o que torna a comparação com a raiz do git confiável: nome
// curto do Windows (RUNNER~1) e symlink de /tmp do macOS apontam para o mesmo lugar.
function resolveExisting(file) {
  let dir = path.dirname(file);
  const tail = [path.basename(file)];
  while (!isDirectory(dir)) {
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    tail.unshift(path.basename(dir));
    dir = parent;
  }
  return { dir, file: path.join(realPath(dir), ...tail) };
}

const fold = (s, platform = process.platform) => (platform === 'win32' ? s.toLowerCase() : s);

// O mesmo arquivo relativo a `root`, mas pelo caminho como foi escrito: só o ancestral que
// coincide com a raiz é resolvido. Um link dentro do repositório (`src/config` apontando
// para `shared/config`) continua com o nome que a spec usa.
function literalRelative(root, dir, file) {
  const wanted = fold(toPosix(root).replace(/\/+$/, ''));
  for (let current = dir; ; current = path.dirname(current)) {
    if (fold(toPosix(realPath(current))) === wanted) return toPosix(path.relative(current, file));
    if (path.dirname(current) === current) return null;
  }
}

function config(root, key, fallback) {
  try {
    const raw = fs.readFileSync(path.join(root, '.sdd.json'), 'utf8').replace(/^\uFEFF/, '');
    const value = JSON.parse(raw)[key];
    return value ? String(value) : fallback;
  } catch {
    return fallback;
  }
}

function specsDir(root) {
  return config(root, 'specsDir', 'docs/specs');
}

function baseBranch(root) {
  const configured = config(root, 'baseBranch', '');
  if (configured) return configured;

  const detected = git(root, 'symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD');
  if (detected) return detected.replace(/^refs\/remotes\/origin\//, '');

  for (const candidate of ['main', 'master', 'develop']) {
    if (git(root, 'show-ref', '--verify', '--quiet', `refs/heads/${candidate}`) !== null) {
      return candidate;
    }
  }
  return 'master';
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Acha o diretório de spec correspondente à branch atual, sem exigir convenção de
// nome. Casa quando o nome do diretório aparece na branch, ou quando o primeiro
// token do nome (o identificador do card) aparece nela.
//
// Cobre 915-auditoria-filtros, feat/ABC-123-coisa, JIRA-456/ajuste e afins. Diretório
// começado por ponto fica de fora: é assim que `.arquivo` deixa de restringir escopo.
// Link para diretório conta como diretório.
function findSpec(root, branch) {
  if (!branch) return null;
  const specs = path.join(root, specsDir(root));
  if (!isDirectory(specs)) return null;

  const names = fs.readdirSync(specs)
    .filter((name) => !name.startsWith('.') && isDirectory(path.join(specs, name)))
    .sort();

  const byName = names.find((name) => branch.includes(name));
  if (byName) return path.join(specs, byName);

  const byToken = names.find((name) => {
    const token = name.split('-')[0];
    if (!token || token === name) return false;
    return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(token)}([^A-Za-z0-9]|$)`).test(branch);
  });
  return byToken ? path.join(specs, byToken) : null;
}

// Lê os globs da seção "Arquivos no escopo" de um spec.
function scopePatterns(specPath) {
  const patterns = [];
  let inside = false;
  for (const line of fs.readFileSync(specPath, 'utf8').split(/\r?\n/)) {
    if (/^##\s+Arquivos no escopo/.test(line)) {
      inside = true;
    } else if (/^##\s/.test(line)) {
      inside = false;
    } else if (inside && /^\s*-\s+/.test(line)) {
      const pattern = line.replace(/^\s*-\s+/, '').replace(/`/g, '').trimEnd();
      if (pattern) patterns.push(pattern);
    }
  }
  return patterns;
}

// Glob no estilo do `case` do shell: `*` atravessa barra, então `src/**` e `src/*` são a
// mesma coisa. É a semântica que os specs já escritos esperam. O caminho exato vale antes
// do glob: `app/[id]/page.tsx` é nome de arquivo no Next.js, não classe de caractere.
function matchesGlob(rel, pattern, platform = process.platform) {
  const glob = toPosix(pattern, platform);
  if (fold(glob, platform) === fold(rel, platform)) return true;
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    const close = char === '[' ? glob.indexOf(']', i + 2) : -1;
    if (char === '*') {
      source += '.*';
    } else if (char === '?') {
      source += '.';
    } else if (close > 0) {
      const body = glob.slice(i + 1, close).replace(/^!/, '^').replace(/\\/g, '\\\\');
      source += `[${body}]`;
      i = close;
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`^${source}$`, platform === 'win32' ? 'i' : '').test(rel);
}

// Spec e Module Pack são artefatos do ciclo, não código da mudança: o /sdd-close atualiza
// o pack na branch do card, e o escopo do card não tem por que listá-lo.
function isCycleArtifact(rel, specsRel) {
  return rel.startsWith(`${specsRel}/`) || rel === 'AGENTS.md' || rel.endsWith('/AGENTS.md');
}

function isExecutable(file) {
  try {
    if (!fs.statSync(file).isFile()) return false;
    if (!isWindows) fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Cópia recursiva arquivo a arquivo. O fs.cpSync do Node 22 é nativo e, no Windows, perdeu
// a pasta de destino quando o caminho tinha acento, que é o caso de toda pasta pessoal
// com nome acentuado.
function copyTree(source, dest) {
  if (!fs.statSync(source).isDirectory()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(source, dest);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(source)) copyTree(path.join(source, name), path.join(dest, name));
}

// Equivalente portável de `command -v`. No Windows só conta o que tem extensão
// executável: o `prettier` sem extensão que o npm instala é um script de shell.
function which(name) {
  const extensions = isWindows && !path.extname(name)
    ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';')
    : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const extension of extensions) {
      const candidate = path.join(dir, name + extension);
      if (isExecutable(candidate)) return candidate;
    }
  }
  return null;
}

module.exports = {
  baseBranch,
  config,
  copyTree,
  findSpec,
  git,
  isCycleArtifact,
  isDirectory,
  isExecutable,
  isWindows,
  literalRelative,
  matchesGlob,
  readHookInput,
  realPath,
  relativeTo,
  resolveExisting,
  scopePatterns,
  specsDir,
  toPosix,
  which,
  writeHookDecision,
};
