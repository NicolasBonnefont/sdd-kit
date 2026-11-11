#!/usr/bin/env node
'use strict';

// Bateria do scope-guard. Direção de falha: na dúvida, LIBERA.
//
// Os caminhos saem de path.join, então no Windows o hook recebe `C:\...` de verdade, que é
// o formato do evento naquele sistema.

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { matchesGlob, relativeTo, toPosix } = require('../lib/lib.js');

const HOOK = path.join(__dirname, '..', 'hooks', 'scope-guard.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd scope '));
let pass = 0;
let fail = 0;

function report(ok, message) {
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`  FALHOU  ${message}`);
  }
}

function decision(stdin) {
  const { status, stdout } = spawnSync(process.execPath, [HOOK], { input: stdin, encoding: 'utf8' });
  if (status !== 0) return `exit ${status}`;
  if (!stdout.trim()) return 'libera';
  return JSON.parse(stdout).hookSpecificOutput?.permissionDecision ?? 'libera';
}

const event = (file, cwd = '') => JSON.stringify({ cwd, tool_input: { file_path: file } });

function expect(expected, label, stdin) {
  const got = decision(stdin);
  report(got === expected, `esperado ${expected} obtido ${got}  ${label}`);
}

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { stdio: 'ignore' });

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function repository(root, branch) {
  fs.mkdirSync(root, { recursive: true });
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 't@t');
  git(root, 'config', 'user.name', 't');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'base', '--allow-empty');
  git(root, 'checkout', '-q', '-b', branch);
}

// --- projeto com convenção numérica -------------------------------------------
const A = path.join(TMP, 'num');
write(path.join(A, 'docs', 'specs', '915-auditoria', 'spec.md'), '## Arquivos no escopo\n- src/**\n');
write(path.join(A, 'src', 'a.ts'), 'x\n');
write(path.join(A, 'lib', 'c.ts'), 'x\n');
repository(A, '915-auditoria-filtros');

expect('libera', 'dentro do escopo', event(path.join(A, 'src', 'b.ts'), A));
expect('deny', 'fora do escopo', event(path.join(A, 'lib', 'c.ts'), A));
expect('libera', 'o proprio spec', event(path.join(A, 'docs', 'specs', '915-auditoria', 'spec.md'), A));
// O /sdd-close atualiza o pack na branch do card, antes de arquivar o spec.
expect('libera', 'module pack fora do escopo', event(path.join(A, 'lib', 'AGENTS.md'), A));
expect('libera', 'agents da raiz fora do escopo', event(path.join(A, 'AGENTS.md'), A));
expect('deny', 'nome que so termina em AGENTS', event(path.join(A, 'lib', 'NOTAS-AGENTS.md'), A));
expect('libera', 'dir novo dentro do escopo', event(path.join(A, 'src', 'novo', 'sub', 'x.ts'), A));
expect('deny', 'dir novo fora do escopo', event(path.join(A, 'lib', 'novo', 'y.ts'), A));

// O cwd da sessão em OUTRO repositório não pode fazer o hook aplicar este spec.
const B = path.join(TMP, 'outro');
fs.mkdirSync(path.join(B, 'src'), { recursive: true });
git(B, 'init', '-q');
expect('libera', 'arquivo de outro repositorio', event(path.join(B, 'src', 'z.ts'), A));

// --- projeto com convenção JIRA e .sdd.json -----------------------------------
const C = path.join(TMP, 'jira');
write(path.join(C, '.sdd.json'), '{"specsDir":"especificacoes","baseBranch":"main"}\n');
write(path.join(C, 'especificacoes', 'ABC-123-tela', 'spec.md'), '## Arquivos no escopo\n- app/**\n');
write(path.join(C, 'app', 'a.py'), 'x\n');
repository(C, 'feature/ABC-123-tela');

expect('libera', 'branch JIRA, dentro do escopo', event(path.join(C, 'app', 'b.py'), C));
expect('deny', 'branch JIRA, fora do escopo', event(path.join(C, 'outro', 'c.py'), C));
expect('libera', 'specsDir customizado', event(path.join(C, 'especificacoes', 'ABC-123-tela', 'spec.md'), C));

// --- spec escrito no Windows, em pasta de usuário com espaço e acento ---------
const D = path.join(TMP, 'João Silva', 'projeto');
write(path.join(D, 'docs', 'specs', '77-tela', 'spec.md'), '## Arquivos no escopo\r\n- `app/**`\r\n\r\n## Fim\r\n');
write(path.join(D, 'app', 'a.ts'), 'x\n');
repository(D, '77-tela');

expect('libera', 'espaco e acento, dentro do escopo', event(path.join(D, 'app', 'b.ts'), D));
expect('deny', 'espaco e acento, fora do escopo', event(path.join(D, 'lib', 'c.ts'), D));

