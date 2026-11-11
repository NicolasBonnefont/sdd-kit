#!/usr/bin/env node
'use strict';

// Instala as skills do sdd-kit no diretório que o harness escolhido espera.
//
// Sem argumentos e com terminal interativo, conduz por perguntas.
// Com argumentos, roda direto — é o modo usado em script e CI.
//
//   node install.js                              interativo
//   node install.js claude --global
//   node install.js cursor <projeto>
//   node install.js --dir <caminho-de-skills>
//   node install.js --check

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline/promises');
const { relativeTo, toPosix, which } = require('./lib/lib.js');

const SOURCE = __dirname;
const HOME = os.homedir();
const CWD = process.cwd();
const HOOKS = ['scope-guard', 'gh-guard', 'format'];
const HARNESSES = ['claude', 'cursor', 'antigravity', 'copilot'];

const bold = (text) => console.log(`\x1b[1m${text}\x1b[0m`);
const dim = (text) => console.log(`\x1b[2m${text}\x1b[0m`);

function usage() {
  console.log(`Uso: node install.js                         (interativo)
     node install.js <harness> [projeto]
     node install.js <harness> --global
     node install.js --dir <caminho-de-skills>
     node install.js --check

Harnesses e destinos:
  claude       <projeto>/.claude/skills        (global: ~/.claude/skills)
  cursor       <projeto>/.cursor/skills        (global: ~/.cursor/skills)
  antigravity  <projeto>/.agents/skills        (global: ~/.gemini/config/skills)
  copilot      <projeto>/.github/skills

Qualquer outro harness compatível com o padrão Agent Skills funciona com --dir.`);
  process.exit(1);
}

