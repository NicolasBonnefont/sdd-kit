#!/usr/bin/env node
'use strict';

// Bateria do instalador, do validador e do hook de formatação, de ponta a ponta.
//
// Tudo roda dentro de uma pasta pessoal temporária, com espaço e acento no nome: é a forma
// real de caminho no Windows, e foi nela que o registro de hook quebrava em silêncio. O kit
// também é copiado para uma pasta assim, porque é o caminho dele que vai para o registro.

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const isWindows = process.platform === 'win32';
const CLI = path.join(ROOT, 'bin', 'cli.js');
const VALIDATE = path.join(ROOT, 'skills', 'sdd-validate', 'scripts', 'validate.js');
const FORMAT = path.join(ROOT, 'hooks', 'format.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd tools '));
const KIT = path.join(TMP, 'kit do João');
const INSTALL = path.join(KIT, 'install.js');
const HOME = path.join(TMP, 'João Silva');
const SKILLS = path.join(HOME, '.claude', 'skills');
const SETTINGS = path.join(HOME, '.claude', 'settings.json');
const env = { ...process.env, HOME, USERPROFILE: HOME };
let pass = 0;
let fail = 0;

function report(ok, label, detail = '') {
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`  FALHOU  ${label}${detail ? `\n${detail}` : ''}`);
  }
}

function node(script, args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: HOME, env, ...options });
}

const readSettings = () => JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
const allHooks = (settings) => Object.values(settings.hooks).flat();
const commandFor = (settings, name) => allHooks(settings)
  .map((entry) => entry.hooks[0].command)
  .find((command) => command.includes(name));

fs.mkdirSync(HOME, { recursive: true });
const copyKit = (dest, parts) => parts.forEach((part) => fs.cpSync(path.join(ROOT, part), path.join(dest, part), {
  recursive: true,
}));
copyKit(KIT, ['install.js', 'lib', 'hooks', 'skills', 'agents']);

// --- instalação global --------------------------------------------------------
let result = node(INSTALL, ['claude', '--global']);
report(result.status === 0, 'instala em pasta com espaco e acento', result.stdout + result.stderr);

for (const skill of ['sdd-spec', 'sdd-review', 'sdd-validate']) {
  report(fs.existsSync(path.join(SKILLS, skill, 'SKILL.md')), `skill ${skill} instalada`);
}
report(fs.existsSync(path.join(HOME, '.claude', 'agents', 'seguranca.md')), 'revisor instalado');

const installed = readSettings();
const shellMatcher = installed.hooks.PreToolUse.find((entry) => entry.hooks[0].command.includes('gh-guard'));
report(shellMatcher?.matcher === 'Bash|PowerShell', 'gh-guard observa Bash e PowerShell');

// Roda o comando registrado pelo shell padrão do sistema, como o harness faz. É isto que
// pega o registro sem aspas: o `sh` cortava o caminho no espaço e a guarda sumia.
const guard = spawnSync(commandFor(installed, 'gh-guard'), {
  shell: true,
  encoding: 'utf8',
  env,
  input: JSON.stringify({ tool_input: { command: 'gh pr create --fill' } }),
});
report(guard.stdout.includes('"permissionDecision":"ask"'), 'comando registrado executa a guarda', guard.stderr);

result = node(INSTALL, ['--check']);
report(result.status === 0, '--check aprova instalacao integra', result.stdout);

