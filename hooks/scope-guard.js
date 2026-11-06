#!/usr/bin/env node
'use strict';

// PreToolUse: impede que a edição saia dos "Arquivos no escopo" declarados no change spec.
//
// Só age quando existe um spec correspondente à branch atual. Em qualquer situação
// ambígua ele libera — hook que bloqueia trabalho legítimo é desinstalado na primeira
// semana e leva o resto do ferramental junto.

const fs = require('node:fs');
const path = require('node:path');
const {
  findSpec,
  git,
  isCycleArtifact,
  matchesGlob,
  readHookInput,
  realPath,
  relativeTo,
  resolveExisting,
  scopePatterns,
  specsDir,
  toPosix,
  writeHookDecision,
} = require('../lib/lib.js');

function main() {
  const raw = readHookInput().tool_input?.file_path;
  if (typeof raw !== 'string' || !raw) return;

  const file = toPosix(raw);
  if (!path.isAbsolute(file)) return;

  // O diretório do arquivo pode ainda não existir (criação de arquivo novo em pasta nova).
  const located = resolveExisting(file);
  if (!located) return;

  const toplevel = git(located.dir, 'rev-parse', '--show-toplevel');
  if (!toplevel) return;
  const root = realPath(toplevel);

  // Se o arquivo não está sob a raiz encontrada, não é assunto deste repositório.
  const rel = relativeTo(root, located.file);
  if (rel === null) return;

  const specDir = findSpec(root, git(root, 'branch', '--show-current'));
  if (!specDir) return;
  const spec = path.join(specDir, 'spec.md');
  if (!fs.existsSync(spec)) return;

  if (isCycleArtifact(rel, specsDir(root))) return;

  const patterns = scopePatterns(spec);
  if (patterns.length === 0 || patterns.some((pattern) => matchesGlob(rel, pattern))) return;

  writeHookDecision('deny', [
    'Fora do escopo declarado no change spec.',
    '',
    `Arquivo: ${rel}`,
    `Spec: ${relativeTo(root, spec)}`,
    '',
    'Se a mudança realmente precisa deste arquivo, pare e peça ao usuário para adicioná-lo '
      + 'à seção "Arquivos no escopo" do spec. Expandir o escopo sem registrar é a origem '
      + 'mais comum de regressão.',
  ].join('\n'));
}

try {
  main();
} catch {
  // Na dúvida, libera: erro interno aqui nunca pode travar o trabalho de quem está usando.
}
