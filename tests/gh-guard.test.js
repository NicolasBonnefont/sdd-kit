#!/usr/bin/env node
'use strict';

// Bateria do gh-guard. Direção de falha: na dúvida, PERGUNTA.

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.join(__dirname, '..', 'hooks', 'gh-guard.js');
let pass = 0;
let fail = 0;

function run(stdin) {
  return spawnSync(process.execPath, [HOOK], { input: stdin, encoding: 'utf8' });
}

// Liberar é ausência de saída, não um JSON dizendo "allow" — por isso o vazio precisa ser
// traduzido aqui. Hook que estoura também reprova: exit diferente de 0 deixaria passar.
function decision(stdin) {
  const { status, stdout } = run(stdin);
  if (status !== 0) return `exit ${status}`;
  if (!stdout.trim()) return 'libera';
  return JSON.parse(stdout).hookSpecificOutput?.permissionDecision ?? 'libera';
}

function report(ok, message) {
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`  FALHOU  ${message}`);
  }
}

const event = (command) => JSON.stringify({ tool_input: { command } });

function expect(expected, command) {
  const got = decision(event(command));
  report(got === expected, `esperado ${expected} obtido ${got}  ${command}`);
}

function expectRaw(expected, stdin, label) {
  const got = decision(stdin);
  report(got === expected, `esperado ${expected} obtido ${got}  ${label}`);
}

function expectReason(fragment, command) {
  const { stdout } = run(event(command));
  const reason = stdout ? JSON.parse(stdout).hookSpecificOutput?.permissionDecisionReason : '';
  report((reason || '').includes(fragment), `motivo sem "${fragment}"  ${command}`);
}

// --- leitura: deve liberar ----------------------------------------------------
expect('libera', "gh --version");
expect('libera', "gh --help");
expect('libera', "gh help");
expect('libera', "gh version");
expect('libera', "gh auth status");
expect('libera', "gh auth login");
expect('libera', "gh auth switch --user alguem");
expect('libera', "gh pr view 42");
expect('libera', "gh pr list --state open");
expect('libera', "gh pr diff 42");
expect('libera', "gh pr checks 42");
expect('libera', "gh pr status");
expect('libera', "gh pr checkout 42");
expect('libera', "gh issue view 915 --comments");
expect('libera', "gh issue list --limit 1");
expect('libera', "gh issue status");
expect('libera', "gh repo view");
expect('libera', "gh repo list org");
expect('libera', "gh repo clone org/repo");
expect('libera', "gh release view v1.0.0");
expect('libera', "gh release list");
expect('libera', "gh release download v1.0.0");
expect('libera', "gh run view 12345");
expect('libera', "gh run list --limit 5");
expect('libera', "gh run watch 12345");
expect('libera', "gh run download 12345");
expect('libera', "gh workflow view ci.yml");
expect('libera', "gh workflow list");
expect('libera', "gh search issues bug");
expect('libera', "gh search prs --author eu");
expect('libera', "gh search repos spec-driven");
expect('libera', "gh search code needle");
expect('libera', "gh label list");
expect('libera', "gh secret list");
expect('libera', "gh cache list");
expect('libera', "gh gist view abc123");
expect('libera', "gh gist list");
expect('libera', "gh browse");
expect('libera', "gh api repos/o/r/issues");
expect('libera', "gh api -X GET repos/o/r/issues");
expect('libera', "gh api repos/o/r/pulls --paginate --jq \".[].number\"");
expect('libera', "gh api --paginate \"repos/{owner}/{repo}/pulls/7/comments\"");
expect('libera', "gh api -i repos/o/r/issues");
expect('libera', "gh api repos/o/r/actions/runs");
expect('libera', "gh auth status --hostname github.com");

// Cadeia inteiramente de leitura continua liberada — o guard não é um pedágio.
expect('libera', "gh pr view 1 && gh pr view 2");
expect('libera', "gh pr list | grep open");
expect('libera', "gh issue list ; gh pr status");

// Sem gh nenhum: não é assunto deste hook.
expect('libera', "npm test");
expect('libera', "git log --oneline");
expect('libera', "echo ghost");
expect('libera', "cat highlight.txt");

