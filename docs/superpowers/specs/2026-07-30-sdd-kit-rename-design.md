# `licitar-agents` → `sdd-kit`

Data: 2026-07-30

## Contexto

O ferramental de Spec-Driven Development nasceu dentro de uma empresa que usa GitLab, e
carrega o nome dela em três camadas: a marca (`licitar-agents`, `@licitar/agents`), o
prefixo dos comandos (`ld-`, de Licitar Digital) e o acoplamento ao `glab`.

O conteúdo — as 10 skills, os 3 revisores, os gabaritos de formato — é o ativo. Ele já é
genérico por construção: a Regra 1 do `AGENTS.md` proíbe fato de produto no ferramental,
e o README já promete servir "qualquer projeto de qualquer time, em qualquer linguagem".
O que sobrou de específico é a casca.

Este spec descreve a troca da casca.

## Decisões

| Decisão | Escolha | Porquê |
|---|---|---|
| Relação com o repo de origem | Caminhos independentes | O repo da empresa segue a vida dele. Nada é importado arquivo a arquivo daqui pra frente, então rename profundo não gera atrito de sincronização |
| Nome | `sdd-kit` | Diz ferramental sem prometer framework |
| Prefixo dos comandos | `sdd-` | `/sdd-spec` é autoexplicativo. O prefixo existe porque em harness sem namespace um comando chamado `spec` colidiria |
| Forge | Só GitHub (`gh`) | É o que o autor usa. Suporte a GitLab que ninguém exercita apodrece e dobra a superfície do guard |
| Idioma | Português | Traduzir reescreveria ~200KB de prompt calibrado — exatamente o ativo que a migração existe pra preservar |
| Domínio | Nenhum | Zero referência a licitação. O ferramental atende qualquer sistema em qualquer linguagem |

## Estado atual

```
licitar-agents/
├── .gitlab-ci.yml           CI do GitLab
├── AGENTS.md                constituição do ferramental
├── README.md
├── agents/                  3 revisores — prompt puro, sem citar comando nem forge
├── bin/cli.js               entrada npx
├── bootstrap.sh             entrada curl
├── install.sh               instalador por symlink
├── lib/lib.sh               ld_config, ld_specs_dir, ld_base_branch,
│                            ld_find_spec, ld_scope_patterns
├── hooks/                   format.sh, scope-guard.sh, glab-guard.sh
├── skills/ld-{help,connect,init,pack,spec,execute,validate,review,mr,close}/
└── tests/                   run.sh, scope-guard.test.sh, glab-guard.test.sh
```

O diretório **não é um repositório git**.

## Estado alvo

```
sdd-kit/
├── .github/workflows/tests.yml
├── AGENTS.md
├── README.md
├── agents/                  inalterado
├── bin/cli.js
├── bootstrap.sh
├── install.sh
├── lib/lib.sh               sdd_config, sdd_specs_dir, sdd_base_branch,
│                            sdd_find_spec, sdd_scope_patterns
├── hooks/                   format.sh, scope-guard.sh, gh-guard.sh
├── skills/sdd-{help,connect,init,pack,spec,execute,validate,review,pr,close}/
└── tests/                   run.sh, scope-guard.test.sh, gh-guard.test.sh
```

Repositório git com branch `main`, remote `github.com/NicolasBonnefont/sdd-kit`.

## Mapa de rename

### Identidade

| De | Para |
|---|---|
| `~/Projetos/licitar-agents/` | `~/Projetos/sdd-kit/` |
| `@licitar/agents` | `sdd-kit` |
| bin `licitar-agents` | `sdd-kit` |
| `LICITAR_AGENTS_REPO` | `SDD_KIT_REPO` |
| `LICITAR_AGENTS_HOME` | `SDD_KIT_HOME` |
| `~/licitar-agents` (clone fixo) | `~/sdd-kit` |
| `git@gitlab.com:licitar/licitar-agents.git` | `git@github.com:NicolasBonnefont/sdd-kit.git` |
| `gitlab.com/licitar/licitar-agents/-/raw/main/bootstrap.sh` | `raw.githubusercontent.com/NicolasBonnefont/sdd-kit/main/bootstrap.sh` |
| `npx gitlab:licitar/licitar-agents` | `npx github:NicolasBonnefont/sdd-kit` |
| `.ld.json` | `.sdd.json` |

