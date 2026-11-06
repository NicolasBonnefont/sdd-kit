---
name: sdd-review
description: Revisa as mudanças da branch sob três perspectivas — regressão, segurança e qualidade — e reporta os achados um eixo por vez.
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

### A discussão é fonte, não contexto opcional

Parte do que o card exige costuma ser resolvida **fora do código** — por migration, por
decisão de sequenciamento, por escolha registrada em comentário. O diff não tem como
mostrar isso, e o revisor que só olha o diff conclui que o requisito ficou de fora.

Colete antes de disparar os revisores e grave junto do diff. Sem PR aberto, o card basta:

```bash
gh issue view <card> --comments
gh pr view <pr> --comments
gh api --paginate "repos/{owner}/{repo}/pulls/<pr>/comments"
```

A terceira chamada traz os comentários inline, que o `--comments` deixa de fora. As três são
leitura pura, e os comentários do PR também dizem **o que já foi levantado**: repetir achado
de outro revisor gasta a atenção do autor sem entregar nada.

"O requisito X não foi endereçado" é o achado mais fácil de errar e o mais caro de postar:
o autor responde com o link do comentário onde resolveu, e todo o resto do relatório passa
a ser lido com desconfiança.

### O que fica fora do material

O diff e os comentários atravessam um processador terceiro — o provedor do modelo. Fica de
fora: arquivo de ambiente versionado (`.env` e variantes), chave privada, certificado,
keystore, dump de banco e fixture com dado real de pessoa.

Havendo qualquer um deles no diff, **passe adiante o caminho e os nomes das chaves, e deixe
os valores de fora**. Arquivo de ambiente versionado é problema de segurança que o revisor
precisa ver, e o nome do arquivo com o nome da chave já bastam para agir.

Comando que o `gh-guard` questionar por devolver credencial — variável de CI, chave, token —
merece a pergunta respondida por quem conduz o trabalho.

## Passo 2 — aplicar os três revisores

| Revisor | Foco |
|---|---|
| `revisor-regressao` | Quem consome o que mudou e qual invariante do pack está em risco |
| `seguranca` | SQL injection, XSS, CSRF, autorização, exposição de dado sensível |
| `qualidade` | Simplicidade, altitude da abstração, duplicação, aderência ao padrão do módulo |

**Se o harness suporta subagentes** (Claude Code, entre outros): dispare os três numa única mensagem, em paralelo. Eles não dependem um do outro, e rodar em sequência só desperdiça tempo.

Com `--modelo`, aplique-o na invocação de cada um. Sem o argumento, deixe cada revisor herdar o modelo da sessão.

**Se não suporta** (a maioria dos editores hoje): leia os três arquivos em `agents/` deste pacote e aplique cada perspectiva você mesmo, **em passadas separadas** sobre o mesmo diff. A separação importa — revisar as três dimensões de uma vez faz você achar menos em cada uma. Depois consolide como se viessem de três fontes.

Passe a cada um o diff completo, a discussão coletada, o caminho dos Module Packs relevantes, o caminho do spec e o caminho do [`REVIEW-FORMAT.md`](REVIEW-FORMAT.md). Mande o material bruto: resumo feito por você já é uma triagem que enviesa o revisor.

Peça a cada um o achado nas **quatro linhas do gabarito**. Forma fixa é o que mantém o achado denso; a contagem que chega ao relatório final é decidida no Passo 3.

## Passo 3 — reportar, um eixo por vez

**Leia [`REVIEW-FORMAT.md`](REVIEW-FORMAT.md) e siga o gabarito.** Ele traz o cabeçalho com
veredito e próxima ação, as quatro linhas do achado, o teto de cinco por eixo com a faixa
`Depois`, e a seção `Cobertura`.

Três seções, uma por revisor, na ordem regressão → segurança → qualidade. **Cada eixo
mantém os próprios achados e a própria ordem interna** — o gabarito explica por quê.

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

O que cada revisor investigou e descartou sai dos achados e vira **uma linha por eixo na
seção `Cobertura`**. É informação de alcance, e no meio do fluxo ela disputa atenção com o
achado que precisa de ação.

## Princípios que valem para os três revisores

- **Consistência > perfeição.** Código consistente com o que existe vence código teoricamente melhor. Só sugira mudança arquitetural com impacto crítico.
- **Contexto é rei.** Código legado costuma ter gambiarra com motivo. Crítica a legado vem acompanhada de solução prática.

## Ao terminar

Mostre o resumo no chat, além do arquivo. Havendo spec, grave o relatório no caminho que o gabarito declara — ele respeita o `specsDir` do `.sdd.json`. Sem spec, o relatório vive só no chat.

Havendo 🔴 em qualquer eixo, diga com clareza que o PR espera a correção.

Encerre o chat repetindo a **próxima ação** do cabeçalho, como última linha: o arquivo e a
linha do pior achado, num passo que cabe em dois minutos. Relatório que termina em
diagnóstico deixa "por onde começo" para quem já gastou a atenção lendo.

**Este review é local e fica local.** Publicar no GitHub — comentário, thread ou aprovação
— exige que a pessoa peça, naquele momento. Terminar a revisão não é autorização para
publicá-la.

Se o usuário quiser levar os achados para o PR, ele pede — e aí você mostra o texto antes
de enviar. Um comentário automático num PR alheio é visível para o time inteiro e não tem
como ser desfeito sem deixar rastro.
