# Gabarito de tasks e ledger

Referência descarregada de [`SKILL.md`](SKILL.md). Dois artefatos, no mesmo diretório do
spec.

## `tasks.md` — a decomposição

```markdown
# Tasks — <id> <título>

- [ ] ### 1. <título>
  **Arquivos:** Criar/Editar: <caminhos> · Teste: <caminho>
  **Consumes:** o que já existe e esta task usa
  **Produces:** o que esta task entrega e as próximas consomem
  **Requisito:** qual linha do spec esta task atende
  **Verificação:** o comando que prova que ela funcionou
```

**`Consumes`/`Produces`** é o que torna a sequência encadeável e permite retomar do meio
sem reconstruir contexto.

**`Requisito`** amarra cada task a algo que o spec pediu. Task cujo requisito você não
consegue apontar é escopo inventado — corte antes de implementar.

**Tamanho.** Task boa cabe num commit e tem uma verificação que prova que funcionou.
Quando não couber, quebre mais.

## `progress.md` — o ledger

Uma linha por task concluída, atualizada na hora:

```markdown
Task 1: completa (a1b2c3d) — 3 testes novos, suíte 713/713
Task 2: completa (e4f5g6h) — suíte 715/715
Minor: getMissingFields sem teste dedicado; catch genérico mistura leitura e escrita
```

A linha **`Minor:`** guarda dívida aceita conscientemente. Registrar é o que a separa de
descuido, e é o que permite decidir depois se vira card. O `/sdd-close` lê essas linhas
para descobrir o que virou aprendizado do módulo.

## Critério de conclusão

O artefato está pronto quando **toda task tem os cinco campos preenchidos** e **todo
requisito do spec aparece em pelo menos uma task**. O `/sdd-validate` confere as duas
coisas — a primeira por script, a segunda por leitura.
