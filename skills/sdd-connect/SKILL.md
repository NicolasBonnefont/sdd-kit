---
name: sdd-connect
description: Conecta esta máquina ao GitHub via gh para que os demais comandos leiam issues e abram pull requests. Rode uma vez por máquina.
compatibility: Requer git; instala e autentica o gh
disable-model-invocation: true
---

# /sdd-connect

Deixa a máquina pronta para o ciclo SDD ler cards do GitHub. Roda uma vez; depois disso `/sdd-spec` e `/sdd-pr` funcionam sozinhos.

Execute os passos em ordem e **pare no primeiro que falhar**, mostrando ao usuário o que fazer. Não pule para o próximo esperando que resolva sozinho.

## Passo 1 — o `gh` está instalado?

```
gh --version
```

Se não estiver, mostre ao usuário a opção adequada ao sistema dele e **peça confirmação antes de instalar**:

| Sistema | Comando |
|---|---|
| Debian/Ubuntu | `sudo apt install gh` |
| Fedora | `sudo dnf install gh` |
| Arch | `sudo pacman -S github-cli` |
| Qualquer Linux | baixar o binário em `https://github.com/cli/cli/releases` |
| macOS | `brew install gh` |
| Windows (cmd ou PowerShell) | `winget install --id GitHub.cli` |

No Windows, abra um terminal novo depois de instalar: o que já estava aberto não enxerga o `gh`.

## Passo 2 — autenticar

```
gh auth status
```

Se já estiver autenticado em `github.com`, siga para o passo 3.

Se não estiver, **não tente rodar o login você mesmo**: `gh auth login` é interativo, precisa de TTY e abre o navegador. Peça ao usuário que rode no terminal dele:

```
gh auth login
```

Nas perguntas: conta `GitHub.com`, método **"Login with a web browser"**. O terminal mostra um código de uso único; o navegador abre, ele cola o código, autoriza com a conta dele e volta ao terminal. Nenhum token é colado em arquivo.

Depois avise que você vai reverificar e rode `gh auth status` de novo.

> Em CI ou container sem navegador, o caminho é `GH_TOKEN` no ambiente, com permissão de leitura em conteúdo, issues e pull requests.

## Passo 3 — validar com uma chamada real

Autenticado não é o mesmo que ter acesso à organização. Prove com uma leitura de verdade:

Rode de dentro de um repositório já clonado, para que o `gh` resolva o repositório pelo remote:

```
gh issue list --limit 1
```

Se retornar erro de permissão, o problema é acesso à organização no GitHub, não o `gh` — encaminhe a quem administra a organização.

## Passo 4 — evitar prompt de permissão a cada chamada

Sem isto, o desenvolvedor aprova manualmente cada leitura e desiste do fluxo na terceira vez. Proponha adicionar ao `.claude/settings.local.json` do repositório em que ele está:

```json
{
  "permissions": {
    "allow": [
      "Bash(gh issue view:*)",
      "Bash(gh issue list:*)",
      "Bash(gh pr view:*)",
      "Bash(gh pr list:*)",
      "Bash(gh pr diff:*)",
      "Bash(gh auth status:*)",
      "PowerShell(gh issue view *)",
      "PowerShell(gh issue list *)",
      "PowerShell(gh pr view *)",
      "PowerShell(gh pr list *)",
      "PowerShell(gh pr diff *)",
      "PowerShell(gh auth status *)"
    ]
  }
}
```

Some ao array `allow` existente, sem sobrescrever o que já está lá.

As entradas `PowerShell(...)` valem para o Claude Code no Windows; em outro sistema elas
ficam sem efeito.

**Só entram comandos de leitura, e isso não é negociável.** Nunca adicione `Bash(gh:*)`,
`PowerShell(gh *)` nem qualquer entrada que cubra escrita. Se o usuário pedir, explique por quê e ofereça a
lista de leitura acima no lugar.

## Nenhuma escrita no GitHub sem autorização

Abrir pull request, comentar, aprovar, fazer merge, criar ou fechar issue são ações que
ficam **visíveis para o time inteiro** e não podem partir de iniciativa do agente. Cada
uma exige que a pessoa peça, naquele momento.

Isso vale mesmo quando parece o passo óbvio seguinte: terminar uma implementação não
autoriza abrir o PR; terminar um review não autoriza publicar os comentários.

A regra é enforçada por hook (`gh-guard`), que escala a confirmação para o usuário
mesmo que o comando esteja no allowlist. O hook é a rede, não a regra — a regra é esta.

## Se precisar do `--repo`

Dentro de um repositório clonado o `--repo` é dispensável: o `gh` resolve pelo remote. Quando precisar apontar para outro repositório, use `--repo <dono>/<repositório>`. Em monorepo com submódulos, o mapa de pasta local para repositório costuma estar no `AGENTS.md` da raiz.


## Ao terminar

Confirme em uma linha o que ficou pronto e diga qual é o próximo passo: `/sdd-spec <número-do-card>`.
