#!/usr/bin/env node
'use strict';

// PreToolUse (Bash e PowerShell): nenhuma operação de escrita no GitHub acontece sem
// autorização explícita de quem está usando, e nenhuma leitura de credencial também.
//
// Abrir pull request, comentar, revisar, fazer merge, criar ou fechar issue são ações
// que aparecem para o time inteiro e não podem ser tomadas por iniciativa do agente.
//
// Diferente do scope-guard, aqui a ambiguidade resolve para PERGUNTAR, não para liberar:
// o custo de um comentário indevido num PR é maior que o de uma confirmação a mais.
//
// Devolve "ask", que força a confirmação mesmo quando o comando está no allowlist —
// é isso que impede que a proteção seja perdida por configuração de permissão.

const { readHookInput, writeHookDecision } = require('../lib/lib.js');

// Sem diferenciar maiúscula: no Windows `GH pr create` executa o mesmo binário.
const MENTIONS_GH = /(^|[^a-zA-Z0-9_-])gh([^a-zA-Z0-9_-]|$)/i;

// O comando é avaliado por SEGMENTO, não como string única. Casar regex na string
// inteira é o que permitia o bypass: `gh issue view 1 && gh pr create` começa
// com leitura e liberava tudo o que vinha depois do &&.
//
// `&` sozinho também separa comando, mas aparece dentro de URL (`?a=1&b=2`), onde cortar
// esconderia uma flag de escrita do resto do segmento. Por isso são duas leituras: uma
// corta no `&`, a outra não, e a decisão é a mais restritiva das duas.
const SEPARATORS = /&&|\|\||;|\||\$\(|`|\r?\n/;
const SEPARATORS_WITH_AMPERSAND = /&&|\|\||;|\||\$\(|`|\r?\n|&/;

// Regra: basta UM segmento gh que não seja comprovadamente leitura para perguntar.
// É allowlist: o que não estiver enumerado aqui vira pergunta, inclusive subcomando
// novo que o gh venha a ganhar.
const READONLY_SEGMENT = new RegExp(`^\\s*gh(\\.exe)?\\s+(${[
  '--version|--help|help|version',
  'auth\\s+(status|login|switch)',
  'pr\\s+(view|list|diff|checks|status|checkout)',
  'issue\\s+(view|list|status)',
  'repo\\s+(view|list|clone)',
  'release\\s+(view|list|download)',
  'run\\s+(view|list|watch|download)',
  'workflow\\s+(view|list)',
  'search',
  '(label|secret|cache)\\s+list',
  'gist\\s+(view|list)',
  'browse',
  'api',
].join('|')})(\\s|$)`);

const API_CALL = /(^|[^a-zA-Z0-9_-])gh(\.exe)?\s+api(\s|$)/;
const WRITE_METHOD = /(-X|--method)\s*=?\s*(POST|PUT|PATCH|DELETE)/i;

// Armadilha do gh: a simples presença de campo ou de corpo promove a chamada a POST
// implicitamente, sem nenhum -X na linha. A flag curta aceita valor colado (-ft=x) e
// agrupamento (-if t=x), então qualquer grupo curto com f ou F conta.
const IMPLICIT_POST = /(^|\s)(-[a-zA-Z]*[fF]|--field(\s|=|$)|--raw-field(\s|=|$)|--input(\s|=|$))/;

// Segredo é leitura, e ler segredo não é rotina. Estes comandos devolvem material de
// credencial em claro. `gh secret list` fica de fora porque só devolve nomes.
const CREDENTIAL_COMMAND = new RegExp(`(^|[^a-zA-Z0-9_-])gh(\\.exe)?\\s+(${[
  'variable\\s+(list|get)',
  'auth\\s+token',
  'auth\\s+status.*\\s(--show-token|-t)',
].join('|')})(\\s|$)`);

// O mesmo material pela API: variável de Actions, segredo, alerta de secret scanning
// (que traz o valor vazado), deploy key e webhook.
const CREDENTIAL_PATH = /\/(variables|secrets|secret-scanning|keys|hooks)([/?\s"']|$)/;

function classifySegment(segment) {
  if (!MENTIONS_GH.test(segment)) return null;
  if (CREDENTIAL_COMMAND.test(segment)) return 'credencial';
  if (!READONLY_SEGMENT.test(segment)) return 'escrita';
  if (!API_CALL.test(segment)) return null;

  // `gh api` é o único verbo da lista de leitura que escreve sem mudar de nome.
  if (WRITE_METHOD.test(segment) || IMPLICIT_POST.test(segment)) return 'escrita';
  return CREDENTIAL_PATH.test(segment) ? 'credencial' : null;
}

// Em cadeia com as duas coisas a escrita prevalece: é ela que o motivo precisa nomear.
function classify(command) {
  let reason = null;
  for (const separators of [SEPARATORS, SEPARATORS_WITH_AMPERSAND]) {
    for (const segment of command.split(separators)) {
      const found = classifySegment(segment);
      if (found === 'escrita') return found;
      reason = found || reason;
    }
  }
  return reason;
}

const MESSAGES = {
  credencial: [
    'Este comando lê material de credencial do GitHub.',
    'Valor de variável, segredo, chave e token entram no contexto do agente e atravessam '
      + 'o provedor do modelo. Confirme apenas se você pediu esta leitura agora.',
  ],
  escrita: [
    'Esta ação escreve no GitHub e fica visível para o time.',
    'Abrir pull request, comentar, revisar ou fazer merge exige autorização explícita de '
      + 'quem está conduzindo o trabalho. Confirme apenas se você pediu esta ação agora — '
      + 'e prefira revisar o conteúdo antes.',
  ],
};

function main() {
  const command = readHookInput().tool_input?.command;
  if (typeof command !== 'string' || !MENTIONS_GH.test(command)) return;

  const reason = classify(command);
  if (!reason) return;

  const [headline, detail] = MESSAGES[reason];
  writeHookDecision('ask', `${headline}\n\nComando: ${command}\n\n${detail}`);
}

try {
  main();
} catch (error) {
  // Exit diferente de 0 e 2 deixaria o comando passar sem pergunta. Na dúvida, pergunta.
  writeHookDecision('ask', `O gh-guard falhou ao avaliar este comando: ${error.message}`);
}
