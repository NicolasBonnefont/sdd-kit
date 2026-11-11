---
name: sdd-pr
description: Monta a descrição do pull request a partir do change spec, das evidências de execução e dos achados resolvidos, e abre o PR após autorização explícita.
compatibility: Requer git e gh autenticado
disable-model-invocation: true
---

# /sdd-pr

Fecha o trabalho de implementação. A descrição do PR não é escrita do zero: ela é montada
a partir do que o ciclo já produziu.

## Passo 1 — verificar se está pronto

Pare e diga o que falta se qualquer um destes for verdade:

- Existe 🔴 aberto no último `/sdd-review`
- O `tasks.md` tem checkbox não marcado
- A suíte de testes não está verde
- O `/sdd-validate` não passa

Não maquie: PR aberto com pendência conhecida transfere o problema para o revisor.

## Passo 2 — montar a descrição

Cada seção vem de um artefato que já existe. Não invente conteúdo novo:

| Seção do PR | Origem |
|---|---|
| Link do card | cabeçalho do `spec.md` |
| O que muda | bloco `Comportamento alvo` do `spec.md` |
| Possíveis impactos | bloco `Invariantes` do `spec.md` + achados do `revisor-regressao` |
| Evidências de teste | blocos RED/GREEN e estado da suíte no `progress.md` |
| Fora de escopo | bloco `Fora de escopo` do `spec.md` |
| Dívida aceita | linhas `Minor:` do `progress.md` |

Se o repositório tem template de PR em `.github/PULL_REQUEST_TEMPLATE.md`, **use o
template dele** e preencha as seções correspondentes. O formato do time vence o seu.

Onde o spec não responde, escreva que não há informação — não preencha por simetria.

## Passo 3 — mostrar antes de enviar

**Mostre a descrição completa no chat e espere autorização explícita.** Com o "pode abrir":

```
gh pr create --title "<título>" --body-file <arquivo> --fill
```

Um PR aberto é visível para o time inteiro, dispara notificação e não some do histórico
quando fechado. **Terminar a implementação não autoriza abrir o PR.** A pessoa pede, você
mostra, ela confirma.

O hook `gh-guard` vai escalar a confirmação de qualquer forma. Ele é a rede; a regra é
esta, e vale mesmo que a confirmação do hook seja aceita distraidamente.

O mesmo se aplica a comentar, aprovar ou fazer merge: nunca por iniciativa própria.

## Ao terminar

Informe a URL do PR e diga que o passo seguinte é `/sdd-close`, **antes do code review** —
é ele que devolve o aprendizado da mudança para o Module Pack, e o commit entra neste PR.
