# sdd-kit — contexto para agentes

Este repositório é o **ferramental** de SDD. Não contém código de produto: contém
instruções que orientam agentes a trabalhar nos repositórios de produto.

## As regras que governam tudo aqui

### 1. Ferramenta carrega método; produto carrega fato

Este repositório descreve **como olhar**. Os repositórios de produto descrevem **o que é
verdade**. A fronteira é rígida e não negociável.

| Pertence aqui | Pertence ao repositório de produto |
|---|---|
| "uma invariante boa cita arquivo e linha" | qual é a invariante |
| "confira os pontos de registro listados no pack" | quais são os pontos de registro |
| "compare contra o padrão parametrizado do projeto" | qual é o padrão parametrizado |
| "onde não há suíte, faça caracterização" | quais repositórios não têm suíte |
| formato de saída, calibragem de severidade | caminhos, comandos, números |

O teste: **se um padrão do produto mudar, este repositório precisa mudar junto?** Se
precisar, o fato está no lugar errado. Mova para o `AGENTS.md` da raiz do repositório
afetado ou para o Module Pack do módulo.

Não confunda isso com "seja genérico". Instrução vaga não muda o comportamento de agente
nenhum. Seja concreto sobre o método e delegue o fato à camada que é dona dele.

### 2. Nada sai para fora sem autorização explícita

Abrir pull request, comentar, aprovar, fazer merge, criar ou fechar issue são ações
visíveis para o time inteiro e irreversíveis na prática. **Nenhuma delas parte de
iniciativa do agente**, nem como passo óbvio seguinte de algo que acabou de terminar.

Enforçado por `hooks/gh-guard.js`, que devolve `ask` e força a confirmação mesmo
quando o comando está no allowlist de permissões. Ao mexer nele, lembre que a direção
do erro aqui é o **oposto** do scope-guard: na dúvida, pergunte.

Skill nova que toque no GitHub precisa repetir a regra no próprio texto. O hook é a
rede de segurança, não a instrução.

### 3. O que entra no contexto também tem fronteira

A regra 2 governa o que sai do agente para o mundo. Esta governa o que entra nele.

Todo material que o ciclo coleta — diff, arquivo de módulo, comentário de card — atravessa
um processador terceiro: o provedor do modelo. O ferramental roda em qualquer harness
compatível, e cada harness é um processador diferente, com termos e jurisdição próprios.
Isso faz da fronteira uma decisão do time, e não algo que o agente resolve na hora.

Fica fora do material coletado:

- arquivo de ambiente versionado — `.env` e variantes
- chave privada, certificado, keystore
- dump de banco e fixture com dado real de pessoa
- valor de variável de CI/CD e conteúdo de cofre

Encontrando qualquer um deles no que ia enviar, o agente **reporta o caminho e segue sem o
conteúdo**. Caminho é achado; conteúdo é vazamento. Arquivo de ambiente versionado, aliás,
é achado de segurança que merece relatório — citando o nome do arquivo e o nome da chave,
que bastam para agir, e deixando o valor fora.

A regra vale igual para material que vem do GitHub: `gh api` alcança endpoint que devolve
credencial, e o `gh-guard` escala a confirmação desses caminhos pelo mesmo motivo que
escala escrita.

Skill que colete material do repositório ou do GitHub repete essa fronteira no próprio
texto, como a regra 2 exige para escrita.

### 4. Portabilidade primeiro

