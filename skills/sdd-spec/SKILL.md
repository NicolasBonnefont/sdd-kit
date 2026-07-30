---
name: sdd-spec
description: Lê o card no GitHub e escreve o change spec da mudança — comportamento atual, alvo, invariantes, fora de escopo e critério de verificação.
compatibility: Requer git, bash e gh autenticado para ler o card
disable-model-invocation: true
---

# /sdd-spec

Transforma um card do GitHub num **change spec**: uma página que descreve **só o delta** da mudança. Nunca o sistema inteiro.

Argumento: o número do card. Sem argumento, pergunte.

## Passo 1 — ler o card

```bash
gh issue view <numero> --comments
```

Se falhar por autenticação, mande rodar `/sdd-connect` e pare.

A discussão nos comentários costuma conter a regra de negócio real, que não está na descrição. Leia até o fim.

## Passo 2 — o card diz o suficiente?

Card vago vira spec vago, e spec vago vira ambiguidade resolvida em silêncio na hora de
implementar. Antes de decidir qualquer coisa, avalie se você conseguiria escrever o
`Comportamento alvo` sem inventar nada.

Sinais de que falta alinhamento:

- O card descreve um sintoma e você teria de supor a causa
- Há mais de uma leitura razoável do que "pronto" significa
- Um ator aparece sem que se saiba quem pode fazer aquilo
- Números, prazos ou limites aparecem sem origem ("mostrar os últimos" — quantos?)
- O comportamento em caso de erro, lista vazia ou permissão negada fica em aberto

Havendo qualquer um, **entreviste antes de escrever**, uma pergunta por vez:

1. Comece pelo que muda para quem usa: *"depois desta mudança, o que a pessoa consegue
   fazer que hoje não consegue?"*
2. Persiga a resposta até ela virar comportamento observável. "Melhorar a busca" vira
   *"a busca passa a considerar X, e o resultado sai ordenado por Y"*
3. Cubra os cantos: caso vazio, caso de erro, quem tem permissão, o que acontece com dado
   já existente
4. Feche repetindo o entendimento em três frases e pedindo confirmação

Uma pergunta por mensagem. Bateria de perguntas de uma vez recebe resposta rasa, e a
entrevista existe justamente para o que a pessoa ainda não formulou.

**Registre as respostas no `Comportamento alvo` e nas `Invariantes`**, não numa seção de
perguntas — o spec é o artefato, a entrevista é o meio.

Card suficientemente claro dispensa esta etapa: siga direto.

## Passo 3 — triagem: isto precisa de spec?

**Dispensa spec** quando: o arquivo é um só, o comportamento novo cabe numa frase, a mudança fica fora de regra de negócio e não há consumidor a jeito de quebrar. Ajuste de texto, correção de typo, bump de dependência, ajuste de estilo.

Nesses casos declare a dispensa, explique em uma linha por quê, e siga direto para o código. **Spec para bugfix trivial custa mais do que economiza** — é assim que o processo vira burocracia e o time abandona.

**Precisa** quando há regra de negócio, mais de um módulo envolvido, mudança de contrato (API, evento, schema) ou risco de regressão em quem consome.

## Passo 4 — identificar o módulo e ler o pack

Descubra qual módulo a mudança toca e leia o `AGENTS.md` dele. Se não existir, avise que rodar `/sdd-pack` antes deixa este spec muito melhor, e siga assim mesmo.

O pack é o que permite preencher **Invariantes** com algo real em vez de genérico.

## Passo 5 — investigar o comportamento atual

Leia o código antes de escrever. O bloco "Comportamento atual" precisa refletir o que o sistema faz hoje, não o que a issue supõe que ele faz. Divergência entre os dois é o achado mais valioso desta etapa — registre.

## Passo 6 — escrever

**Leia [`SPEC-FORMAT.md`](SPEC-FORMAT.md) e siga o gabarito.** Ele traz as seis seções, o
caminho do arquivo e as notas de preenchimento de cada bloco.

## Passo 7 — revisar o spec antes de mostrá-lo

**Este é o passo mais importante e o mais pulado do ciclo**, e a razão é a
curva de custo: risco encontrado aqui vira uma linha de texto; o mesmo risco encontrado
depois do código vira retrabalho.

Primeiro a checagem mecânica, com `/sdd-validate` — seções obrigatórias presentes e
`Invariantes` e `Arquivos no escopo` de fato preenchidas.

Depois a revisão de conteúdo, com os **mesmos três revisores** que revisam o diff, agora
em **modo spec**. Dispare os três em paralelo, passando o `spec.md`, o Module Pack do
módulo e o `AGENTS.md` da raiz:

| Revisor | O que procura no spec |
|---|---|
| `revisor-regressao` | Invariante faltando, consumidor não mencionado, contrato que atravessa fronteira, ponto de registro fora do escopo |
| `seguranca` | Superfície nova sem proteção declarada, mudança de visibilidade ou permissão, ausência de sujeito ("quem pode fazer isso?") |
| `qualidade` | Alvo mais complexo que a intenção, spec prescrevendo implementação, escopo largo que desenha espaguete |

Cada achado deles vem como **frase pronta para entrar no spec**, não como problema a
resolver depois. Incorpore o que fizer sentido e diga o que descartou e por quê.

Se o harness não tem subagentes, aplique as três perspectivas você mesmo, em passadas
separadas — a separação é o que faz achar mais em cada uma.

## Ao terminar

Mostre o spec já revisado, liste o que os revisores mudaram, aponte o que continua
incerto e peça validação humana.

**O gate entre spec e código é uma pessoa** — é o ponto inteiro do método. Só depois de
aprovado sugira `/sdd-execute`, que decompõe em `tasks.md` e implementa.

## Os artefatos do card

```
docs/specs/<numero>-<slug>/
├── spec.md        o delta da mudança          (/sdd-spec)
├── tasks.md       decomposição executável     (/sdd-execute)
└── progress.md    ledger com evidência        (/sdd-execute)
```
