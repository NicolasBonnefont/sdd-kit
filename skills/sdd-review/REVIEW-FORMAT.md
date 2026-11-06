# Gabarito do relatório de review

Referência descarregada de [`SKILL.md`](SKILL.md). Vale para o **modo diff**. No `/sdd-spec`
os mesmos revisores rodam em modo spec, e lá cada achado é frase pronta para entrar no
`spec.md` — outro formato, descrito no arquivo de cada revisor.

Caminho: `<specsDir>/<id-do-card>-<slug>/review-<timestamp>.md` quando existe spec. Sem
spec, o relatório vive só no chat, no mesmo formato.

## O relatório

```markdown
# Review — <branch>

**Veredito:** <🔴 bloqueia o push | 🟡 segue com ressalva | ✅ nada a corrigir>
**Pior por eixo:** regressão <🔴|🟡|🔵|—> · segurança <…> · qualidade <…>
**Próxima ação:** <um passo que cabe em dois minutos — abrir arquivo:linha>

## Regressão

<achados>

## Segurança

<achados>

## Qualidade

<achados>

## Cobertura

Regressão: <o que buscou, o que descartou, invariante que ficou sem verificar>
Segurança: <vetor testado que não se sustentou, achado preexistente>
Qualidade: <dívida preexistente registrada em uma linha>
```

Essas três linhas vêm antes de qualquer achado: quem abre o relatório decide em cinco
segundos se segura o push e para onde vai primeiro. Eixo sem achado leva `—` no lugar do
emoji.

Faltando o Module Pack do módulo tocado, o `Veredito` leva o sufixo `· sem pack em
<caminho>`. É o fato que mais muda como o resto do relatório deve ser lido, e por isso mora
na primeira linha.

## O achado

Quatro linhas, na mesma ordem nos três eixos, separadas do achado seguinte por linha em
branco. A posição já diz o que cada linha é, e é isso que dispensa o rótulo em negrito:
eram quatro por achado, e somados pesavam mais que o conteúdo.

```
🔴 <título: o problema numa frase>
<onde>
<consequência>: <entrada concreta → resultado errado>
<ação>: <comando, ou o trecho corrigido>
```

O vocabulário das três últimas linhas é de cada eixo:

| Linha | `revisor-regressao` | `seguranca` | `qualidade` |
|---|---|---|---|
| onde | `arquivo:linha` → consumidor `arquivo:linha` | `arquivo:linha` · classe | `arquivo:linha` |
| consequência | `Quebra:` | `Exploração:` | `Ganho:` |
| ação | `Verificar:` | `Correção:` | `Sugestão:` |

A linha de ação é a única que passa de uma linha, e só quando a correção é código — aí vira
bloco cercado. Severidade é calibragem de cada revisor, declarada no arquivo dele em
`agents/`.

## Teto de cinco por eixo, e a faixa `Depois`

Cinco achados de quatro linhas por seção. Do sexto em diante, uma linha cada sob
**Depois**, no fim da própria seção do eixo:

```markdown
## Qualidade

<até cinco achados de quatro linhas>

**Depois:**
- `arquivo:linha` — <o que está mais complicado que o necessário, e o que some>
```

A faixa fica dentro do eixo, e não num rodapé único do relatório, pelo mesmo motivo que os
eixos têm seções separadas.

Com `--severo`, o eixo de qualidade fica sem teto: pediram auditoria, e todo achado sai nas
quatro linhas.

## Por que três seções, e não uma lista ordenada por severidade

Consolidar por severidade faz um eixo desaparecer atrás do outro: dois 🔴 de segurança no
topo empurram o eixo de qualidade para o fim da página, e ele deixa de ser lido. Os três
eixos existem justamente porque uma mudança pode passar em dois e falhar no terceiro — e a
única forma de isso continuar visível é cada um ter sua seção.

Por isso o cabeçalho traz **o pior achado de cada eixo**, e não um vencedor único. Eleger um
vencedor entre eixos é a reordenação que a separação existe para impedir.

Achado que aparece em mais de um eixo fica **nos dois**, com uma linha dizendo que o outro
eixo também o levantou. Concordância entre eixos é sinal, e some quando se deduplica entre
eles.
