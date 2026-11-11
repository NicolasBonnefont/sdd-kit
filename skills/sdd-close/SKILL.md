---
name: sdd-close
description: Fecha um card ao finalizar a entrega, antes do code review — incorpora ao Module Pack o que a mudança ensinou e arquiva o change spec, para que os deltas virem estado consolidado.
compatibility: Requer git
disable-model-invocation: true
---

# /sdd-close

Roda **ao finalizar a entrega, quando o PR vai para code review**. É a etapa que impede o
`docs/specs/` de virar um cemitério de deltas.

Não roda depois do merge por um motivo prático: mergeada a branch, quem implementou já está
em outra coisa, e etapa que só pode ser executada quando ninguém mais tem a mão no código é
etapa que não acontece. Rodando aqui, o commit entra no mesmo PR, e a atualização do pack
passa pela mesma revisão humana que o código.

Em troca, o aprendizado colhido aqui é o que se sabe **antes** da revisão humana. Se o
revisor levantar invariante, consumidor ou armadilha que o pack não tinha, rode de novo
depois de aplicar o retorno — a segunda passada é barata, porque o spec já está arquivado e
só o delta muda.

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

Crie `docs/specs/.arquivo` se ainda não existir e mova o diretório do card para lá,
mantendo o histórico:

```
git mv docs/specs/<id>-<slug> docs/specs/.arquivo/
```

O spec não é apagado: ele continua sendo o registro de por que a mudança foi feita, o que
uma mensagem de commit não guarda com esse nível de detalhe. Mas sai do caminho, e o
`docs/specs/` volta a listar só o que está em andamento.

Isso também tem efeito prático no ferramental: o `scope-guard` casa spec pela branch, e um
diretório arquivado não é mais casado. Card antigo deixa de restringir escopo de trabalho
novo.

O mesmo efeito vale para este card: com o spec arquivado, o `scope-guard` deixa de confinar
a branch. Correção pedida no code review segue sem essa rede, então confira o escopo
rodando o `/sdd-validate` com o caminho do diretório arquivado como argumento.

> Se o projeto configurou `specsDir` no `.sdd.json`, use aquele caminho.

## Passo 4 — reportar

Diga, em poucas linhas:

1. O que entrou no pack, com destaque para consumidor ou invariante que ninguém sabia
2. O que saiu do pack por ter virado mentira
3. Qual `Minor:` você acha que merece virar card, e por quê

O item 1 é a métrica real desta etapa. Pack que nunca cresce depois de um card significa
que ou o pack já estava completo, ou ninguém está olhando.

## Regras

- **Rode ao finalizar a entrega, antes do code review** — é o último momento em que quem
  implementou ainda tem a mão na branch. Havendo achado do revisor, rode de novo.
- **Spec fora do git dispensa o passo 3.** Quando os artefatos do ciclo não são versionados
  no repositório do time — decisão legítima, já que o método é individual e o repo é
  compartilhado —, não há o que arquivar com `git mv`: mova o diretório no local onde ele
  vive e siga. Os passos 1, 2 e 4 continuam valendo.
- **Mexa apenas em documentação.** Código fica fora desta etapa.
- Pack atualizado precisa de revisão humana igual ao pack novo — invariante errada dá
  confiança falsa. Aponte o que você inferiu e não conseguiu confirmar.
