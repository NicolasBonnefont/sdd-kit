---
name: sdd-validate
description: Verifica se o change spec e as tasks estão consistentes entre si e com o diff real da branch — seções obrigatórias, rastreabilidade task/requisito e aderência ao escopo declarado.
compatibility: Requer git e Node
disable-model-invocation: true
---

# /sdd-validate

Confere se o que foi escrito no spec continua batendo com o que está sendo feito. Barato, roda a qualquer momento do ciclo, e é o que impede o spec de virar ficção enquanto o código anda para outro lado.

## Passo 1 — verificação estrutural

Determinística, feita por script. **O caminho é absoluto**: seu diretório de trabalho é o
repositório do projeto, não o desta skill, então `scripts/validate.js` não resolve.

O script é `skills/sdd-validate/scripts/validate.js`. Ache a primeira cópia que existir,
trocando `~` pela pasta pessoal de quem está usando:

- `$SDD_KIT_HOME`, quando a variável estiver definida
- `~/sdd-kit`
- `~/.claude/skills/sdd-validate/scripts/validate.js`, e o equivalente em `~/.cursor` e em
  `~/.gemini/config`
- `.claude/`, `.cursor/` ou `.agents/` dentro do projeto

Rode-o com o Node, de dentro do repositório do projeto. Isso vale igual em qualquer terminal:

```
node "<caminho>/validate.js"
```

Sem argumentos ele resolve o spec pela branch atual e detecta a branch base. Se precisar
apontar explicitamente: `node "<caminho>/validate.js" docs/specs/<id>-<slug> <branch-base>`.

Se nenhuma cópia existir, a instalação está incompleta — mande rodar `npx github:NicolasBonnefont/sdd-kit --check` e pare.

O script confere: seções obrigatórias do `spec.md`, se `Invariantes` e `Arquivos no escopo`
estão realmente preenchidas, se cada task declara `Consumes`, `Produces`, `Requisito` e
`Verificação`, e se todo arquivo do diff cai dentro do escopo declarado.

Mostre a saída como veio. Não parafraseie: o valor dela é ser mecânica.

## Passo 2 — verificação semântica

O script confere que os campos existem. Só você confere se eles fazem sentido. Leia `spec.md`, `tasks.md` e o diff, e responda:

**Rastreabilidade**
- Cada task realmente atende o requisito que declara, ou o campo `Requisito` foi preenchido para passar no script?
- Existe requisito do spec que nenhuma task cobre? Isso é trabalho faltando.
- Existe task que não rastreia a nada? Isso é escopo inventado.

**Aderência ao delta**
- O `Comportamento atual` ainda descreve o que o código fazia antes desta branch?
- O diff faz alguma coisa que o `Comportamento alvo` não pediu?
- O diff faz algo que o `Fora de escopo` proibiu explicitamente?

**Invariantes**
- Cada invariante ainda está ancorada num arquivo e linha que existem? Âncora quebrada é invariante que ninguém consegue verificar.
- O diff viola alguma delas?

**Verificação**
- O `Critério de verificação` é executável, ou é uma intenção? "Testar o fluxo" não é critério; um comando é.

## Passo 3 — relatório

```markdown
## Estrutura
<saída literal do script>

## Semântica
- [OK|FALHA] Rastreabilidade: <o que encontrou>
- [OK|FALHA] Aderência ao delta: <...>
- [OK|FALHA] Invariantes: <...>
- [OK|FALHA] Critério de verificação: <...>

**Veredito:** válido | precisa de ajuste no spec | precisa de ajuste no código
```

O veredito importa mais que a lista. Divergência entre spec e código tem duas soluções opostas — corrigir o código ou corrigir o spec — e escolher errado é pior que não validar. Diga qual dos dois, e por quê.

## Quando rodar

- Depois do `/sdd-spec`, antes de implementar: pega spec incompleto quando corrigir ainda é barato
- Depois do `/sdd-execute`: pega escopo que cresceu durante a implementação
- Antes de abrir o PR: é o último momento em que dá para consertar sem discussão pública

## Regras

- **Não conserte por conta própria.** Reporte e pergunte. Ajustar o spec para caber no código que já existe derrota o propósito inteiro do método.
- Spec ausente não é falha de validação: é sinal de que a mudança não passou pelo ciclo. Diga isso e sugira `/sdd-spec`.
