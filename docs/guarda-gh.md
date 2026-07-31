# A guarda de escrita no GitHub

O ciclo **lê** do GitHub por conta própria — issue, comentários, diff de PR. **Escrever
é outra história.** Abrir pull request, comentar, aprovar, fazer merge, criar ou fechar
issue são ações visíveis para o time inteiro, e nenhuma delas acontece por iniciativa do
agente.

A regra está escrita nas skills e enforçada pelo `hooks/gh-guard.sh`, que escala a
confirmação para você **mesmo que o comando esteja no allowlist de permissões** — é isso
que impede que a proteção se perca numa configuração distraída.

Por isso o `/sdd-connect` só sugere allowlist de comandos de leitura, e recusa
`Bash(gh:*)` mesmo se pedirem.

A bateria de testes do hook vive em `tests/gh-guard.test.sh`. Mudança no hook exige caso
novo na bateria.
