---
name: sdd-help
description: Mostra qual comando do ciclo SDD usar na sua situação. Um mapa dos comandos sdd-*.
compatibility: Nenhum requisito
disable-model-invocation: true
---

# /sdd-help

Você tem dez comandos e ninguém decora dez comandos. Este mapeia todos e diz quando
alcançar cada um.

Se o usuário descreveu uma situação, responda com **o comando certo e o porquê**, e pare.
Sem situação descrita, mostre o mapa e pergunte em que ponto ele está.

## Uma vez, e esquece

| Comando | Quando |
|---|---|
| `/sdd-connect` | Primeira vez nesta máquina. Conecta ao GitHub para ler cards |
| `/sdd-init` | Primeira vez neste repositório. Escreve o `AGENTS.md` da raiz, que é de onde todo o resto tira os fatos do projeto |

Sem o `/sdd-init`, os revisores trabalham sem conhecer o projeto e o ciclo rende pouco.
É o primeiro passo de qualquer time novo.

## O ciclo de um card

```
/sdd-spec → gate humano → /sdd-execute → /sdd-review → /sdd-pr → /sdd-close → code review → merge
```

| Comando | Quando |
|---|---|
| `/sdd-spec <card>` | Tem um card para fazer. Lê a issue, alinha o que estiver vago, escreve o delta e manda os três revisores revisarem o spec antes de você aprovar |
| `/sdd-execute` | Spec aprovado. Decompõe em tasks e implementa em loop TDD, com evidência |
| `/sdd-review` | Antes do push. Três perspectivas sobre o diff, em eixos separados |
| `/sdd-pr` | Pronto para abrir. Monta a descrição a partir dos artefatos e espera sua autorização |
| `/sdd-close` | Ao finalizar a entrega, antes do code review. Devolve o aprendizado ao Module Pack e arquiva o spec |

## Conhecimento do módulo

| Comando | Quando |
|---|---|
| `/sdd-pack` | Vai mexer num módulo que ainda não tem `AGENTS.md`, ou o pack existente está desatualizado |

O Module Pack é o que transforma revisor genérico em revisor que conhece o domínio.
Rodar `/sdd-pack` no módulo de maior movimento é o melhor primeiro investimento depois do
`/sdd-init` — e o `/sdd-close` mantém o pack vivo daí em diante, sem esforço de documentação
separado.

## Verificação

| Comando | Quando |
|---|---|
| `/sdd-validate` | A qualquer momento. Confere spec ↔ tasks ↔ diff: seções preenchidas, task rastreando requisito, arquivo do diff dentro do escopo |

Vale rodar em três pontos: depois de escrever o spec, depois de implementar, e antes de
abrir o PR.

## Situações comuns

| Situação | Comando |
|---|---|
| "Peguei um card e vou começar" | `/sdd-spec <id>` |
| "O card está vago demais" | `/sdd-spec` mesmo — ele alinha por entrevista antes de escrever |
| "É só um typo / bump de dependência" | Nenhum. O `/sdd-spec` dispensaria o spec; vá direto ao código |
| "Terminei, quero revisar antes do push" | `/sdd-review` |
| "Quero uma revisão mais dura" | `/sdd-review --severo` |
| "Quero revisar gastando menos" | `/sdd-review --modelo <nome>` |
| "Mexi num módulo e aprendi coisas que não estavam documentadas" | `/sdd-close` |
| "Entrei agora no time" | `/sdd-connect`, depois `/sdd-init` se o repositório ainda não tem `AGENTS.md` |
| "Instalei mas os comandos sumiram" | `npx github:NicolasBonnefont/sdd-kit --check` no terminal |

## Fora do ciclo

Os três revisores — `revisor-regressao`, `seguranca` e `qualidade` — são alcançados pelo
`/sdd-spec` e pelo `/sdd-review`, e também podem ser chamados diretamente quando você quer
só uma das perspectivas.

## Manutenção

Este mapa é mantido à mão. Comando novo, renomeado ou removido entra aqui no mesmo commit
— router desatualizado é pior que router nenhum, porque manda a pessoa para um comando que
não existe mais. A suíte confere que todo comando tem entrada aqui.
