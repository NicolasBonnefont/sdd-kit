# sdd-kit

Ferramental de Spec-Driven Development.

Serve **qualquer projeto de qualquer time**, em qualquer linguagem. O ferramental não
conhece nenhum produto: todo fato — stack, comandos, fronteiras, convenções — vem do
`AGENTS.md` do próprio repositório, que o `/sdd-init` escreve.

Não depende de editor nem de modelo. O núcleo segue o padrão aberto
[Agent Skills](https://agentskills.io), então as mesmas skills funcionam no Claude Code,
Cursor, Antigravity, Copilot, Codex, Gemini CLI, Kiro, Junie e nos demais produtos que
implementam o padrão.

## O ciclo

| Comando | Frequência | O que faz |
|---|---|---|
| `/sdd-help` | quando esquecer | Mapa dos comandos: diz qual usar na sua situação |
| `/sdd-connect` | uma vez por máquina | Conecta ao GitHub via `gh` para ler cards |
| `/sdd-init` | uma vez por repositório | Inspeciona o projeto e escreve o `AGENTS.md` da raiz |
| `/sdd-pack` | por módulo | Escreve o Module Pack: invariantes, blast radius, armadilhas |
| `/sdd-spec <card>` | por card | Lê o card, **alinha por entrevista o que estiver vago**, escreve o change spec e manda os três revisores revisarem o spec antes do gate humano |
| `/sdd-execute` | por card | Decompõe em `tasks.md` e implementa em loop TDD |
| `/sdd-validate` | quando quiser | Confere spec ↔ tasks ↔ diff |
| `/sdd-review` | antes do push | Revisa sob três perspectivas, **cada uma na própria seção**. Aceita `--severo` e `--modelo <nome>` |
| `/sdd-pr` | por card | Monta a descrição do PR a partir dos artefatos e abre após autorização |
| `/sdd-close` | depois do merge | Devolve o aprendizado ao Module Pack e arquiva o spec |

Adoção de um time novo: `/sdd-connect` → `/sdd-init` → `/sdd-pack` no módulo de maior
movimento → e daí em diante o ciclo por card.

O `/sdd-close` é o que impede o `docs/specs/` de virar cemitério de deltas: change spec
descreve mudança, Module Pack descreve estado. Sem a ponte, depois de duzentos cards
ninguém sabe mais o que é verdade hoje.

Artefatos de um card, no repositório onde a mudança acontece:

```
docs/specs/<id-do-card>-<slug>/
├── spec.md        o delta: atual, alvo, invariantes, fora de escopo, escopo, verificação
├── tasks.md       decomposição com Consumes/Produces e rastreio a requisito
└── progress.md    ledger com evidência de execução e dívida aceita
```

## Instalação

Um comando. Ele detecta os harnesses que você já usa, pergunta onde instalar e resolve
o resto.

```bash
npx github:NicolasBonnefont/sdd-kit
```

Sem Node na máquina, a mesma coisa por `curl`:

```bash
curl -fsSL https://raw.githubusercontent.com/NicolasBonnefont/sdd-kit/main/bootstrap.sh | bash
```

As duas portas fazem o mesmo: garantem um clone em `~/sdd-kit` e chamam o instalador.
**Node não é dependência do ferramental** — só do atalho `npx`.

O clone em local fixo é obrigatório, não conveniência: as skills são instaladas por
symlink, e apontar para o diretório temporário do `npx` deixaria tudo quebrado na
primeira limpeza de cache. Como efeito colateral bom, `npx` de novo atualiza tudo.

Para automação e CI, o instalador aceita argumentos e não pergunta nada:

```bash
~/sdd-kit/install.sh claude --global
~/sdd-kit/install.sh cursor /caminho/do/projeto
~/sdd-kit/install.sh --dir /caminho/de/skills
```

> Instalação por projeto cria symlinks com caminho absoluto, específicos da máquina.
> Não commite `.claude/skills/` no repositório — cada pessoa roda o instalador na dela.

Harnesses e destinos:

| Harness | Destino por projeto | Destino global |
|---|---|---|
| `claude` | `.claude/skills/` | `~/.claude/skills/` |
| `cursor` | `.cursor/skills/` | `~/.cursor/skills/` |
| `antigravity` | `.agents/skills/` | `~/.gemini/config/skills/` |
| `copilot` | `.github/skills/` | — |

Para qualquer outro harness compatível: `install.sh --dir <caminho-de-skills>`.

O instalador é idempotente e preserva configuração existente — rodar de novo não
duplica hook nem apaga o que já estava no `settings.json`.

### Preciso reinstalar depois de um `git pull`?

Na dúvida, pergunte ao próprio instalador:

```bash
~/sdd-kit/install.sh --check
```

As skills são instaladas por symlink, então **mudança de conteúdo vale na hora**, sem
reinstalar. O que exige reinstalação é mudança de estrutura: skill nova (falta o
symlink), hook novo (falta a entrada no `settings.json`) ou arquivo movido de lugar.
O `--check` diferencia os casos e diz o que fazer.

### O que o Claude Code ganha a mais

Rodando `install.sh claude`, além das skills são instalados:

- **Subagentes** em `.claude/agents/` — os três revisores rodam em paralelo, cada um no
  próprio contexto, em vez de sequencialmente no mesmo
- **Hooks** em `.claude/settings.json` — três: formatação automática após cada edição,
  bloqueio de edição fora do escopo declarado no change spec, e confirmação obrigatória
  antes de qualquer escrita no GitHub

Nos demais harnesses o ciclo funciona igual; só essas automações não existem, e a skill
`sdd-review` já sabe operar sem elas.

## Nada sai para fora sem você autorizar

O ciclo **lê** do GitHub por conta própria — issue, comentários, diff de PR. **Escrever
é outra história.** Abrir pull request, comentar, aprovar, fazer merge, criar ou fechar
issue são ações visíveis para o time inteiro, e nenhuma delas acontece por iniciativa do
agente.

A regra está escrita nas skills e enforçada pelo `gh-guard.sh`, que escala a
confirmação para você **mesmo que o comando esteja no allowlist de permissões** — é isso
que impede que a proteção se perca numa configuração distraída.

Por isso o `/sdd-connect` só sugere allowlist de comandos de leitura, e recusa
`Bash(gh:*)` mesmo se pedirem.

## Estrutura

```
skills/<nome>/SKILL.md       Portável — padrão Agent Skills, qualquer harness
skills/<nome>/scripts/       Verificações determinísticas invocadas pela skill
skills/<nome>/*-FORMAT.md    Gabaritos, carregados só quando a skill precisa deles
skills/<nome>/agents/        Adaptador por harness — hoje openai.yaml, para o Codex
agents/                      Portável — os três revisores como prompt. Claude Code os
                             carrega como subagentes; os demais leem como instrução
lib/lib.sh                   Portável — configuração, detecção de branch base e
                             resolução de spec. Usado por hooks E por skills
hooks/                       Claude Code apenas — o protocolo de hooks é dele
install.sh                   Instalador: interativo sem argumentos, direto com eles
bootstrap.sh                 Entrada por curl — clona e delega ao install.sh
bin/cli.js                   Entrada por npx — clona e delega ao install.sh
```

`lib/` não é opcional: o `sdd-validate` depende dele em qualquer harness. Só `hooks/`
é específico do Claude Code.

## Adaptação automática

O que muda de time para time e é resolvido sem configurar nada:

| Variação | Como é resolvida |
|---|---|
| Nome de branch | O spec é casado pelo nome do diretório. `915-auditoria`, `feat/ABC-123-tela` e `JIRA-456/ajuste` funcionam igual |
| Branch base | Detectada de `origin/HEAD`, com `main`/`master`/`develop` como fallback |
| Formatação | Detectada por linguagem: prettier, php-cs-fixer, pint, phpcbf, ruff, black, gofmt, rustfmt, rubocop, ktlint, sqlfluff |
| Ausência de testes | O ciclo declara isso em vez de fingir cobertura; `/sdd-execute` cai para caracterização ou verificação manual explícita |
| Modelo | Nenhum agente fixa modelo: todos herdam o da sessão. Alias de modelo é vocabulário de cada harness e muda com o tempo — quem quiser outro passa `--modelo` |

Quando a convenção do time fugir do padrão, um `.sdd.json` na raiz do repositório
sobrescreve. Todas as chaves são opcionais — não crie o arquivo se os padrões servem:

```json
{
  "specsDir": "docs/specs",
  "baseBranch": "main",
  "formatCommand": "make fmt"
}
```

## O que fica no repositório do projeto

Este repositório carrega **ferramenta**. O **conhecimento** mora junto do código:

| Artefato | Onde | Quem escreve |
|---|---|---|
| Constituição do repo | `AGENTS.md` na raiz | `/sdd-init` + revisão do time |
| Module Pack | `AGENTS.md` na pasta do módulo | `/sdd-pack` + revisão humana |
| Change spec | `docs/specs/<card>-<slug>/spec.md` | `/sdd-spec` + aprovação |
| Decomposição | `docs/specs/<card>-<slug>/tasks.md` | `/sdd-execute` + confirmação |
| Ledger de execução | `docs/specs/<card>-<slug>/progress.md` | `/sdd-execute` |
| Configuração, se necessária | `.sdd.json` na raiz | `/sdd-init` |

A separação vale nos dois sentidos:

- **Ferramenta atualiza para todos de uma vez.** `git pull` aqui e todo mundo recebe.
- **Este repositório não conhece o produto.** Nenhum caminho de arquivo, nenhum número
  de cobertura, nenhuma convenção específica vive aqui. Se um padrão do produto mudar,
  você atualiza o `AGENTS.md` do repositório que já está mexendo — o ferramental não
  se move.

Documentação em pasta paralela envelhece sem ninguém perceber; ao lado do código, ela
aparece no diff de todo PR que toca o módulo.

## Requisitos

**`jq`** — processador de JSON de linha de comando, obrigatório.

Os harnesses conversam com hooks por JSON: entregam o evento no stdin e leem a decisão
do stdout. O `jq` é quem extrai o caminho do arquivo do evento, monta a resposta de
bloqueio com escape correto, lê o `.sdd.json` e mescla os hooks no `settings.json` sem
sobrescrever a configuração que já existe. Fazer isso com `grep` e `sed` quebra no
primeiro caminho com espaço ou acento.

```bash
sudo apt install jq      # Debian, Ubuntu
sudo dnf install jq      # Fedora
brew install jq          # macOS
```

**`git`** e **`bash`** — já presentes em qualquer máquina de desenvolvimento.

## Contribuindo

```bash
bash tests/run.sh
```

É o que o CI roda: sintaxe, shellcheck, frontmatter contra a spec Agent Skills,
acoplamento com produto, referência a comando inexistente e as baterias dos hooks.
Mudança em hook exige caso novo na bateria.

**`gh`** — [GitHub CLI](https://cli.github.com/), instalado pelo `/sdd-connect`.
Necessário só para ler cards; o resto do ciclo funciona sem ele.
