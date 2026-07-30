---
name: sdd-review
description: Revisa as mudanças da branch sob três perspectivas — regressão, segurança e qualidade — e consolida os achados por severidade.
compatibility: Requer git e bash; subagentes são opcionais
disable-model-invocation: true
---

# /sdd-review

Revisa o que mudou na branch **antes do push**, com três olhares independentes rodando em paralelo.

Este é o segundo encontro com esses revisores no ciclo: o primeiro foi no `/sdd-spec`, em
modo spec, antes de existir código. Se aquele passo rodou, boa parte do risco já virou
invariante — e o que aparecer aqui deveria ser sobre a **execução**, não sobre a decisão.
Achado aqui que era visível no spec é sinal de que a revisão de spec foi rasa; vale
registrar isso, porque é a informação que melhora o ciclo da próxima vez.

## Argumentos

Ambos opcionais:

| Argumento | Efeito |
|---|---|
| `--severo` | O revisor `qualidade` sobe para a postura severa: sem teto de achados e bloqueios presumidos viram 🔴 |
| `--modelo <nome>` | Roda os três revisores no modelo indicado, em vez do modelo da sessão |

**Por padrão os revisores herdam o modelo da sessão.** Nenhum deles declara modelo no
próprio arquivo, de propósito: alias de modelo é específico de cada harness, e fixar um
aqui quebraria em qualquer lugar que não use o mesmo vocabulário — além de envelhecer a
cada modelo novo. Se quiser um modelo mais barato para revisar, passe `--modelo`; a
escolha é de quem está usando, não do ferramental.

## Passo 1 — montar o contexto

```bash
base=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD | sed 's|origin/||')
git diff --stat "${base:-master}"...HEAD
git diff "${base:-master}"...HEAD
```

Nem todo repositório usa `master`. Se a detecção falhar, confira `.sdd.json` na raiz ou pergunte.

Se o diff estiver vazio, diga isso e pare.

Identifique quais módulos foram tocados e leia o `AGENTS.md` de cada um. Leia também o `spec.md` do card, se existir. **Sem o pack, a revisão vira genérica** — é o pack que dá conhecimento de domínio ao revisor.

Se o diff passar de ~20 arquivos, pergunte se deve revisar tudo ou só um subconjunto.

## Passo 2 — aplicar os três revisores

| Revisor | Foco |
|---|---|
| `revisor-regressao` | Quem consome o que mudou e qual invariante do pack está em risco |
| `seguranca` | SQL injection, XSS, CSRF, autorização, exposição de dado sensível |
| `qualidade` | Simplicidade, altitude da abstração, duplicação, aderência ao padrão do módulo |

**Se o harness suporta subagentes** (Claude Code, entre outros): dispare os três numa única mensagem, em paralelo. Eles não dependem um do outro, e rodar em sequência só desperdiça tempo.

Com `--modelo`, aplique-o na invocação de cada um. Sem o argumento, deixe cada revisor herdar o modelo da sessão.

**Se não suporta** (a maioria dos editores hoje): leia os três arquivos em `agents/` deste pacote e aplique cada perspectiva você mesmo, **em passadas separadas** sobre o mesmo diff. A separação importa — revisar as três dimensões de uma vez faz você achar menos em cada uma. Depois consolide como se viessem de três fontes.

Passe a cada um o diff completo, o caminho dos Module Packs relevantes e o caminho do spec. Mande o material bruto: resumo feito por você já é uma triagem que enviesa o revisor.

Peça a cada um um relatório de **até 400 palavras**. Teto de tamanho é o que mantém o achado denso e o relatório final legível.

## Passo 3 — reportar, um eixo por vez

Três seções, uma por revisor, na ordem abaixo. **Cada eixo mantém os próprios achados e a
própria ordem interna.**

```markdown
# Review — <branch>

## Regressão
### [🔴|🟡|🔵] <título>
**Arquivo:** `caminho:linha`
**Consumidor em risco:** `caminho:linha`
**Como quebra:** entrada concreta → resultado errado

## Segurança
### [🔴|🟡|🔵] <título>
...

## Qualidade
### [🟡|🔵] <título>
...

**Pior achado por eixo:** regressão 🔴 · segurança — · qualidade 🟡
```

**Por que separado, e não uma lista única ordenada por severidade.** Consolidar por
severidade faz um eixo desaparecer atrás do outro: dois 🔴 de segurança no topo empurram
o eixo de qualidade para o fim da página, e ele deixa de ser lido. Os três eixos existem
justamente porque uma mudança pode passar em dois e falhar no terceiro — e a única forma
de isso continuar visível é cada um ter sua seção.

Por isso o resumo final traz **o pior achado de cada eixo**, e não um vencedor único.
Eleger um vencedor entre eixos é a reordenação que a separação existe para impedir.

Dentro de cada eixo, aí sim:

- **Deduplique** o que aquele revisor repetiu, e ordene por severidade.
- **Descarte o que não se sustenta.** Você tem o diff; achado que o código desmente sai
  do relatório. Ruído mata a adesão mais rápido que omissão.
- **Pule o que a ferramenta já garante.** Formatação, import ordenado, regra de lint com
  correção automática — o pipeline resolve, e ocupar o review com isso gasta a atenção do
  autor no lugar errado.
- **Reserve 🔴 para o que quebra em produção**: falha de segurança, perda de dado,
  regressão em funcionalidade existente.
- **Achado sem "como quebra" concreto vira 🔵.** Sem a entrada que produz o erro, é palpite.

Achado que aparece em mais de um eixo fica **nos dois**, com uma linha dizendo que o outro
eixo também o levantou. Concordância entre eixos é sinal, e some quando você deduplica
entre eles.

## Princípios que valem para os três revisores

- **Consistência > perfeição.** Código consistente com o que existe vence código teoricamente melhor. Só sugira mudança arquitetural com impacto crítico.
- **Contexto é rei.** Código legado costuma ter gambiarra com motivo. Crítica a legado vem acompanhada de solução prática.

## Ao terminar

Mostre o resumo no chat, além do arquivo. Grave o relatório em `docs/specs/<id-do-card>-<slug>/review-<timestamp>.md` quando houver spec; senão, mostre só no chat.

Havendo 🔴 em qualquer eixo, diga com clareza que o PR espera a correção.

**Este review é local e fica local.** Publicar no GitHub — comentário, thread ou aprovação
— exige que a pessoa peça, naquele momento. Terminar a revisão não é autorização para
publicá-la.

Se o usuário quiser levar os achados para o PR, ele pede — e aí você mostra o texto antes
de enviar. Um comentário automático num PR alheio é visível para o time inteiro e não tem
como ser desfeito sem deixar rastro.
