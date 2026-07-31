# O ciclo por card

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

## Por que o `/sdd-close` importa

É o que impede o `docs/specs/` de virar cemitério de deltas: change spec descreve
mudança, Module Pack descreve estado. Sem a ponte, depois de duzentos cards ninguém sabe
mais o que é verdade hoje.

## Artefatos de um card

No repositório onde a mudança acontece:

```
docs/specs/<id-do-card>-<slug>/
├── spec.md        o delta: atual, alvo, invariantes, fora de escopo, escopo, verificação
├── tasks.md       decomposição com Consumes/Produces e rastreio a requisito
└── progress.md    ledger com evidência de execução e dívida aceita
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
