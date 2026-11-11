#!/usr/bin/env node
'use strict';

// Suíte completa. É o que o CI roda, em Linux e em Windows.

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { isWindows, which } = require('../lib/lib.js');

const ROOT = path.join(__dirname, '..');
let failed = false;

const step = (title) => console.log(`\n\x1b[1m${title}\x1b[0m`);
const fromRoot = (...parts) => path.join(ROOT, ...parts);
const read = (file) => fs.readFileSync(file, 'utf8');
const relative = (file) => path.relative(ROOT, file).split(path.sep).join('/');

function problem(message) {
  console.log(`  ${message}`);
  failed = true;
}

// Roda as verificações de um passo e imprime `ok` só quando ele não achou nada.
function verify(title, body) {
  step(title);
  const before = failed;
  failed = false;
  body();
  if (!failed) console.log('  ok');
  failed = failed || before;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const allFiles = walk(ROOT);
const skills = fs.readdirSync(fromRoot('skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const skillFile = (name) => fromRoot('skills', name, 'SKILL.md');
const agentFiles = fs.readdirSync(fromRoot('agents'))
  .filter((name) => name.endsWith('.md'))
  .map((name) => fromRoot('agents', name));
const instructionFiles = [...skills.map(skillFile), ...agentFiles];
const toolingFiles = [...walk(fromRoot('skills')), ...walk(fromRoot('agents'))];

verify('sintaxe dos scripts', () => {
  for (const file of allFiles.filter((name) => name.endsWith('.js'))) {
    const { status, stderr } = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (status !== 0) problem(`ERRO de sintaxe: ${relative(file)}\n${stderr}`);
  }
});

// O que sobrou em shell é só o que não roda no Windows por definição: a porta de entrada
// por curl, o hook local de commit, que o próprio git executa, e as pontes de hooks/*.sh
// que mantêm vivas as instalações da versão em bash.
const shellScripts = allFiles.filter((file) => file.endsWith('.sh') || relative(file).startsWith('.githooks/'));

step('shellcheck');
if (!isWindows && which('shellcheck')) {
  // SC1091: não segue `source` de caminho resolvido em runtime.
  const { status, stdout } = spawnSync(
    'shellcheck',
    ['--severity=warning', '--exclude=SC1091', ...shellScripts],
    { encoding: 'utf8' },
  );
  if (status === 0) console.log('  ok');
  else problem(stdout);
} else {
  console.log('  shellcheck ausente — pulado');
}

verify('frontmatter das skills', () => {
  for (const name of skills) {
    const file = skillFile(name);
    if (!fs.existsSync(file)) {
      problem(`${name}: SKILL.md ausente`);
      continue;
    }
    const text = read(file);
    // A spec exige que o campo name case com o nome do diretório.
    const declared = text.match(/^name:\s*(.*)$/m)?.[1];
    if (declared !== name) problem(`${name}: campo name é "${declared}"`);
    if (!/^description:/m.test(text)) problem(`${name}: sem description`);
    const lines = text.split('\n').length - 1;
    if (lines > 500) problem(`${name}: ${lines} linhas (spec recomenda até 500)`);
  }
});

verify('invocacao coerente entre harnesses', () => {
  // disable-model-invocation e do Claude Code; allow_implicit_invocation e do Codex.
  // Uma skill e user-invoked nos dois ou em nenhum — divergencia deixa ela auto-invocavel
  // num harness e nao no outro.
  for (const name of skills) {
    const adapter = fromRoot('skills', name, 'agents', 'openai.yaml');
    if (!fs.existsSync(adapter)) {
      problem(`${name}: sem adaptador agents/openai.yaml`);
      continue;
    }
    const claude = read(skillFile(name)).includes('disable-model-invocation: true');
    const codex = read(adapter).includes('allow_implicit_invocation: false');
    if (claude !== codex) problem(`${name}: claude=${claude} codex=${codex}`);
  }
});

verify('router cobre todos os comandos', () => {
  // Router que nao lista um comando manda a pessoa para lugar nenhum; router que lista um
  // comando removido manda para um comando que nao existe. Os dois sao pior que nada.
  const router = read(skillFile('sdd-help'));
  for (const name of skills.filter((skill) => skill !== 'sdd-help')) {
    if (!router.includes(`/${name}`)) problem(`${name} ausente do router`);
  }
  for (const [reference] of router.matchAll(/\/sdd-[a-z]+/g)) {
    if (reference === '/sdd-kit') continue;
    if (!skills.includes(reference.slice(1))) problem(`router cita ${reference}, que nao existe`);
  }
});

step('proibicao imperativa dentro do orcamento');
{
  // Proibicao nomeia o comportamento errado e o torna disponivel. Guardrail duro pode
  // permanecer; o resto se escreve no positivo. Orcamento: 6.
  const pattern = /^[-*\s]*\*{0,2}(Não|Nunca|Jamais) |\*\*(Não|Nunca) /;
  const count = instructionFiles
    .flatMap((file) => read(file).split('\n'))
    .filter((line) => pattern.test(line)).length;
  if (count <= 6) console.log(`  ok (${count})`);
  else problem(`${count} proibicoes imperativas (orcamento 6)`);
}

verify('revisores atendem spec e diff', () => {
  // O passo mais barato do ciclo é revisar o spec. Se um revisor perder o modo spec,
  // a verificação volta inteira para depois do código.
  for (const file of agentFiles) {
    if (!/^## Dois momentos/m.test(read(file))) {
      problem(`${path.basename(file)} sem a seção 'Dois momentos' — perdeu o modo spec`);
    }
  }
  if (!read(skillFile('sdd-spec')).includes('modo spec')) {
    problem('sdd-spec não dispara os revisores antes do gate humano');
  }
});

verify('escolha de modelo pertence a quem usa', () => {
  // Alias de modelo é vocabulário de cada harness, e envelhece a cada modelo novo.
  // O padrão tem de ser herdar da sessão; quem quiser outro passa argumento.
  for (const file of agentFiles) {
    if (/^model:/m.test(read(file))) {
      problem(`${relative(file)} fixa modelo. Remova: o padrão é herdar da sessão`);
    }
  }
});

verify('caminho absoluto de máquina', () => {
  // Regra 1 do AGENTS.md: fato de um ambiente específico não vive no ferramental. Caminho
  // absoluto é a forma genérica desse vazamento — só funciona na máquina de quem escreveu.
  for (const file of toolingFiles) {
    if (/\/home\/|\/Users\/|C:\\/.test(read(file))) {
      problem(`${relative(file)} tem caminho absoluto de máquina`);
    }
  }
});

verify('o ciclo roda em qualquer terminal', () => {
  // Bash e jq saíram dos requisitos para o ciclo funcionar no cmd e no PowerShell. Skill que
  // volte a exigi-los, ou que mande rodar um .sh, devolve a limitação por um caminho
  // que ninguém testa no Windows.
  for (const name of skills) {
    const text = read(skillFile(name));
    const compatibility = text.match(/^compatibility:\s*(.*)$/m)?.[1] || '';
    if (/\b(bash|jq)\b/.test(compatibility)) problem(`${name}: compatibility exige ${compatibility}`);
    if (/\b[\w-]+\.sh\b/.test(text)) problem(`${name}: cita script de shell`);
  }
  for (const file of [...walk(fromRoot('hooks')), ...walk(fromRoot('lib'))]) {
    if (!file.endsWith('.sh')) continue;
    // Ponte é o .sh que só repassa ao .js de mesmo nome. Lógica em shell não volta.
    const target = `${path.basename(file, '.sh')}.js`;
    const bridge = fs.existsSync(path.join(path.dirname(file), target)) && read(file).includes(`exec node "\${0%/*}/${target}"`);
    if (!bridge) problem(`${relative(file)}: hook e lib são Node; .sh só como ponte para o .js`);
  }
});

verify('token residual da migração', () => {
  // Trava de regressão permanente do rename: nome antigo que reaparecer reprova aqui.
  // Cada padrão abre com a primeira letra entre colchetes para que esta linha não case
  // consigo mesma. A fronteira à esquerda em `[l]d-` é obrigatória: sem ela `build-` casa
  // e o passo reprova texto legítimo. O spec da migração cita os nomes antigos por
  // definição, então `docs/superpowers/specs/` fica de fora.
  const residual = /[l]icitar|[g]lab|[g]itlab|(^|[^a-z])[l]d-/i;
  for (const file of allFiles) {
    if (relative(file).startsWith('docs/superpowers/specs/')) continue;
    read(file).split('\n').forEach((line, index) => {
      if (residual.test(line)) problem(`${relative(file)}:${index + 1}: ${line.trim()}`);
    });
  }
});

verify('referências a comandos inexistentes', () => {
  const sources = [...toolingFiles, fromRoot('README.md')];
  for (const file of sources) {
    for (const [reference] of read(file).matchAll(/\/sdd-[a-z]+/g)) {
      // `~/sdd-kit` e `NicolasBonnefont/sdd-kit` são o nome do repositório dentro de um
      // caminho, não um comando. O prefixo dos comandos casa com o nome do projeto.
      if (reference !== '/sdd-kit' && !skills.includes(reference.slice(1))) {
        problem(`${reference} é referenciado em ${relative(file)} mas não existe`);
      }
    }
  }
});

verify('bit de execução nos entrypoints', () => {
  // bin/cli.js é o bin do pacote e bootstrap.sh é executado direto. Sem o bit a instalação
  // morre em "Permission denied" antes de copiar qualquer skill. As pontes de hooks/ são
  // executadas pelo caminho que a instalação antiga registrou.
  const bridges = fs.readdirSync(fromRoot('hooks')).filter((name) => name.endsWith('.sh'));
  for (const entry of ['bootstrap.sh', 'bin/cli.js', ...bridges.map((name) => `hooks/${name}`)]) {
    // O índice do git é o que quem clona recebe, e é o único bit que existe no Windows.
    const line = execFileSync('git', ['-C', ROOT, 'ls-files', '-s', '--', entry], { encoding: 'utf8' });
    const mode = line.split(/\s/)[0];
    if (mode && mode !== '100755') problem(`${entry} está ${mode} no índice do git (esperado 100755)`);
  }
});

step('bateria dos hooks e das ferramentas');
for (const battery of ['scope-guard.test.js', 'gh-guard.test.js', 'tools.test.js']) {
  const { status } = spawnSync(process.execPath, [fromRoot('tests', battery)], { stdio: 'inherit' });
  if (status !== 0) failed = true;
}

console.log(`\n\x1b[1m  Suíte ${failed ? 'vermelha' : 'verde'}.\x1b[0m\n`);
process.exitCode = failed ? 1 : 0;
