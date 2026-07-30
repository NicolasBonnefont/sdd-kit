# Gabarito do `AGENTS.md` da raiz

Referência descarregada de [`SKILL.md`](SKILL.md). É a constituição do repositório: de
onde todas as skills e todos os revisores tiram os fatos do projeto.

Teto de ~150 linhas. Fica na raiz do repositório.

```markdown
# <projeto> — contexto do repositório

Uma linha sobre o que o projeto é.

## Stack real
O que o código diz. Registre divergência com a documentação existente de forma
explícita: "o README afirma X; na prática é Y".

## Comandos
Tabela ação → comando. Marque os que estão quebrados.

## Rede de segurança automatizada
Quantos testes, qual cobertura, o que roda em pre-commit. Havendo ausência de
testes, declare com todas as letras — isso define o que é possível verificar
antes de um merge.

## Arquitetura
Como o código é organizado. Havendo mais de um estilo convivendo, qual seguir em
código novo e onde está o exemplar de referência.

## Fronteiras
O que atravessa para fora do repositório: banco compartilhado, eventos, APIs.

## Pontos de registro
Arquivos que precisam ser editados para uma funcionalidade nova aparecer.

## Convenções
Nomenclatura, organização de teste, padrão de commit e de branch.

## Concentrações de risco
Arquivos grandes demais e dívidas estruturais conhecidas.
```

## Notas de preenchimento

**Escreva o que verificou.** Seção enxuta com fatos confirmados vale mais que seção
completa com suposição: os revisores tratam este arquivo como verdade, e erro aqui se
propaga em escala.

**Rede de segurança é o campo mais importante.** Ele decide se o `/sdd-execute` roda loop
TDD, cai para caracterização, ou declara verificação manual.

**Divergência entre documentação e código** é o achado mais valioso da investigação.
Documentação errada faz agente gerar código quebrado com confiança.

**CI herdado de outro repositório** significa que você não sabe o que roda. Declare que
não sabe.

## Critério de conclusão

O arquivo está pronto quando cada seção contém fato verificado ou declaração explícita de
lacuna, e quando você consegue listar para o usuário o que ficou pendente de resposta
humana — tipicamente as fronteiras com outros sistemas e o conteúdo real do CI.
