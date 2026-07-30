---
name: sdd-close
description: Fecha um card depois do merge — incorpora ao Module Pack o que a mudança ensinou e arquiva o change spec, para que os deltas virem estado consolidado.
compatibility: Requer git e bash
disable-model-invocation: true
---

# /sdd-close

Roda **depois que o PR foi mergeado**. É a etapa que impede o `docs/specs/` de virar um
cemitério de deltas.

## O problema que esta etapa resolve

Um change spec descreve uma **mudança**, não um estado. Depois de duzentos cards você tem
duzentos diretórios dizendo o que mudou naquele momento, e nenhum dizendo o que é verdade
hoje. A pergunta "qual é o comportamento atual deste módulo?" fica sem resposta — o que é
exatamente o que o ciclo existe para evitar.

O estado consolidado é o **Module Pack**. Esta etapa é a ponte, e precisa ser um passo
executado, não uma boa intenção no fim de um arquivo.

## Passo 1 — colher o que a mudança ensinou

Leia `spec.md`, `tasks.md`, `progress.md` e o relatório de review do card, e extraia:

- **Invariante nova ou corrigida** — regra de negócio que ninguém tinha escrito, ou que
  estava errada no pack
- **Consumidor descoberto** — quem dependia do módulo e não estava no blast radius. Se o
  `revisor-regressao` achou consumidor que o pack não listava, isso é a lacuna mais
  valiosa da rodada
- **Armadilha encontrada** — o que fez você perder tempo, e por quê
- **Ponto de registro esquecido** — arquivo que precisou ser editado e não estava listado
- **Dívida aceita** — as linhas `Minor:` do `progress.md`. Algumas são armadilha
  disfarçada; outras merecem virar card

Se a mudança não ensinou nada — acontece, e é normal em card pequeno — diga isso e pule
para o passo 3. Aprendizado inventado para justificar a etapa é pior que etapa vazia.

## Passo 2 — atualizar o Module Pack

Aplique os achados ao `AGENTS.md` do módulo por diff, preservando o que já está lá. Depois releia
o pack inteiro e corte o que virou mentira: invariante que não vale mais, consumidor que
sumiu, armadilha já resolvida.

Respeite o teto de ~200 linhas. Se o pack estourar, o módulo é grande demais e isso é um
achado a registrar, não motivo para engordar o arquivo.

O `/sdd-pack` tem as regras de conteúdo de cada seção — siga-as.

## Passo 3 — arquivar o spec

Mova o diretório do card para o subdiretório de arquivo, mantendo o histórico:

```bash
mkdir -p docs/specs/.arquivo
git mv docs/specs/<id>-<slug> docs/specs/.arquivo/
```

O spec não é apagado: ele continua sendo o registro de por que a mudança foi feita, o que
uma mensagem de commit não guarda com esse nível de detalhe. Mas sai do caminho, e o
`docs/specs/` volta a listar só o que está em andamento.

Isso também tem efeito prático no ferramental: o `scope-guard` casa spec pela branch, e um
diretório arquivado não é mais casado. Card antigo deixa de restringir escopo de trabalho
novo.

> Se o projeto configurou `specsDir` no `.sdd.json`, use aquele caminho.

## Passo 4 — reportar

Diga, em poucas linhas:

1. O que entrou no pack, com destaque para consumidor ou invariante que ninguém sabia
2. O que saiu do pack por ter virado mentira
3. Qual `Minor:` você acha que merece virar card, e por quê

O item 1 é a métrica real desta etapa. Pack que nunca cresce depois de um card significa
que ou o pack já estava completo, ou ninguém está olhando.

## Regras

- **Só rode depois do merge.** Antes disso o aprendizado ainda pode mudar.
- **Mexa apenas em documentação.** Código fica fora desta etapa.
- Pack atualizado precisa de revisão humana igual ao pack novo — invariante errada dá
  confiança falsa. Aponte o que você inferiu e não conseguiu confirmar.