// --- escrita direta: deve perguntar -------------------------------------------
expect('ask', "gh pr create --fill");
expect('ask', "gh pr comment 42 --body \"comentario\"");
expect('ask', "gh pr review 42 --approve");
expect('ask', "gh pr merge 42 --squash");
expect('ask', "gh pr close 42");
expect('ask', "gh pr reopen 42");
expect('ask', "gh pr edit 42 --title x");
expect('ask', "gh pr ready 42");
expect('ask', "gh issue create --title x");
expect('ask', "gh issue comment 915 --body \"texto\"");
expect('ask', "gh issue close 9");
expect('ask', "gh issue reopen 9");
expect('ask', "gh issue edit 9 --add-label bug");
expect('ask', "gh issue pin 9");
expect('ask', "gh issue transfer 9 org/outro");
expect('ask', "gh issue delete 9");
expect('ask', "gh release create v1.0.0");
expect('ask', "gh release delete v1.0.0");
expect('ask', "gh release edit v1.0.0 --title x");
expect('ask', "gh release upload v1.0.0 dist.zip");
expect('ask', "gh repo create org/novo --private");
expect('ask', "gh repo delete org/repo");
expect('ask', "gh repo edit --description x");
expect('ask', "gh repo fork org/repo");
expect('ask', "gh repo archive org/repo");
expect('ask', "gh workflow run ci.yml");
expect('ask', "gh workflow enable ci.yml");
expect('ask', "gh workflow disable ci.yml");
expect('ask', "gh run rerun 12345");
expect('ask', "gh run cancel 12345");
expect('ask', "gh secret set TOKEN");
expect('ask', "gh secret delete TOKEN");
expect('ask', "gh variable set NIVEL");
expect('ask', "gh variable delete NIVEL");
expect('ask', "gh label create bug");
expect('ask', "gh label delete bug");
expect('ask', "gh label edit bug --color ff0000");
expect('ask', "gh gist create notas.md");
expect('ask', "gh gist delete abc123");
expect('ask', "gh gist edit abc123");

// --- gh api: método explícito -------------------------------------------------
expect('ask', "gh api -X POST repos/o/r/issues");
expect('ask', "gh api -XPOST repos/o/r/issues");
expect('ask', "gh api --method DELETE repos/o/r/issues/1");
expect('ask', "gh api --method=PATCH repos/o/r/issues/1");
expect('ask', "gh api --method PUT repos/o/r/issues/1/lock");

// --- gh api com campo: POST implícito, sem -X nenhum --------------------------
// Campo presente muda o método: o gh promove a chamada a POST sem nenhum -X.
expect('ask', "gh api repos/o/r/issues -f title=x");
expect('ask', "gh api repos/o/r/issues -F body=@corpo.md");
expect('ask', "gh api repos/o/r/issues --field title=x");
expect('ask', "gh api repos/o/r/issues --raw-field body=texto");

// O valor colado na flag e o agrupamento de flags curtas são o mesmo campo para o gh.
expect('ask', "gh api repos/o/r/issues -ftitle=x");
expect('ask', "gh api repos/o/r/issues -Fbody=@corpo.md");
expect('ask', "gh api repos/o/r/issues -if title=x");

// Corpo vindo de arquivo também promove a POST, sem campo e sem -X.
expect('ask', "gh api repos/o/r/issues --input corpo.json");
expect('ask', "gh api repos/o/r/issues --input=corpo.json");

// --- leitura de credencial: deve perguntar ------------------------------------
// Ler segredo não é rotina. Estes caminhos devolvem material de credencial, e por isso
// saem do que o allowlist dispensa de confirmação. `gh secret list` fica na leitura:
// ele só devolve nomes.
expect('ask', "gh variable list");
expect('ask', "gh variable get NIVEL");
expect('ask', "gh auth token");
expect('ask', "gh auth status --show-token");
expect('ask', "gh auth status -t");
expect('ask', "gh api repos/o/r/actions/variables");
expect('ask', "gh api repos/o/r/actions/variables/NIVEL");
expect('ask', "gh api \"repos/o/r/actions/variables?per_page=100\"");
expect('ask', "gh api orgs/o/actions/variables");
expect('ask', "gh api repos/o/r/environments/prod/variables");
expect('ask', "gh api repos/o/r/actions/secrets");
expect('ask', "gh api repos/o/r/dependabot/secrets");
expect('ask', "gh api repos/o/r/secret-scanning/alerts");
expect('ask', "gh api repos/o/r/keys");
expect('ask', "gh api repos/o/r/hooks");
expect('ask', "gh api repos/o/r/hooks/1/config");
expect('ask', "gh api orgs/o/hooks");
expect('ask', "gh issue list && gh api repos/o/r/actions/variables");

