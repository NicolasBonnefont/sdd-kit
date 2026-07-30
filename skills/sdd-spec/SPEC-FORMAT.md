# Gabarito do change spec

Referência descarregada de [`SKILL.md`](SKILL.md). O spec descreve **só o delta** da
mudança.

Caminho: `<specsDir>/<id-do-card>-<slug>/spec.md`. O `specsDir` padrão é `docs/specs`,
e o projeto pode declarar outro em `.sdd.json` na raiz — confira antes de criar.

```markdown
# <id> — <título do card>

**Card:** <url da issue>
**Módulo:** <caminho>
**Status:** rascunho

## Comportamento atual
O que o sistema faz hoje, ancorado em arquivo:linha.

## Comportamento alvo
O delta. Só o que muda.

## Invariantes
O que permanece verdadeiro depois da mudança. Derivado do Module Pack e dos
consumidores do módulo. Cada item ancorado em código.

## Fora de escopo
O que alguém poderia razoavelmente supor que entra, e fica de fora.
Esta seção é o que mantém a mudança do tamanho que foi combinado.

## Arquivos no escopo
- caminho/exato/do/arquivo.ts
- outro/caminho/**

## Critério de verificação
Como se prova que funcionou e que o resto continua funcionando.
Comandos concretos.
```

## Notas de preenchimento

**Arquivos no escopo** é lido pelo hook que confina a edição. Liste caminhos ou globs
reais — escopo específico é o que faz o hook proteger de verdade.

**Invariantes** é a seção `POSSÍVEIS IMPACTOS` do template de PR escrita antes em vez de
depois. Vale dizer isso a quem reclamar do custo: é o mesmo trabalho em outra ordem, e
agora guia a implementação em vez de só justificá-la no review.

**Comportamento atual** reflete o que o código faz hoje, verificado na leitura — não o
que a issue supõe que ele faz. Divergência entre os dois é o achado mais valioso da
etapa; registre.

## Sobre caminhos de arquivo aqui

Este gabarito pede caminhos e âncoras `arquivo:linha`, ao contrário de specs que vivem
num issue tracker e envelhecem soltos. Aqui isso se sustenta porque o spec mora no mesmo
repositório e no mesmo commit que o código, o `/sdd-validate` confere se a âncora ainda
resolve, e o `/sdd-close` arquiva o spec quando o ciclo fecha.

Se algum desses três deixar de existir, a âncora vira dívida — e aí a regra correta
passa a ser a oposta.