### Comandos

`ld-help` `ld-connect` `ld-init` `ld-pack` `ld-spec` `ld-execute` `ld-validate`
`ld-review` `ld-close` recebem o prefixo `sdd-`. **`ld-mr` vira `sdd-pr`**.

Para cada skill mudam o nome do diretório, o `name:` do frontmatter e toda referência
cruzada no corpo. Método, gabaritos e calibragem de severidade não se movem.

### Funções de `lib/lib.sh`

`ld_config` `ld_specs_dir` `ld_base_branch` `ld_find_spec` `ld_scope_patterns` → `sdd_*`.

Chamadores: `hooks/format.sh`, `hooks/scope-guard.sh`,
`skills/sdd-validate/scripts/validate.sh`.

## GitLab → GitHub

O desenho de segurança se mantém inteiro; só o vocabulário muda.

### `hooks/glab-guard.sh` → `hooks/gh-guard.sh`

Devolve `ask` para escrita, mesmo quando o comando está no allowlist de permissões — é
isso que impede a proteção de se perder numa configuração distraída. A direção de falha
continua invertida em relação ao `scope-guard`: **na dúvida, pergunta**.

Reconhecido como escrita:

- `gh pr create|comment|review|merge|close|ready|edit`
- `gh issue create|comment|close|edit|reopen`
- `gh release create|delete|edit`
- `gh repo create|delete|edit`
- `gh api` com `-X POST|PUT|PATCH|DELETE` ou `--method` equivalente

Passa em silêncio: `view`, `list`, `diff`, `status`, `checks`, `auth status`, e `gh api`
sem método de escrita.

Comando encadeado ou em pipe que contenha escrita em qualquer posição também devolve
`ask` — o bypass de cadeia é o bug que a bateria existe pra travar.

### Skills

| Skill | Mudança |
|---|---|
| `sdd-connect` | Conecta por `gh auth status` / `gh auth login`. Sugere allowlist só de leitura e recusa `Bash(gh:*)` mesmo se pedirem |
| `sdd-pr` | Monta a descrição a partir dos artefatos do card e abre com `gh pr create` **após autorização explícita** |
| `sdd-spec`, `sdd-review`, `sdd-help` | Vocabulário: *merge request* → *pull request*. *Issue* continua *issue* |

O adaptador `skills/sdd-pr/agents/openai.yaml` acompanha: `display_name` passa de
`"Merge Request"` para `"Pull Request"` e o `short_description` para
`"Monta a descricao do PR"`.

### `install.sh`

A chave do hook no `settings.json` passa de `glab` para `gh`, apontando para
`hooks/gh-guard.sh`.

## Zero referência a licitação

`README.md` e `AGENTS.md` perdem "Licitar Digital" e "licitação pública". O README já
descrevia o ferramental como agnóstico de produto — isso passa a ser a identidade única.

Uma regra do `AGENTS.md` precisa de justificativa nova, porque a atual morre junto com o
domínio:

> **Português.** ~~Time brasileiro, domínio de licitação pública em português.~~
> É o idioma de trabalho de quem mantém o ferramental.

## Teste de acoplamento com produto

`tests/run.sh` hoje reprova a presença de `manager-back`, `manager-front`,
`licitar-docker`, `dispute-back`, `dispute-front` e `php/.claude` dentro de `skills/` e
`agents/`. Sem esses repositórios, a lista fica vazia e o teste vira teatro.

O alvo muda, o propósito fica. O teste passa a reprovar:

