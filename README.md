# sdd-kit

Ferramental de Spec-Driven Development para agentes de código.

Serve **qualquer projeto de qualquer time**, em qualquer linguagem. O ferramental não
conhece nenhum produto: todo fato — stack, comandos, fronteiras, convenções — vem do
`AGENTS.md` do próprio repositório, que o `/sdd-init` escreve.

Não depende de editor nem de modelo. O núcleo segue o padrão aberto
[Agent Skills](https://agentskills.io), então as mesmas skills funcionam no Claude Code,
Cursor, Antigravity, Copilot, Codex, Gemini CLI, Kiro, Junie e nos demais produtos que
implementam o padrão.

## Instalação

> [!WARNING]
> Requer **`jq`**. Os harnesses conversam com hooks por JSON, e é o `jq` que extrai o
> evento, monta a resposta de bloqueio com escape correto e mescla configuração sem
> sobrescrever o que já existe.
>
> ```bash
> sudo apt install jq      # Debian, Ubuntu
> sudo dnf install jq      # Fedora
> brew install jq          # macOS
> ```

Um comando. Ele detecta os harnesses que você já usa, pergunta onde instalar e resolve
o resto.

```bash
npx github:NicolasBonnefont/sdd-kit
```

Sem Node na máquina, a mesma coisa por `curl`:

```bash
curl -fsSL https://raw.githubusercontent.com/NicolasBonnefont/sdd-kit/main/bootstrap.sh | bash
```

As duas portas garantem um clone em `~/sdd-kit` e chamam o instalador. **Node não é
dependência do ferramental** — só do atalho `npx`.

## O ciclo

| Comando | Frequência | O que faz |
|---|---|---|
| `/sdd-help` | quando esquecer | Mapa dos comandos: diz qual usar na sua situação |
| `/sdd-connect` | uma vez por máquina | Conecta ao GitHub via `gh` para ler cards |
| `/sdd-init` | uma vez por repositório | Inspeciona o projeto e escreve o `AGENTS.md` da raiz |
| `/sdd-pack` | por módulo | Escreve o Module Pack: invariantes, blast radius, armadilhas |
| `/sdd-spec <card>` | por card | Lê o card, alinha por entrevista o que estiver vago, escreve o change spec e manda os três revisores revisarem antes do gate humano |
| `/sdd-execute` | por card | Decompõe em `tasks.md` e implementa em loop TDD |
| `/sdd-validate` | quando quiser | Confere spec ↔ tasks ↔ diff |
| `/sdd-review` | antes do push | Revisa sob três perspectivas, cada uma na própria seção |
| `/sdd-pr` | por card | Monta a descrição do PR a partir dos artefatos e abre após autorização |
| `/sdd-close` | depois do merge | Devolve o aprendizado ao Module Pack e arquiva o spec |

Time novo: `/sdd-connect` → `/sdd-init` → `/sdd-pack` no módulo de maior movimento → e
daí em diante o ciclo por card.

## Nada sai para fora sem você autorizar

O ciclo **lê** do GitHub por conta própria — issue, comentários, diff de PR. **Escrever
é outra história.** Abrir pull request, comentar, aprovar, fazer merge, criar ou fechar
issue são ações visíveis para o time inteiro, e nenhuma delas acontece por iniciativa do
agente.

A regra está escrita nas skills e enforçada pelo `gh-guard.sh`, que escala a confirmação
para você **mesmo que o comando esteja no allowlist de permissões**.

## Documentação

Sem site de docs por enquanto — tudo vive em [docs/](./docs).

- [Instalação, argumentos e reinstalação](./docs/instalacao.md)
- [Harnesses suportados e o que cada um ganha](./docs/harnesses.md)
- [O ciclo por card e seus artefatos](./docs/ciclo.md)
- [Configuração e adaptação automática](./docs/configuracao.md)
- [A guarda de escrita no GitHub](./docs/guarda-gh.md)
- [Convenção de commits](./docs/commits.md)

## Contribuindo

```bash
bash tests/run.sh
```

É o que o CI roda: sintaxe, shellcheck, frontmatter contra a spec Agent Skills,
acoplamento com produto, referência a comando inexistente e as baterias dos hooks.
Mudança em hook exige caso novo na bateria.

Commits seguem [Conventional Commits](https://www.conventionalcommits.org), com no
máximo 100 caracteres na primeira linha. Para validar antes de commitar:

```bash
npm install
git config core.hooksPath .githooks
```

Detalhes e lista de tipos em [docs/commits.md](./docs/commits.md).

Mexendo no ferramental? Comece por [docs/estrutura.md](./docs/estrutura.md).