`skills/` e `agents/` precisam funcionar em qualquer harness compatível com o padrão
[Agent Skills](https://agentskills.io). Só entra em `hooks/` o que é genuinamente
específico do Claude Code.

Controle de invocação é declarado **duas vezes**, porque cada harness tem o seu campo:
`disable-model-invocation: true` no frontmatter (Claude Code) e
`policy.allow_implicit_invocation: false` em `agents/openai.yaml` (Codex). Uma skill é
user-invoked nos dois ou em nenhum — a suíte reprova divergência.

**Sistema também é portabilidade.** O ciclo roda em Linux, macOS, Windows e WSL, no cmd e no
PowerShell tanto quanto no bash. Por isso script é Node, sem bash e sem `jq`, e skill manda
rodar `git`, `gh` e `node` em forma que vale em qualquer terminal. O que varia de sistema fica
concentrado em `lib/lib.js`. Shell sobra só no `bootstrap.sh` e no hook local de commit, que
não fazem parte do ciclo. A suíte roda em Windows no CI e reprova skill que volte a exigir
bash ou `jq`.

Antes de adicionar qualquer coisa, pergunte: isto funciona no Cursor e no Antigravity?
E no PowerShell?
Se não funciona, ou vai para `hooks/`, ou a skill precisa declarar um caminho alternativo
— como o `sdd-review` faz ao operar sem subagentes.

## Estrutura

```
skills/sdd-<nome>/SKILL.md   Frontmatter com name e description; corpo em Markdown
skills/<nome>/scripts/       Verificações determinísticas que a skill invoca
agents/<nome>.md             Prompt de revisor. Frontmatter no formato do Claude Code,
                             que os demais harnesses ignoram sem quebrar
skills/<nome>/*-FORMAT.md    Referência descarregada, alcançada por ponteiro
skills/<nome>/agents/        Adaptador por harness (openai.yaml para o Codex)
lib/lib.js                   Configuração, branch base, resolução de spec e o que varia
                             de sistema. Usado por hooks, skills e instalador
hooks/                       Os três scripts em Node. Claude Code apenas
install.js                   Instalador: interativo sem argumentos, direto com eles
bootstrap.sh / bin/cli.js    Portas de entrada (curl e npx) — só clonam e delegam
```

O nome do diretório da skill é o nome do comando: `skills/sdd-spec/` vira `/sdd-spec`.
O prefixo `sdd-` existe porque em harness sem namespace um comando chamado `spec`
colidiria com qualquer outra coisa.

## O ciclo que este ferramental implementa

```
/sdd-help     → o mapa, quando você não lembra qual comando usar
/sdd-connect  → uma vez por máquina
/sdd-init     → uma vez por repositório: AGENTS.md da raiz  (a constituição)
/sdd-pack     → Module Pack do módulo         (conhecimento, vive no produto)
/sdd-spec     → spec.md + revisão dos 3 revisores   ↓ gate humano
/sdd-execute  → tasks.md + implementação + progress.md
/sdd-validate → spec ↔ tasks ↔ diff
/sdd-review   → três revisores, um eixo por seção, sem rerank entre eles
/sdd-pr       → descrição montada dos artefatos    ↓ gate humano de publicação
/sdd-close    → aprendizado volta ao pack, spec arquivado   (antes do code review)
```

O `/sdd-close` existe porque change spec descreve **mudança**, não **estado**. Sem ele o
diretório de specs acumula deltas e ninguém consegue responder "o que é verdade hoje".
O estado consolidado é o Module Pack, e essa ponte precisa ser etapa executada — não
observação no fim de um arquivo.

`/sdd-init` é o que permite que qualquer time adote o ciclo sem alguém fazer onboarding
à mão. Se uma mudança aqui quebrar o `/sdd-init`, ela quebra a adoção.

Prefira verificação determinística a julgamento de modelo sempre que der. O
`sdd-validate` existe porque conferir se uma seção está preenchida não precisa de LLM.

**Verificação pertence ao lado barato da curva.** Os três revisores rodam duas vezes: no
`/sdd-spec`, sobre o spec, antes de existir código; e no `/sdd-review`, sobre o diff. A
primeira passada é a que mais rende — achado ali vira uma linha de texto, o mesmo achado
depois vira retrabalho. Por isso ela está **dentro** do `/sdd-spec` e não num comando
separado: comando separado é opcional, e opcional é o que se pula.

## Convenções de escrita

- **Português.** É o idioma de trabalho de quem mantém o ferramental.
- **Escreva no positivo.** Proibição nomeia o comportamento errado e o torna disponível
  ao modelo — "não pense num elefante" traz o elefante. Descreva o comportamento alvo, e
  o indesejado nem chega a ser dito. Delimitar continua importante: "spec para bugfix
  trivial custa mais do que economiza" delimita sem proibir. Guardrail duro que não tem
  como ser escrito no positivo pode ficar, e vem acompanhado do que fazer no lugar.
  A suíte mantém um orçamento de seis proibições imperativas no repositório inteiro.
- **Descarregue referência longa.** Gabarito, formato de saída e tabela de consulta saem
  do `SKILL.md` para um arquivo irmão (`SPEC-FORMAT.md`, `PACK-FORMAT.md`), alcançado por
  um ponteiro imperativo — "leia X e siga o gabarito". É a redação do ponteiro, e não o
  destino, que decide se o agente vai buscar.
- **Termine passo com critério de conclusão.** Condição checável de "está pronto", senão
  o agente encerra cedo achando que terminou.
- **Teto de tamanho.** Skill que passa de ~150 linhas provavelmente faz duas coisas.
  Quebre.
- Sem comentário explicando o óbvio. O "porquê" vai no commit.
- **Campo de frontmatter só se existir na spec.** `name`, `description`, `license`,
  `compatibility`, `metadata` e `allowed-tools` são da spec Agent Skills. Extensão de
  harness vive no adaptador correspondente em `agents/`, e não no frontmatter — foi assim
  que o controle de invocação deixou de valer só no Claude Code.
- **Nunca fixe modelo em agente.** Alias como `sonnet` ou `opus` é vocabulário de um
  harness só, e envelhece a cada modelo novo. O padrão é herdar da sessão; quem quiser
  outro passa argumento no comando. A suíte reprova `model:` em `agents/`.
  O `color:` fica: é extensão do Claude Code, mas puramente cosmética e ignorada em
  silêncio nos outros — não muda comportamento nem disponibilidade.

## Suíte

`node tests/run.js` — é o que o CI roda, em Linux e em Windows. Cobre sintaxe, shellcheck,
frontmatter das skills, acoplamento com produto, referência a comando inexistente e as
baterias de hook, do validador e do instalador.

Mudança em hook sem caso novo na bateria correspondente não entra. O bypass de cadeia do
`gh-guard` existiu justamente porque a bateria vivia em prosa neste arquivo em vez de
num script executável.

## Ao mexer nos hooks

São três, e **não têm a mesma direção de falha**. Confundir as duas é o erro mais fácil
de cometer aqui:

| Hook | Reage a | Na dúvida |
|---|---|---|
| `scope-guard.js` | edição de arquivo | **libera** — hook que trava trabalho legítimo é desinstalado na primeira semana |
| `format.js` | edição de arquivo | **libera**, sempre em silêncio |
| `gh-guard.js` | comando de shell (Bash e PowerShell) | **pergunta** — o custo de um comentário indevido num PR é maior que o de uma confirmação a mais |

O `scope-guard` reage a `Write|Edit`, **não a `Bash`**. Um `sed -i` ou `>` contorna. Isso é
consciente: cercar toda escrita de arquivo via shell geraria falso positivo demais. O hook
é rede, não cerca — não construa nada em cima dele presumindo que é impossível burlar.

Teste estes casos antes de commitar, alimentando JSON pelo stdin:

```bash
echo '{"tool_input":{"file_path":"/repo/src/x.ts"}}' | node hooks/scope-guard.js
```

- arquivo dentro do escopo → sem saída, exit 0
- arquivo fora do escopo → JSON com `permissionDecision: "deny"`
- spec ou Module Pack (`AGENTS.md`) fora do escopo → sem saída: são artefatos do ciclo
- arquivo novo em diretório que ainda não existe → resolve a raiz subindo pelo caminho
  do próprio arquivo, nunca pelo cwd da sessão (que pode estar em outro repositório)
- arquivo de outro repositório → sem saída, exit 0
- caminho do Windows (`C:\repo\x.ts`), com espaço ou acento → mesma decisão do Linux
- spec ausente, branch sem correspondência, input vazio → sem saída, exit 0

Para o `gh-guard.js` a bateria é outra, e a direção do erro se inverte:

```bash
echo '{"tool_input":{"command":"gh pr create --fill"}}' | node hooks/gh-guard.js
```

- leitura (`view`, `list`, `diff`, `checks`, `status`, `checkout`, `auth status`, `api`
  sem método de escrita, sem campo e sem corpo) → sem saída
- escrita (`pr create|comment|review|merge|close`, `issue create|comment|close`,
  `release create`, `repo create|delete`, `api -X POST|PUT|PATCH|DELETE`, e `api` com
  `-f`/`-F`/`--field`/`--raw-field`/`--input`, porque campo ou corpo presente vira POST
  implícito — inclusive com o valor colado na flag) → `ask`
- leitura de credencial (`variable list|get`, `auth token`, `auth status --show-token`,
  `api` em `variables`, `secrets`, `secret-scanning`, `keys`, `hooks`) → `ask`, pela regra 3
- comando encadeado ou em pipe que contenha escrita ou credencial em qualquer posição → `ask`
- grafia do Windows (`gh.exe`, `GH`, `& gh`, `&` como separador) → mesma decisão
- comando sem `gh` → sem saída

Lembre que **só exit 2 ou JSON de `deny` bloqueiam**; exit 1 é tratado como erro
não-bloqueador e a ação prossegue. `ask` não bloqueia: escala para a pessoa decidir,
que é exatamente o comportamento desejado para ação visível ao time.
