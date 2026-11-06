---
name: sdd-execute
description: Decompõe o change spec em tasks com contrato de interface e implementa cada uma em loop TDD, com evidência real e ledger de progresso.
compatibility: Requer git e as ferramentas de teste do projeto
disable-model-invocation: true
---

# /sdd-execute

Implementa o change spec. O que separa isto de pedir a feature no chat é **decomposição com contrato** e **evidência de teste colada do terminal**.

Antes de começar, leia o `spec.md` do card, o `AGENTS.md` do módulo e o `AGENTS.md` da raiz do repositório. Sem spec aprovado, mande rodar `/sdd-spec` e pare.

## Passo 0 — explicite suas premissas

Antes de escrever qualquer código, diga em voz alta o que você está assumindo e que o spec não resolve. Se houver mais de uma leitura possível de um requisito, **apresente as duas** em vez de escolher em silêncio. Havendo dúvida, pare e pergunte antes de escrever.

Se você enxerga um caminho mais simples que o descrito no spec, diga antes de implementar o caminho descrito.

## Passo 1 — decompor em tasks

**Leia [`TASKS-FORMAT.md`](TASKS-FORMAT.md) e siga o gabarito** do `tasks.md` e do
`progress.md`. Ele traz os cinco campos por task e o critério que fecha a decomposição.

Mostre o `tasks.md` e **confirme antes de implementar**. Este é o segundo gate humano do ciclo.

## Passo 2 — loop TDD por task

Onde existe suíte de testes, os quatro passos, sem pular nenhum:

1. **RED** — escreva o teste que falha. Rode. **Cole a saída de erro real.**
2. **GREEN** — implementação mínima que faz passar. Nada além.
3. **Rode de novo.** Cole o PASS real.
4. **Suíte inteira.** Cole o resultado.

> Evidência é saída de terminal colada. "Os testes passaram" escrito por você é afirmação, não evidência. Declare o que você rodou e o que deixou de rodar.

Os comandos de teste de cada repositório estão no `AGENTS.md` da raiz dele — use os de lá.

### Onde não há suíte de testes

Nem todo repositório tem rede de segurança, e o `AGENTS.md` da raiz declara qual é a situação. Onde falta, **declare a falta**.

O substituto é **caracterização**: antes de mudar, escreva um teste que fixa o comportamento **atual**, mesmo que o comportamento atual seja feio. Ele falha depois da sua mudança e você decide conscientemente se a quebra era desejada.

Quando nem isso for viável, diga que a verificação será manual e liste exatamente o que precisa ser testado à mão.

A afirmação "sem regressão" exige verificação que a sustente.

## Passo 3 — mantenha-se cirúrgico

- Mantenha a edição dentro da seção **Arquivos no escopo** do spec. Precisando de mais, pare e peça atualização do spec — expansão silenciosa de escopo é a origem mais comum de regressão
- Deixe código adjacente, comentário e formatação como estão quando a tarefa não os pediu
- Remova os órfãos que **a sua mudança** criou: import, variável, função que ficaram sem uso. Código morto preexistente fica onde está, mencionado numa linha
- Siga o padrão canônico apontado no Module Pack. Consistência com o código ao redor vence perfeição teórica
- Toda linha alterada deve rastrear até o pedido

O "porquê" vai no commit e no spec.

## Passo 4 — ledger

Atualize o `progress.md` a cada task concluída e marque o checkbox correspondente em
`tasks.md`. O formato das duas linhas está em [`TASKS-FORMAT.md`](TASKS-FORMAT.md).

## Ao terminar

Resumo curto: quantas tasks, estado da suíte antes e depois, o que ficou como `Minor`. Depois sugira `/sdd-review`.

Havendo task incompleta ou teste falhando, **abra com isso**, antes do resumo. É a transparência aqui que sustenta a confiança no método inteiro.
