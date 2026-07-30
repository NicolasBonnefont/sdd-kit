---
name: sdd-pack
description: Cria ou atualiza o Module Pack (AGENTS.md) de um módulo, com fronteiras, invariantes de negócio, padrão canônico, blast radius e armadilhas.
compatibility: Requer git e bash
disable-model-invocation: true
---

# /sdd-pack

Escreve o **Module Pack**: o `AGENTS.md` que fica dentro da pasta do módulo e ensina qualquer agente a trabalhar ali sem quebrar nada.

Sem módulo informado, use o caminho dos arquivos alterados na branch atual.

## Onde o arquivo fica

Dentro da própria pasta do módulo:

```
<raiz>/<caminho-do-modulo>/AGENTS.md
```

Isso não é preferência estética. Agentes procuram o `AGENTS.md` mais próximo subindo a árvore, então o pack é encontrado sozinho. E, por viver junto do código, ele aparece no diff de todo PR que toca o módulo — que é o que impede o pack de envelhecer sem ninguém notar.

## Antes de escrever, investigue

Escreva a partir do código. A documentação existente diverge dele com frequência, e o pack precisa refletir o que é verdade hoje — divergência encontrada é achado a registrar.

1. Liste os arquivos do módulo e identifique os maiores — concentram o risco
2. `git log --oneline -30 -- <caminho>` para ver o que muda de verdade e com que frequência
3. Ache quem consome o módulo: busque os símbolos exportados **fora** da pasta dele
4. Leia os testes existentes, se houver — são a documentação mais confiável do comportamento esperado
5. Procure enums, constantes e validators: é onde as regras de negócio costumam estar escritas
6. Leia o `AGENTS.md` da raiz do repositório: as fronteiras do sistema declaradas lá dizem quais consumidores o grep não vai encontrar

## As cinco seções

**Leia [`PACK-FORMAT.md`](PACK-FORMAT.md) e siga o gabarito.** Ele traz o conteúdo de cada
seção, o teto de tamanho e o critério que fecha o pack.

## Depois de escrever

1. Mostre o pack e diga, em uma linha, o que você não teve certeza
2. **Exija revisão humana de quem conhece o domínio.** Invariante errada dá confiança falsa, e confiança falsa é o que faz alguém pular a verificação. Deixe isso explícito
3. Sugira o commit: `docs(<modulo>): adiciona module pack`

## Atualizando um pack existente

Trabalhe por diff sobre o pack atual: leia o que está lá, veja o que mudou no módulo desde o último commit dele, e proponha as linhas a trocar. Aponte o que virou mentira — invariante superada, consumidor que sumiu, armadilha já resolvida.

## Fechando um ciclo de mudança

Incorporar ao pack o que um card ensinou é etapa própria do ciclo, não observação de
rodapé: **`/sdd-close`**, depois do merge. Ela colhe invariante nova, consumidor
descoberto e armadilha encontrada, e arquiva o spec.

É assim que a cobertura de conhecimento cresce mudança a mudança, em vez de depender de
um esforço de documentação que nunca acontece.
