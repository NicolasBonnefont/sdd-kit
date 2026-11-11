#!/usr/bin/env node
'use strict';

// Verificações estruturais de um change spec. Determinístico, sem modelo.
//
// Uso: node validate.js [diretorio-do-spec] [branch-base]
//
// Sem argumentos, resolve o spec pela branch atual e detecta a branch base.
// Sai 0 quando tudo passa, 1 quando há falha. Cada linha começa com OK, FALHA ou AVISO.

const fs = require('node:fs');
const path = require('node:path');

// Instalada por link, a skill enxerga o repositório do ferramental. Instalada por cópia,
// o instalador deixa a lib ao lado deste arquivo.
const sibling = path.join(__dirname, 'lib.js');
const lib = require(fs.existsSync(sibling) ? sibling : '../../../lib/lib.js');

const SECTIONS = [
  'Comportamento atual',
  'Comportamento alvo',
  'Invariantes',
  'Fora de escopo',
  'Arquivos no escopo',
  'Critério de verificação',
];
const FILLED_SECTIONS = ['Invariantes', 'Arquivos no escopo'];
const TASK_FIELDS = ['Consumes', 'Produces', 'Requisito', 'Verificação'];

let failed = false;

function check(ok, message) {
  console.log(`${ok ? 'OK    ' : 'FALHA '} ${message}`);
  if (!ok) failed = true;
}

const count = (text, pattern) => (text.match(pattern) || []).length;

function sectionLines(lines, section) {
  const body = [];
  let inside = false;
  for (const line of lines) {
    if (line === `## ${section}`) {
      inside = true;
    } else if (line.startsWith('## ')) {
      inside = false;
    } else if (inside && line.trim()) {
      body.push(line);
    }
  }
  return body;
}

function checkSpec(spec, dir) {
  if (!fs.existsSync(spec)) {
    console.log(`FALHA  spec.md ausente em ${dir}`);
    failed = true;
    return;
  }
  console.log('OK     spec.md presente');
  const text = fs.readFileSync(spec, 'utf8');
  for (const section of SECTIONS) {
    check(text.includes(`## ${section}`), `seção "${section}"`);
  }
  const lines = text.split(/\r?\n/);
  for (const section of FILLED_SECTIONS) {
    check(sectionLines(lines, section).length > 0, `seção "${section}" não está vazia`);
  }
}

function checkTasks(tasks) {
  if (!fs.existsSync(tasks)) {
    console.log('AVISO  tasks.md ausente — rode /sdd-execute para gerar');
    return;
  }
  console.log('OK     tasks.md presente');
  const text = fs.readFileSync(tasks, 'utf8');
  const total = count(text, /^- \[[ x]\] ###/gm);
  check(total > 0, `tasks.md declara ao menos uma task (${total})`);

  for (const field of TASK_FIELDS) {
    const found = count(text, new RegExp(`^\\s*\\*\\*${field}:\\*\\*`, 'gm'));
    check(found >= total, `todas as ${total} tasks têm **${field}:** (achei ${found})`);
  }
  console.log(`AVISO  ${count(text, /^- \[x\] ###/gm)} de ${total} tasks concluídas`);
}

function checkScope(spec, root, base) {
  if (!fs.existsSync(spec) || lib.git(root, 'rev-parse', '--git-dir') === null) return;
  const patterns = lib.scopePatterns(spec);
  if (patterns.length === 0) return;

  const specsRel = lib.specsDir(root);
  // Sem o quotepath, o git devolve nome acentuado entre aspas e em octal. Num clone sem a
  // branch base local, a do remoto serve igual.
  const changed = (ref) => lib.git(root, '-c', 'core.quotepath=off', 'diff', '--name-only', `${ref}...HEAD`);
  const diff = changed(base) ?? changed(`origin/${base}`);
  if (diff === null) {
    console.log(`FALHA  não consegui calcular o diff contra ${base}; passe a branch base como argumento`);
    failed = true;
    return;
  }
  const outside = diff.split('\n')
    .filter((file) => file && !lib.isCycleArtifact(file, specsRel))
    .filter((file) => !patterns.some((pattern) => lib.matchesGlob(file, pattern)));

  for (const file of outside) console.log(`FALHA  fora do escopo declarado: ${file}`);
  check(outside.length === 0, 'todos os arquivos do diff estão no escopo');
}

function main() {
  const [dirArgument, baseArgument] = process.argv.slice(2);
  const root = lib.git(process.cwd(), 'rev-parse', '--show-toplevel') || '.';
  const dir = dirArgument || lib.findSpec(root, lib.git(root, 'branch', '--show-current'));
  const base = baseArgument || lib.baseBranch(root);

  if (!dir || !lib.isDirectory(dir)) {
    console.log(`FALHA  diretório de spec não encontrado${dirArgument ? `: ${dirArgument}` : ''}`);
    console.log('       nenhum spec casa com a branch atual — rode /sdd-spec');
    process.exitCode = 1;
    return;
  }

  console.log(`AVISO  spec: ${dir} · branch base: ${base}`);
  const spec = path.join(dir, 'spec.md');
  checkSpec(spec, dir);
  checkTasks(path.join(dir, 'tasks.md'));
  checkScope(spec, root, base);

  console.log('');
  console.log(failed ? 'Estrutura inválida.' : 'Estrutura válida.');
  process.exitCode = failed ? 1 : 0;
}

main();
