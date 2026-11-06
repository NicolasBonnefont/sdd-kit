# A guarda de escrita no GitHub

O ciclo **lê** do GitHub por conta própria — issue, comentários, diff de PR. **Escrever
é outra história.** Abrir pull request, comentar, aprovar, fazer merge, criar ou fechar
issue são ações visíveis para o time inteiro, e nenhuma delas acontece por iniciativa do
agente.

A regra está escrita nas skills e enforçada pelo `hooks/gh-guard.js`, que escala a
confirmação para você **mesmo que o comando esteja no allowlist de permissões** — é isso
que impede que a proteção se perca numa configuração distraída.

Por isso o `/sdd-connect` só sugere allowlist de comandos de leitura, e recusa
`Bash(gh:*)` mesmo se pedirem.

## Segredo é leitura, e também escala

O guard nasceu tratando escrita como o risco e leitura como rotina. Uma parte da leitura
não é rotina: valor de variável de Actions, alerta de secret scanning e token vêm em claro,
e quem tem permissão de administrador alcançava tudo isso sem nenhuma confirmação —
inclusive por dentro de um allowlist que só listava leitura.

Escalam a confirmação, junto com a escrita:

- `gh variable list`, `gh variable get`, `gh auth token` e `gh auth status --show-token`
- `gh api` em caminho de `variables`, `secrets`, `secret-scanning`, `keys` ou `hooks`

A restrição é nominal a esses caminhos: `gh api repos/o/r/actions/runs` e o resto da
leitura comum continuam passando direto, e `gh secret list` também, porque só devolve
nomes. Isso atende a regra 3 do `AGENTS.md` — material de credencial fica fora do que o
agente carrega — pelo lado do que vem do GitHub.

O hook é específico do Claude Code, porque o protocolo de hooks é dele. Nos demais
harnesses a regra continua valendo pelas skills — o que muda é que a confirmação não
é forçada pelo harness.

## Bash e PowerShell

No Windows, o Claude Code tem uma ferramenta PowerShell separada da Bash, e o hook é
registrado para as duas. A avaliação também cobre o que muda por lá: `gh.exe`, maiúsculas
(`GH pr create` executa o mesmo binário), operador de chamada (`& gh ...`) e `&` como
separador de comando.

A bateria de testes do hook vive em `tests/gh-guard.test.js`. Mudança no hook exige caso
novo na bateria.
