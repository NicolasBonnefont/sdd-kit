#!/usr/bin/env node
'use strict';

// PostToolUse: formata o arquivo recém-editado com o formatador do próprio projeto.
//
// Detecta a ferramenta pela linguagem e só usa o que já está instalado no repositório
// ou no PATH. Falha sempre em silêncio — formatação nunca deve interromper o trabalho.
//
// Para sobrescrever a detecção, declare em `.sdd.json` na raiz:
//   { "formatCommand": "make fmt --" }
// O caminho do arquivo é acrescentado ao final do comando.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  config,
  git,
  isExecutable,
  isWindows,
  readHookInput,
  toPosix,
  which,
} = require('../lib/lib.js');

// Arquivo .cmd e .bat só executam através do cmd.exe, e aí o argumento passa por um
// interpretador. Aspas fecham o que importa; o que sobra de especial fica sem execução,
// no mesmo espírito do hook: melhor não formatar do que interpretar nome de arquivo.
function run(command, args, cwd) {
  const options = { cwd, stdio: 'ignore', windowsHide: true };
  if (isWindows && /\.(cmd|bat)$/i.test(command)) {
    const parts = [command, ...args];
    if (parts.some((part) => /["%^&|<>]/.test(part))) return;
    spawnSync(parts.map((part) => `"${part}"`).join(' '), { ...options, shell: true });
    return;
  }
  spawnSync(command, args, options);
}

// O executável local do projeto. No Windows o npm e o composer criam `.cmd` e `.bat`.
function localTool(root, relative) {
  const base = path.join(root, relative);
  const candidates = isWindows && !path.extname(base)
    ? ['.cmd', '.bat', '.exe'].map((ext) => base + ext)
    : [base];
  return candidates.find(isExecutable) || null;
}

// Nome com barra é caminho a partir da raiz do repositório, como o `command -v` resolvia
// rodando dali. Sem barra, vem do PATH.
const resolveCommand = (root, name) => (/[/\\]/.test(name) ? localTool(root, name) : which(name));

// Devolve true quando encontrou a ferramenta, mesmo que ela tenha falhado no arquivo.
function runFirst(root, tools) {
  for (const { local, name, args } of tools) {
    const command = local ? localTool(root, local) : which(name);
    if (command) {
      run(command, args, root);
      return true;
    }
  }
  return false;
}

function toolsFor(file) {
  const prettier = ['--write', '--log-level', 'silent', file];
  const byExtension = [
    [/\.(tsx?|jsx?|mjs|cjs|json|css|scss|less|html|vue|svelte|ya?ml|md)$/, [
      { local: 'node_modules/.bin/prettier', args: prettier },
      { name: 'prettier', args: prettier },
    ]],
    [/\.php$/, [
      { local: 'vendor/bin/php-cs-fixer', args: ['fix', file] },
      { local: 'vendor/bin/pint', args: [file] },
      { local: 'vendor/bin/phpcbf', args: [file] },
    ]],
    [/\.py$/, [
      { name: 'ruff', args: ['format', file] },
      { name: 'black', args: ['--quiet', file] },
    ]],
    [/\.go$/, [{ name: 'gofmt', args: ['-w', file] }]],
    [/\.rs$/, [{ name: 'rustfmt', args: ['--quiet', file] }]],
    [/\.rb$/, [{ name: 'rubocop', args: ['--autocorrect', '--format', 'quiet', file] }]],
    [/\.(java|kt)$/, [{ name: 'ktlint', args: ['--format', file] }]],
    [/\.sql$/, [{ name: 'sqlfluff', args: ['fix', '--disable-progress-bar', file] }]],
  ];
  return byExtension.find(([pattern]) => pattern.test(file))?.[1] || [];
}

function main() {
  const raw = readHookInput().tool_input?.file_path;
  if (typeof raw !== 'string' || !raw) return;

  const file = toPosix(raw);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return;

  const root = git(path.dirname(file), 'rev-parse', '--show-toplevel');
  if (!root) return;

  const custom = config(root, 'formatCommand', '');
  if (!custom) {
    runFirst(root, toolsFor(file));
    return;
  }

  // O .sdd.json vem versionado no repositório, e este hook roda a ferramenta que ele
  // aponta, como já roda o prettier de node_modules ou o pint de vendor. Formatar com o
  // ferramental do projeto é executar código do projeto: abrir um repositório aqui é
  // confiar nele. O que estas duas regras garantem é só que o nome do arquivo editado
  // chegue como argumento, sem passar por shell:
  //   1. nada de metacaractere de shell, incluindo os do cmd.exe
  //   2. o primeiro token tem de resolver para um executável
  if (/[;&|`$><()%^\r\n]/.test(custom)) {
    process.stderr.write(`sdd: formatCommand com metacaractere de shell foi ignorado: ${custom}\n`);
    return;
  }
  const [name, ...args] = custom.trim().split(/\s+/);
  const command = resolveCommand(root, name);
  if (command) run(command, [...args, file], root);
  else process.stderr.write(`sdd: formatCommand não encontrado: ${name}\n`);
}

try {
  main();
} catch {
  // Formatação nunca interrompe o trabalho.
}