// --- o bypass que a revisão externa encontrou --------------------------------
// Cadeia que COMEÇA com leitura e termina em escrita. Passava antes da correção,
// porque a regex de leitura estava ancorada no início e avaliava a string inteira.
expect('ask', "gh pr view 1 && gh pr create");
expect('ask', "gh pr list; gh issue close 3");
expect('ask', "gh pr view 1 | gh pr comment");
expect('ask', "gh pr diff 1 || gh pr close 1");
expect('ask', "gh issue list ; gh issue close 9");
expect('ask', "gh auth status && gh pr merge 42");
expect('ask', "npm test && gh pr create");
expect('ask', "echo oi | gh pr comment 42 --body-file -");
expect('ask', "X=$(gh pr create --fill)");
expect('ask', "echo `gh pr review 1 --approve`");
expect('ask', "gh api repos/o/r/issues && gh api -X POST repos/o/r/issues");
expect('ask', "gh api repos/o/r/issues && gh api repos/o/r/issues -f title=x");

// --- entrada degenerada: nada a decidir ---------------------------------------
expectRaw('libera', "", "stdin vazio");
expectRaw('libera', "{}", "JSON sem tool_input");
expectRaw('libera', "{\"tool_input\":{}}", "tool_input sem command");
expectRaw('libera', "{\"tool_input\":{\"command\":\"\"}}", "command vazio");
expectRaw('libera', "isto nao e json", "stdin que nao e JSON");

// --- Windows: mesmo risco, outra grafia ---------------------------------------
// O sistema de arquivos não diferencia maiúscula, e o binário atende por gh.exe.
expect('ask', 'GH pr create --fill');
expect('ask', 'gh.exe pr create --fill');
expect('ask', 'C:\\tools\\gh.exe pr create --fill');
expect('libera', 'gh.exe pr view 1');
expect('ask', 'gh.exe api repos/o/r/issues -f title=x');
expect('ask', 'gh.exe auth token');

// Operador de chamada e laço do PowerShell: leitura vira pergunta, e isso é aceitável.
expect('ask', '& gh pr create --fill');
expect('ask', 'gh issue list | ForEach-Object { gh issue close $_ }');
expect('libera', 'gh pr list | Select-String open');

// Fim de linha do Windows em comando de várias linhas.
expect('ask', 'gh pr view 1\r\ngh pr create --fill');

// `&` sozinho separa comando no bash e no cmd, e aparece dentro de URL sem separar nada.
expect('ask', 'gh pr view 1 & gh pr create --fill');
expect('ask', 'gh pr view 1 &gh pr create --fill');
expect('libera', 'gh pr view 1 2>&1');
expect('libera', 'gh api "repos/o/r/issues?state=open&per_page=100"');
expect('ask', 'gh api "repos/o/r/issues?a=1&b=2" -f title=x');

// --- o motivo mostrado precisa ser verdadeiro ---------------------------------
// Quem confirma decide pelo texto: leitura de credencial descrita como escrita ensina a
// ignorar a pergunta. Em cadeia com as duas coisas, a escrita prevalece.
expectReason('lê material de credencial', 'gh api repos/o/r/actions/variables');
expectReason('lê material de credencial', 'gh auth token');
expectReason('escreve no GitHub', 'gh pr create --fill');
expectReason('escreve no GitHub', 'gh api -X POST repos/o/r/actions/variables');
expectReason('escreve no GitHub', 'gh api repos/o/r/hooks && gh pr create --fill');

console.log(`\n  ${pass} passou, ${fail} falhou`);
process.exitCode = fail === 0 ? 0 : 1;