// --- reinstalar é idempotente e respeita o que é dos outros -------------------
const foreign = { matcher: 'Bash', hooks: [{ type: 'command', command: 'npx prettier --check .' }] };
const sibling = path.join(HOME, 'outra-ferramenta.sh');
fs.writeFileSync(sibling, '');
const foreignFile = { matcher: 'Bash', hooks: [{ type: 'command', command: `"${sibling}"` }] };
const stale = { matcher: 'Bash', hooks: [{ type: 'command', command: path.join(path.sep, 'nao-existe', 'hooks', 'gh-guard.sh') }] };
// Caminho que só o shell resolve não é sobra: não existir ao pé da letra não diz nada.
const byVariable = { matcher: 'Bash', hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/audit.js"' }] };
const byRelative = { matcher: 'Bash', hooks: [{ type: 'command', command: 'node ".claude/hooks/x.js"' }] };
const shared = {
  matcher: 'Write|Edit',
  hooks: [
    { type: 'command', command: path.join(path.sep, 'nao-existe', 'hooks', 'format.sh') },
    { type: 'command', command: 'npm run format' },
  ],
};
const edited = readSettings();
edited.hooks.PreToolUse.push(foreign, foreignFile, stale, byVariable, byRelative);
edited.hooks.PostToolUse.push(shared);
edited.theme = 'dark';
fs.writeFileSync(SETTINGS, JSON.stringify(edited));

result = node(INSTALL, ['claude', '--global']);
report(result.status === 0, 'reinstala por cima', result.stdout + result.stderr);

const again = readSettings();
const pre = again.hooks.PreToolUse.map((entry) => entry.hooks[0].command);
report(pre.filter((command) => command.includes('gh-guard.js')).length === 1, 'hook nao duplica', pre.join('\n'));
report(pre.includes('npx prettier --check .'), 'hook de outra ferramenta continua', pre.join('\n'));
report(!pre.some((command) => command.includes('nao-existe')), 'sobra de instalacao antiga sai', pre.join('\n'));
report(again.theme === 'dark', 'configuracao alheia continua');
report(pre.includes(`"${sibling}"`), 'hook alheio com caminho entre aspas continua', pre.join('\n'));
report(pre.includes(byVariable.hooks[0].command), 'hook alheio com variavel de ambiente continua', pre.join('\n'));
report(pre.includes(byRelative.hooks[0].command), 'hook alheio com caminho relativo continua', pre.join('\n'));
const post = again.hooks.PostToolUse.flatMap((entry) => entry.hooks.map((hook) => hook.command));
report(post.includes('npm run format') && !post.some((command) => command.includes('nao-existe')),
  'no grupo misto sai so a sobra do kit', post.join('\n'));

// Hook de outra ferramenta com `format` no nome não se passa pelo do kit.
result = node(INSTALL, ['--check']);
report(result.status === 0 && result.stdout.includes('ok         format.js'), '--check ignora npm run format', result.stdout);

// Remover o link nunca pode atravessar até a fonte.
report(fs.existsSync(path.join(KIT, 'skills', 'sdd-spec', 'SKILL.md')), 'fonte intacta depois de reinstalar');

// --- quem atualizou a versão em bash com git pull -----------------------------
// A instalação antiga registrou hooks/*.sh. A ponte mantém a guarda de pé até reinstalar.
const legacy = readSettings();
const guardEntry = legacy.hooks.PreToolUse.find((entry) => entry.hooks[0].command.includes('gh-guard.js'));
guardEntry.hooks[0].command = `"${path.join(KIT, 'hooks', 'gh-guard.sh')}"`;
fs.writeFileSync(SETTINGS, JSON.stringify(legacy));
if (!isWindows) {
  const bridge = spawnSync(guardEntry.hooks[0].command, {
    shell: true,
    encoding: 'utf8',
    input: JSON.stringify({ tool_input: { command: 'gh pr merge 1' } }),
  });
  report(bridge.stdout.includes('"permissionDecision":"ask"'), 'ponte .sh executa a guarda', bridge.stderr);
  const withoutNode = spawnSync('/bin/sh', [path.join(KIT, 'hooks', 'gh-guard.sh')], {
    encoding: 'utf8',
    env: { PATH: path.join(TMP, 'sem-node') },
    input: JSON.stringify({ tool_input: { command: 'gh pr merge 1' } }),
  });
  report(withoutNode.stdout.includes('"permissionDecision":"ask"'), 'ponte sem node pergunta', withoutNode.stdout);
}
result = node(INSTALL, ['--check']);
report(result.status === 1 && result.stdout.includes('antigo     gh-guard.sh'), '--check aponta registro antigo', result.stdout);
result = node(INSTALL, ['claude', '--global']);
const renewed = readSettings().hooks.PreToolUse.map((entry) => entry.hooks[0].command);
report(!renewed.some((command) => command.includes('gh-guard.sh')) && renewed.some((command) => command.includes('gh-guard.js')),
  'reinstalar troca a ponte pelo .js', renewed.join('\n'));

// No Windows o mesmo kit chamado por outra grafia de maiúscula é a mesma instalação.
if (isWindows) {
  result = node(INSTALL.toLowerCase(), ['claude', '--global']);
  const count = readSettings().hooks.PreToolUse.filter((entry) => entry.hooks[0].command.includes('gh-guard.js')).length;
  report(result.status === 0 && count === 1, 'outra grafia do caminho nao duplica o hook', String(count));
}

// --- caminho que o shell reescreveria ------------------------------------------
const dollar = path.join(TMP, 'kit$dev');
copyKit(dollar, ['install.js', 'lib']);
result = node(path.join(dollar, 'install.js'), ['claude', '--global']);
report(result.status === 1 && result.stderr.includes('reinterpreta'), 'caminho com $ recusa registrar hook', result.stdout + result.stderr);

// --- diagnóstico aponta o que falta -------------------------------------------
fs.rmSync(path.join(SKILLS, 'sdd-spec'), { recursive: true, force: true });
result = node(INSTALL, ['--check']);
report(result.status === 1 && result.stdout.includes('faltando   /sdd-spec'), '--check aponta skill faltando', result.stdout);

// --- destino arbitrário e argumento inválido ----------------------------------
const custom = path.join(TMP, 'destino livre');
result = node(INSTALL, ['--dir', custom]);
report(result.status === 0 && fs.existsSync(path.join(custom, 'sdd-help', 'SKILL.md')), '--dir instala no caminho dado', result.stderr);
report(node(INSTALL, ['inexistente']).status === 1, 'harness desconhecido reprova');

// --- porta de entrada do npx --------------------------------------------------
// Clona o próprio repositório: a porta só precisa provar que chega ao instalador sem shell.
const clone = path.join(TMP, 'clone do kit');
result = node(CLI, ['--dir', path.join(TMP, 'via cli')], {
  env: { ...env, SDD_KIT_REPO: ROOT, SDD_KIT_HOME: clone },
});
report(result.status === 0 && fs.existsSync(path.join(TMP, 'via cli', 'sdd-help', 'SKILL.md')), 'cli clona e delega', result.stdout + result.stderr);

// --- validador ----------------------------------------------------------------
const P = path.join(TMP, 'projeto validado');
const G = (...args) => execFileSync('git', ['-C', P, ...args], { stdio: 'ignore' });
const SPEC = `# 915

## Comportamento atual
x

## Comportamento alvo
x

## Invariantes
- x

## Fora de escopo
x

## Arquivos no escopo
- \`src/pedidos/filtro.ts\`

## Critério de verificação
x
`;
const specDir = path.join(P, 'docs', 'specs', '915-filtro');
fs.mkdirSync(specDir, { recursive: true });
fs.mkdirSync(path.join(P, 'src', 'pedidos'), { recursive: true });
fs.writeFileSync(path.join(specDir, 'spec.md'), SPEC);
fs.writeFileSync(path.join(P, 'src', 'pedidos', 'filtro.ts'), 'x\n');
fs.writeFileSync(path.join(P, 'src', 'pedidos', 'AGENTS.md'), '# pack\n');
G('init', '-q', '-b', 'main');
G('config', 'user.email', 't@t');
G('config', 'user.name', 't');
G('add', '-A');
G('commit', '-qm', 'base');
G('checkout', '-q', '-b', '915-filtro');
fs.writeFileSync(path.join(P, 'src', 'pedidos', 'filtro.ts'), 'y\n');
fs.writeFileSync(path.join(P, 'src', 'pedidos', 'AGENTS.md'), '# pack novo\n');
G('add', '-A');
G('commit', '-qm', 'mudanca');

result = node(VALIDATE, [], { cwd: P });
report(result.status === 0 && result.stdout.includes('Estrutura válida.'), 'spec completo e pack no diff passam', result.stdout);

// Diff que o git não calcula reprova, em vez de virar diff vazio que passa.
result = node(VALIDATE, [path.join('docs', 'specs', '915-filtro'), 'inexistente'], { cwd: P });
report(result.status === 1 && result.stdout.includes('FALHA  não consegui calcular o diff contra inexistente'), 'base inexistente reprova', result.stdout);

// Clone sem a branch base local usa a do remoto.
const P2 = path.join(TMP, 'clone validado');
execFileSync('git', ['clone', '-q', P, P2], { stdio: 'ignore' });
result = node(VALIDATE, [path.join('docs', 'specs', '915-filtro'), 'main'], { cwd: P2 });
report(result.status === 0 && result.stdout.includes('Estrutura válida.'), 'base so no remoto serve', result.stdout);

fs.writeFileSync(path.join(specDir, 'tasks.md'), '- [x] ### T1\n  **Consumes:** a\n  **Produces:** b\n  **Requisito:** c\n  **Verificação:** d\n- [ ] ### T2\n  **Consumes:** a\n');
result = node(VALIDATE, [path.join('docs', 'specs', '915-filtro'), 'main'], { cwd: P });
report(result.status === 1 && result.stdout.includes('FALHA  todas as 2 tasks têm **Produces:** (achei 1)'), 'task incompleta reprova', result.stdout);
report(result.stdout.includes('AVISO  1 de 2 tasks concluídas'), 'conta tasks concluidas', result.stdout);
fs.rmSync(path.join(specDir, 'tasks.md'));

fs.writeFileSync(path.join(P, 'fora.ts'), 'x\n');
G('add', '-A');
G('commit', '-qm', 'fora');
result = node(VALIDATE, [], { cwd: P });
report(result.status === 1 && result.stdout.includes('FALHA  fora do escopo declarado: fora.ts'), 'arquivo fora do escopo reprova', result.stdout);

fs.writeFileSync(path.join(specDir, 'spec.md'), SPEC.replace('- x\n', ''));
result = node(VALIDATE, [], { cwd: P });
report(result.stdout.includes('FALHA  seção "Invariantes" não está vazia'), 'secao vazia reprova', result.stdout);

result = node(VALIDATE, ['nao/existe'], { cwd: P });
report(result.status === 1 && result.stdout.includes('diretório de spec não encontrado: nao/existe'), 'diretorio inexistente reprova', result.stdout);

// --- hook de formatação -------------------------------------------------------
const F = path.join(TMP, 'formatado');
const marker = path.join(F, 'formatado.txt');
const formatter = path.join(TMP, 'fmt.js');
fs.mkdirSync(F, { recursive: true });
fs.writeFileSync(formatter, `require('fs').writeFileSync(process.argv[2] + '.ok', 'ok');\n`);
execFileSync('git', ['-C', F, 'init', '-q']);
fs.writeFileSync(marker, 'x\n');

const format = (file) => node(FORMAT, [], { input: JSON.stringify({ tool_input: { file_path: file } }) });
const setFormat = (command) => fs.writeFileSync(path.join(F, '.sdd.json'), JSON.stringify({ formatCommand: command }));
const quietCopy = path.join(F, 'fmt.js');
fs.copyFileSync(formatter, quietCopy);

setFormat('node fmt.js');
result = format(marker);
report(result.status === 0 && fs.existsSync(`${marker}.ok`), 'formatCommand recebe o arquivo', result.stderr);

fs.rmSync(`${marker}.ok`);
setFormat('node fmt.js; echo x');
result = format(marker);
report(result.status === 0 && !fs.existsSync(`${marker}.ok`) && result.stderr.includes('metacaractere'), 'metacaractere e ignorado', result.stderr);

setFormat('programa-que-nao-existe --write');
report(format(marker).status === 0, 'formatador ausente passa em silencio');
report(format(path.join(F, 'nao-existe.ts')).status === 0, 'arquivo ausente passa em silencio');
report(node(FORMAT, [], { input: 'isto nao e json' }).status === 0, 'entrada invalida passa em silencio');

// Limpeza não decide o resultado: o Windows pode segurar arquivo do .git por um instante.
try {
  fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 3 });
} catch {
  console.log(`  aviso: ${TMP} ficou para trás`);
}
console.log(`\n  ${pass} passou, ${fail} falhou`);
process.exitCode = fail === 0 ? 0 : 1;