const skillNames = () => fs.readdirSync(path.join(SOURCE, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

function lstat(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

// Symlink pendurado é o rastro que uma instalação anterior deixa quando a fonte muda de
// nome ou de lugar. Reconhecer a sobra por isso, e não por prefixo de nome, dispensa
// carregar o nome antigo aqui dentro para sempre.
function danglingLinks(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((entry) => lstat(entry)?.isSymbolicLink() && !fs.existsSync(entry));
}

// Remove o link sem atravessá-lo: uma remoção recursiva em junction do Windows poderia
// alcançar a fonte. Só o que é diretório de verdade é apagado por dentro.
function removeEntry(target) {
  const stat = lstat(target);
  if (!stat) return;
  if (!stat.isSymbolicLink()) {
    fs.rmSync(target, { recursive: true, force: true });
    return;
  }
  try {
    fs.unlinkSync(target);
  } catch {
    fs.rmdirSync(target);
  }
}

// Junction é o link de diretório que o Windows cria sem permissão de administrador, e
// nos outros sistemas o tipo é ignorado. Link para arquivo exige modo de desenvolvedor,
// então ali a cópia é o caminho comum: rodar o instalador de novo atualiza.
function linkOrCopy(source, dest, type) {
  try {
    fs.symlinkSync(source, dest, type);
    return false;
  } catch {
    fs.cpSync(source, dest, { recursive: true });
    return true;
  }
}

// O caminho vai entre aspas porque pasta com espaço é comum, e sem aspas o shell corta o
// comando no espaço: o hook morre com erro não bloqueante e a guarda some em silêncio.
// Barra normal funciona no sh, no Git Bash, no PowerShell e no cmd.
const hookCommand = (name) => `node "${toPosix(path.join(SOURCE, 'hooks', `${name}.js`))}"`;

// Aspas duplas não seguram `$` e crase no sh e no PowerShell, nem `%` no cmd. Num caminho
// com eles o shell reescreve o comando registrado, e o hook morre sem bloquear nada.
const UNSAFE_PATH = /[$`%"\\]/;

// O arquivo que o comando registrado executa, quando dá para saber. Comando de outra
// ferramenta, como `npx prettier` ou `node "$CLAUDE_PROJECT_DIR/x.js"`, não aponta para
// caminho absoluto nenhum e fica como está.
function hookTarget(command) {
  const quoted = command.match(/^(?:node(?:\.exe)?\s+)?"([^"]+)"/);
  const candidate = quoted ? quoted[1] : command.split(' ')[0];
  return path.isAbsolute(candidate) ? candidate : null;
}

// Hook do kit é o arquivo com o nome de um dos três dentro de uma pasta `hooks`. O `.sh` é
// o da versão em bash, que só repassa ao `.js`. `npm run format` não é hook do kit.
function kitHook(command) {
  const target = command && hookTarget(command);
  if (!target || path.basename(path.dirname(target)) !== 'hooks') return null;
  const match = path.basename(target).match(/^(scope-guard|gh-guard|format)\.(js|sh)$/);
  return match ? { name: match[1], target, legacy: match[2] === 'sh' } : null;
}

function realOrNull(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return null;
  }
}

// Substituível é o hook do kit que aponta para esta fonte ou para arquivo que não existe
// mais, sobra de instalação anterior. A comparação é pelo caminho real, que no Windows
// ignora maiúscula e nome curto. Hook de outra ferramenta nunca é substituível.
function isReplaceable(command) {
  const hook = kitHook(command);
  if (!hook) return false;
  const real = realOrNull(hook.target);
  return !real || relativeTo(realOrNull(SOURCE), real) !== null;
}

function readSettings(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').trim();
  return raw ? JSON.parse(raw) : {};
}

function registeredCommands(settings) {
  return Object.values(settings.hooks || {})
    .flat()
    .flatMap((entry) => entry.hooks || [])
    .map((hook) => hook.command)
    .filter(Boolean);
}

function registerHooks(settingsFile) {
  const settings = readSettings(settingsFile);
  // Sai só o hook substituível. O grupo continua enquanto tiver hook de outra ferramenta.
  const keep = (entries) => (entries || []).flatMap((entry) => {
    if (!Array.isArray(entry.hooks)) return [entry];
    const hooks = entry.hooks.filter((hook) => !isReplaceable(hook.command));
    if (hooks.length === entry.hooks.length) return [entry];
    return hooks.length > 0 ? [{ ...entry, hooks }] : [];
  });
  const entry = (matcher, name) => ({
    matcher,
    hooks: [{ type: 'command', command: hookCommand(name) }],
  });

  settings.hooks = settings.hooks || {};
  settings.hooks.PreToolUse = [
    ...keep(settings.hooks.PreToolUse),
    entry('Write|Edit', 'scope-guard'),
    // O PowerShell é ferramenta própria do Claude Code: olhar só o Bash deixaria o mesmo
    // `gh pr create` passar direto no Windows.
    entry('Bash|PowerShell', 'gh-guard'),
  ];
  settings.hooks.PostToolUse = [
    ...keep(settings.hooks.PostToolUse),
    entry('Write|Edit', 'format'),
  ];

  const temporary = `${settingsFile}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`);
  fs.renameSync(temporary, settingsFile);
}

// --- detecção -----------------------------------------------------------------

function detectHarnesses() { // do mais provável ao menos
  const found = [];
  const seen = (name, where) => found.push({ name, where });
  const exists = (...parts) => fs.existsSync(path.join(...parts));

  if (exists(CWD, '.claude')) seen('claude', '.claude/ neste projeto');
  if (exists(CWD, '.cursor')) seen('cursor', '.cursor/ neste projeto');
  if (exists(CWD, '.agents')) seen('antigravity', '.agents/ neste projeto');
  if (exists(CWD, '.github', 'skills')) seen('copilot', '.github/skills/ neste projeto');
  if (exists(HOME, '.claude')) seen('claude', '~/.claude/ na sua máquina');
  if (exists(HOME, '.cursor')) seen('cursor', '~/.cursor/ na sua máquina');
  if (exists(HOME, '.gemini')) seen('antigravity', '~/.gemini/ na sua máquina');
  if (which('claude')) seen('claude', 'CLI no PATH');
  if (which('cursor')) seen('cursor', 'CLI no PATH');

  return found.filter((item, index) => found.findIndex((other) => other.name === item.name) === index);
}

// --- modo interativo ----------------------------------------------------------

async function interactive() {
  bold('');
  bold('  sdd-kit — ferramental de Spec-Driven Development');
  dim('  ciclo: connect · init · pack · spec · execute · validate · review · pr · close');
  console.log('');

  const detected = detectHarnesses();
  const names = [
    ...detected.map((item) => item.name),
    ...HARNESSES.filter((name) => !detected.some((item) => item.name === name)),
  ];
  names.forEach((name, index) => {
    const where = detected.find((item) => item.name === name)?.where;
    const note = where ? `\x1b[2m— encontrado: ${where}\x1b[0m` : '';
    console.log(`  ${index + 1}) ${name.padEnd(12)} ${note}`.trimEnd());
  });

  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('');
  const choice = Number((await prompt.question('  Onde instalar? [1] ')) || 1);
  const harness = names[choice - 1];
  if (!harness) {
    prompt.close();
    console.log('  Opção inválida.');
    process.exit(1);
  }

  console.log('');
  let global = false;
  if (harness === 'copilot') {
    dim('  O Copilot não tem escopo global; será instalado neste projeto.');
  } else {
    console.log('  1) Global — vale para todos os repositórios desta máquina (recomendado)');
    console.log(`  2) Só neste projeto — ${CWD}`);
    console.log('');
    global = (await prompt.question('  Escopo? [1] ')) !== '2';
  }
  prompt.close();
  return { harness, global, project: CWD };
}

// --- diagnóstico --------------------------------------------------------------

function checkSkills(dir) {
  const stale = danglingLinks(dir);
  const installed = skillNames().some((name) => lstat(path.join(dir, name)));
  if (!installed && stale.length === 0) return null;

  let problems = 0;
  console.log(`  ${dir}`);
  for (const name of skillNames()) {
    const dest = path.join(dir, name);
    if (lstat(dest)?.isSymbolicLink() && !fs.existsSync(dest)) {
      console.log(`    quebrado   /${name}  → ${fs.readlinkSync(dest)}`);
      problems += 1;
    } else if (!fs.existsSync(dest)) {
      console.log(`    faltando   /${name}`);
      problems += 1;
    }
  }
  for (const entry of stale) {
    const name = path.basename(entry);
    if (fs.existsSync(path.join(SOURCE, 'skills', name))) continue;
    console.log(`    obsoleto   /${name}  → ${fs.readlinkSync(entry)}`);
    problems += 1;
  }
  console.log('');
  return problems;
}

function checkHooks(settingsFile) {
  const hooks = registeredCommands(readSettings(settingsFile)).map(kitHook).filter(Boolean);
  if (hooks.length === 0) return 0;

  let problems = 0;
  console.log(`  ${settingsFile}`);
  for (const name of HOOKS) {
    // Confere o caminho REGISTRADO, e não o do repositório: entrada que sobrou de
    // instalação anterior aponta para arquivo que já saiu do lugar, e é exatamente
    // esse caso que precisa aparecer aqui.
    const mine = hooks.filter((hook) => hook.name === name);
    const hook = mine.find((item) => !item.legacy) || mine[0];
    if (!hook) {
      console.log(`    faltando   ${name}.js`);
      problems += 1;
    } else if (!fs.existsSync(hook.target)) {
      console.log(`    quebrado   ${name}.js  → ${hook.target}`);
      problems += 1;
    } else if (hook.legacy) {
      console.log(`    antigo     ${name}.sh  → ${hook.target}`);
      problems += 1;
    } else {
      console.log(`    ok         ${name}.js`);
    }
  }
  console.log('');
  return problems;
}

function check() {
  bold('');
  bold('  sdd-kit — diagnóstico');
  dim(`  fonte: ${SOURCE}`);
  console.log('');

  let found = false;
  let problems = 0;
  const dirs = [
    path.join(HOME, '.claude', 'skills'),
    path.join(HOME, '.cursor', 'skills'),
    path.join(HOME, '.gemini', 'config', 'skills'),
    path.join(CWD, '.claude', 'skills'),
    path.join(CWD, '.cursor', 'skills'),
    path.join(CWD, '.agents', 'skills'),
    path.join(CWD, '.github', 'skills'),
  ];
  for (const dir of new Set(dirs)) {
    if (!fs.existsSync(dir)) continue;
    const result = checkSkills(dir);
    if (result === null) continue;
    found = true;
    problems += result;
  }

  const settingsFiles = [
    path.join(HOME, '.claude', 'settings.json'),
    path.join(CWD, '.claude', 'settings.json'),
  ];
  for (const file of new Set(settingsFiles)) {
    if (fs.existsSync(file)) problems += checkHooks(file);
  }

  if (!found) {
    console.log('  Nenhuma instalação encontrada.');
    console.log('');
    process.exitCode = 1;
    return;
  }

  bold(problems === 0
    ? '  Tudo em dia. Não precisa reinstalar.'
    : `  ${problems} pendência(s). Rode o instalador de novo para resolver.`);
  console.log('');
  process.exitCode = problems > 0 ? 1 : 0;
}

// --- argumentos ---------------------------------------------------------------

function parseArguments(args) {
  const [harness, ...rest] = args;
  const options = { harness, global: false, project: CWD };
  if (harness === '-h' || harness === '--help') usage();
  for (const argument of rest) {
    if (argument === '--global') options.global = true;
    else if (argument === '-h' || argument === '--help') usage();
    else options.project = path.resolve(argument);
  }
  if (harness === '--dir' && rest.length === 0) usage();
  return options;
}

function resolveTarget({ harness, global, project }) {
  if (harness === '--dir') return project;
  switch (harness) {
    case 'claude':
      return global ? path.join(HOME, '.claude', 'skills') : path.join(project, '.claude', 'skills');
    case 'cursor':
      return global ? path.join(HOME, '.cursor', 'skills') : path.join(project, '.cursor', 'skills');
    case 'antigravity':
      return global
        ? path.join(HOME, '.gemini', 'config', 'skills')
        : path.join(project, '.agents', 'skills');
    case 'copilot':
      if (global) {
        console.log('copilot não tem escopo global; use por projeto');
        process.exit(1);
      }
      return path.join(project, '.github', 'skills');
    default:
      console.log(`Harness desconhecido: ${harness}`);
      return usage();
  }
}

// --- instalação ---------------------------------------------------------------

function installSkills(target) {
  fs.mkdirSync(target, { recursive: true });
  console.log('');

  // Remover é seguro — já não aponta para nada — e é o que faz o rename de uma skill não
  // deixar rastro. Só o que está quebrado sai; skill de outra ferramenta que funciona
  // fica onde está.
  for (const entry of danglingLinks(target)) {
    console.log(`  removido  /${path.basename(entry)}  → ${fs.readlinkSync(entry)}`);
    removeEntry(entry);
  }

  for (const name of skillNames()) {
    const source = path.join(SOURCE, 'skills', name);
    const dest = path.join(target, name);
    removeEntry(dest);
    const copied = linkOrCopy(source, dest, 'junction');
    // Copiada, a skill perde o caminho relativo até a lib que o script dela usa.
    if (copied && fs.existsSync(path.join(dest, 'scripts'))) {
      fs.copyFileSync(path.join(SOURCE, 'lib', 'lib.js'), path.join(dest, 'scripts', 'lib.js'));
    }
    console.log(`  /${name}${copied ? '  (cópia: rode o instalador de novo para atualizar)' : ''}`);
  }

  console.log('');
  console.log(`  Skills instaladas em ${target}`);
}

// Claude Code é o único harness que consome subagentes e hooks no formato deste repo.
// Nos demais, os revisores de agents/ são lidos pela própria skill sdd-review.
function installClaudeExtras(base) {
  const agentsDir = path.join(base, 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  for (const agent of fs.readdirSync(path.join(SOURCE, 'agents'))) {
    if (!agent.endsWith('.md')) continue;
    const dest = path.join(agentsDir, agent);
    removeEntry(dest);
    linkOrCopy(path.join(SOURCE, 'agents', agent), dest, 'file');
  }
  console.log(`  Revisores instalados em ${agentsDir}`);

  const settingsFile = path.join(base, 'settings.json');
  registerHooks(settingsFile);
  console.log(`  Hooks registrados em ${settingsFile}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--check') {
    check();
    return;
  }
  if (args.length === 0 && !process.stdin.isTTY) usage();

  const options = args.length === 0 ? await interactive() : parseArguments(args);
  if (options.harness === 'claude' && UNSAFE_PATH.test(toPosix(SOURCE))) {
    console.error(`  O caminho ${SOURCE} tem $, crase, %, aspas ou contrabarra,`);
    console.error('  que o shell reinterpreta no comando do hook. Mova o clone e rode de novo.');
    process.exit(1);
  }
  installSkills(resolveTarget(options));

  if (options.harness === 'claude') {
    installClaudeExtras(options.global ? path.join(HOME, '.claude') : path.join(options.project, '.claude'));
  }

  console.log('');
  bold('  Pronto.');
  dim('  Próximo passo: /sdd-connect (uma vez por máquina), depois /sdd-init no seu repositório.');
  console.log('');
}

main().catch((error) => {
  console.error(`  Instalação interrompida: ${error.message}`);
  process.exitCode = 1;
});