// --- link dentro do repositório: o nome escrito e o de destino valem ----------
// Junction é o link de diretório que o Windows cria sem administrador; fora dele o tipo é
// ignorado. O destino absoluto é o que a junction exige.
const L = path.join(TMP, 'link');
write(path.join(L, 'docs', 'specs', '60-config', 'spec.md'), '## Arquivos no escopo\n- src/config/**\n- app/users/[id]/page.tsx\n');
write(path.join(L, 'shared', 'config', 'a.ts'), 'x\n');
write(path.join(L, 'lib', 'b.ts'), 'x\n');
fs.mkdirSync(path.join(L, 'src'), { recursive: true });
fs.symlinkSync(path.join(L, 'shared', 'config'), path.join(L, 'src', 'config'), 'junction');
repository(L, '60-config');

expect('libera', 'arquivo pelo link, escopo no nome escrito', event(path.join(L, 'src', 'config', 'a.ts'), L));
expect('libera', 'arquivo novo pelo link', event(path.join(L, 'src', 'config', 'novo', 'c.ts'), L));
expect('deny', 'fora do escopo com link no repositorio', event(path.join(L, 'lib', 'b.ts'), L));
// Colchete é nome de pasta no Next.js: o caminho exato casa consigo mesmo.
expect('libera', 'caminho com colchetes listado no escopo', event(path.join(L, 'app', 'users', '[id]', 'page.tsx'), L));
expect('deny', 'irmao do caminho com colchetes', event(path.join(L, 'app', 'users', 'x', 'page.tsx'), L));

// A pasta do spec também pode ser link.
const S = path.join(TMP, 'spec-link');
const real = path.join(TMP, 'specs reais', '61-tela');
write(path.join(real, 'spec.md'), '## Arquivos no escopo\n- src/**\n');
write(path.join(S, 'lib', 'a.ts'), 'x\n');
fs.mkdirSync(path.join(S, 'docs', 'specs'), { recursive: true });
fs.symlinkSync(real, path.join(S, 'docs', 'specs', '61-tela'), 'junction');
repository(S, '61-tela');
expect('deny', 'spec em pasta que e link', event(path.join(S, 'lib', 'a.ts'), S));

// --- spec arquivado não restringe mais nada -----------------------------------
const E = path.join(TMP, 'arquivado');
write(path.join(E, 'docs', 'specs', '.arquivo', '50-velho', 'spec.md'), '## Arquivos no escopo\n- src/**\n');
write(path.join(E, 'lib', 'a.ts'), 'x\n');
repository(E, '50-velho');
expect('libera', 'spec em .arquivo nao casa', event(path.join(E, 'lib', 'a.ts'), E));

// --- ausência de contexto deve sempre liberar ---------------------------------
git(A, 'checkout', '-q', '-b', 'chore/sem-numero');
expect('libera', 'branch sem correspondencia', event(path.join(A, 'lib', 'c.ts'), A));
git(A, 'checkout', '-q', '915-auditoria-filtros');
fs.rmSync(path.join(A, 'docs', 'specs'), { recursive: true, force: true });
expect('libera', 'spec ausente no disco', event(path.join(A, 'lib', 'c.ts'), A));
expect('libera', 'input vazio', '{}');
expect('libera', 'stdin que nao e JSON', 'isto nao e json');
expect('libera', 'fora de repositorio git', event(path.join(TMP, 'solto.ts'), TMP));

// --- a tradução de caminho do Windows, testável em qualquer sistema -----------
function same(got, wanted, label) {
  report(got === wanted, `esperado ${wanted} obtido ${got}  ${label}`);
}

same(toPosix('C:\\repo\\src\\x.ts', 'win32'), 'C:/repo/src/x.ts', 'contrabarra');
same(toPosix('/c/repo/x.ts', 'win32'), 'C:/repo/x.ts', 'caminho do Git Bash');
same(toPosix('a\\b', 'linux'), 'a\\b', 'contrabarra fora do Windows e nome de arquivo');
same(relativeTo('C:/Repo', 'c:\\repo\\src\\x.ts', 'win32'), 'src/x.ts', 'maiuscula no Windows');
same(relativeTo('/repo', '/Repo/x.ts', 'linux'), null, 'maiuscula fora do Windows');
same(relativeTo('/repo', '/repo-outro/x.ts', 'linux'), null, 'prefixo sem barra');
same(matchesGlob('src/a/b.ts', 'src/**', 'linux'), true, 'glob atravessa barra');
same(matchesGlob('src/a.ts', 'src/[ab].ts', 'linux'), true, 'classe de caractere');
same(matchesGlob('src/c.ts', 'src/[!ab].ts', 'linux'), true, 'classe negada');
same(matchesGlob('SRC/a.ts', 'src\\*', 'win32'), true, 'glob escrito com contrabarra');
same(matchesGlob('app/[id]/page.tsx', 'app/[id]/page.tsx', 'linux'), true, 'colchete literal casa consigo');
same(matchesGlob('App/[Id]/page.tsx', 'app/[id]/page.tsx', 'win32'), true, 'colchete literal sem maiuscula no Windows');
same(matchesGlob('app/i/page.tsx', 'app/[id]/page.tsx', 'linux'), true, 'colchete continua classe no glob');

// Limpeza não decide o resultado: o Windows pode segurar arquivo do .git por um instante.
try {
  fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 3 });
} catch {
  console.log(`  aviso: ${TMP} ficou para trás`);
}
console.log(`\n  ${pass} passou, ${fail} falhou`);
process.exitCode = fail === 0 ? 0 : 1;