1. **Caminho absoluto de máquina** — `/home/`, `/Users/`, `C:\` em `skills/` ou `agents/`.
   É a forma genérica de "fato de um ambiente específico vazou pro ferramental".
2. **Token residual da migração** — `licitar`, `ld-`, `glab`, `gitlab` no repositório,
   excluindo `docs/superpowers/specs/`, onde este spec cita os nomes antigos por
   definição.

O segundo item dá ao teste uma função extra: trava de regressão permanente do rename.

O padrão de `ld-` exige fronteira à esquerda — `(^|[^a-z])ld-` — senão `build-` casa e o
teste reprova texto legítimo.

## Limpeza da instalação existente

O `~/.claude/` desta máquina já tem symlinks `ld-*` e hooks apontando para o caminho
antigo. Duas mudanças no `install.sh` fazem a reinstalação limpar sozinha:

1. **Detecção de diretório de instalação** casa `^(sdd|ld)-` em vez de só `^ld-`, senão
   um diretório que só tem skills antigas é ignorado e nunca reportado.
2. **Filtro de dedupe dos hooks** casa `scope-guard|glab-guard|gh-guard`, para que a
   entrada antiga do `glab-guard` seja removida do `settings.json` em vez de ficar órfã
   apontando para um arquivo que não existe mais.

O `--check` reporta symlink `ld-*` remanescente como obsoleto.

## Git e CI

O diretório vira repositório git com branch `main`. O primeiro commit registra o estado
atual **antes** do rename — é o que dá um diff revisável da migração inteira.

`.gitlab-ci.yml` sai. Entra `.github/workflows/tests.yml`:

- `runs-on: ubuntu-latest` — já traz `bash`, `git`, `jq` e `shellcheck`
- roda `bash tests/run.sh`
- dispara em push na `main` e em pull request

Criar o repositório no GitHub e dar push são ações para fora e ficam sob decisão do
autor. Nota operacional: o `gh` desta máquina está autenticado como `jeasbonnefont`,
então o remote `NicolasBonnefont/sdd-kit` exige credencial dessa conta ou um
`gh auth switch`.

## Fora de escopo

- **`agents/qualidade.md`, `agents/revisor-regressao.md`, `agents/seguranca.md`** —
  verificado: não citam nome de comando nem forge. Ficam byte por byte.
- **Método, gabaritos e severidade das skills** — o corpo dos `SKILL.md` muda apenas onde
  o texto cita nome de comando, `.ld.json` ou vocabulário de GitLab.
- **Tradução para inglês.**
- **Suporte a GitLab.**
- **Publicação no npm** — a distribuição é por `npx github:` e `curl`, que funcionam sem
  pacote publicado.
- **Criar o repositório no GitHub e dar push.**

## Verificação

1. `bash tests/run.sh` passa.
2. `grep -riE 'licitar|(^|[^a-z])ld-|glab|gitlab' .` não retorna nada fora de
   `docs/superpowers/specs/`.
3. `./install.sh claude --global` instala as 10 skills `sdd-*` e registra
   `scope-guard`, `gh-guard` e `format` no `settings.json`.
4. `./install.sh --check` reporta tudo em dia, sem `ld-*` órfão e sem hook apontando
   para arquivo inexistente.
5. `bash tests/gh-guard.test.sh` cobre cada verbo de escrita, cada verbo de leitura e o
   bypass por encadeamento.
6. Em sessão nova do Claude Code: `/sdd-help` responde e `/sdd-init` roda num projeto de
   teste.

## Riscos

| Risco | Mitigação |
|---|---|
| O `gh-guard` deixa passar um verbo de escrita que o `glab-guard` pegava | A bateria de testes enumera os verbos um a um; `gh` e `glab` têm superfícies diferentes, então a tradução é caso a caso e não regex adaptada |
| Referência cruzada entre skills quebra silenciosamente | `tests/run.sh` já valida que todo `/sdd-<algo>` citado corresponde a um diretório existente |
| Instalação antiga fica meio migrada | Item "Limpeza da instalação existente" acima, verificado pelo passo 4 |
