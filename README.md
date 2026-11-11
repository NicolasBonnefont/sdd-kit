# sdd-kit

Ferramental de Spec-Driven Development para agentes de código.

Serve **qualquer projeto de qualquer time**, em qualquer linguagem. O ferramental não
conhece nenhum produto: todo fato — stack, comandos, fronteiras, convenções — vem do
`AGENTS.md` do próprio repositório, que o `/sdd-init` escreve.

Não depende de editor nem de modelo. O núcleo segue o padrão aberto
[Agent Skills](https://agentskills.io), então as mesmas skills funcionam no Claude Code,
Cursor, Antigravity, Copilot, Codex, Gemini CLI, Kiro, Junie e nos demais produtos que
implementam o padrão.

## Instalação

Requer **Git** e **Node 18 ou superior**, em Linux, macOS ou Windows. Bash e `jq` não são
necessários. Um comando detecta os harnesses que você já usa, pergunta onde instalar e
resolve o resto.

### Linux e macOS

```bash
npx github:NicolasBonnefont/sdd-kit
```

Também dá para entrar por `curl`, que exige os mesmos Git e Node:

```bash
curl -fsSL https://raw.githubusercontent.com/NicolasBonnefont/sdd-kit/main/bootstrap.sh | bash
```

### Windows (cmd ou PowerShell)

Funciona direto no terminal do Windows, sem WSL e sem Git Bash.

1. Instale o Git e o Node, se ainda não tiver:

   ```powershell
   winget install --id Git.Git
   winget install --id OpenJS.NodeJS.LTS
   ```

2. **Feche e abra o terminal**, para ele enxergar os programas novos, e confira:

   ```powershell
   git --version
   node --version
   ```

3. Rode o instalador:

   ```powershell
   npx github:NicolasBonnefont/sdd-kit
   ```

   Se o PowerShell recusar com `a execução de scripts foi desabilitada`, use `npx.cmd` no
   lugar de `npx`. No cmd esse erro não acontece.

4. Confira a instalação:

   ```powershell
   npx github:NicolasBonnefont/sdd-kit --check
   ```

5. Abra o agente no seu projeto e rode `/sdd-connect`, que instala o `gh` e conecta ao
   GitHub.

Sem o `npx`, o mesmo resultado sai de um clone manual. No PowerShell:

```powershell
git clone https://github.com/NicolasBonnefont/sdd-kit.git "$HOME\sdd-kit"
node "$HOME\sdd-kit\install.js"
```

No cmd, troque `$HOME` por `%USERPROFILE%`.

### WSL (Linux dentro do Windows)

**O WSL é outro sistema.** Ele tem pasta pessoal, Git, Node, `gh` e agente próprios, e a
instalação feita no Windows não vale lá dentro, nem a do WSL vale no Windows. A regra é
instalar onde o agente roda: se você abre o agente pelo terminal do WSL, ou pelo VS Code
conectado ao WSL, siga estes passos dentro do WSL.

1. Abra o terminal do WSL e confira se o Node é o do Linux:

   ```bash
   which node
   ```

   Se o caminho começar com `/mnt/c/`, ou se não aparecer nada, esse é o Node do Windows
   ou nenhum. Instale o Node dentro do WSL, por exemplo com o
   [nvm](https://github.com/nvm-sh/nvm).

2. Instale como no Linux:

   ```bash
   npx github:NicolasBonnefont/sdd-kit
   ```

3. Rode `/sdd-connect` dentro do WSL. A autenticação do `gh` também é separada.

Mantenha os projetos no disco do Linux (`~/projetos`), e não em `/mnt/c/`. O acesso ao disco
do Windows é bem mais lento, e cada arquivo que o agente edita passa por ali.

Usa os dois ambientes? Instale nos dois, cada um com o próprio clone. Compartilhar o clone
ou o `.claude` por `/mnt/c/` quebra os hooks, porque o caminho registrado em um sistema não
existe no outro.

### Depois de instalar

Todas as portas garantem um clone em `~/sdd-kit` e chamam o instalador. Rodar o mesmo
comando de novo atualiza tudo. Argumentos para automação e diagnóstico estão em
[docs/instalacao.md](./docs/instalacao.md).

## O ciclo

| Comando | Frequência | O que faz |
|---|---|---|
| `/sdd-help` | quando esquecer | Mapa dos comandos: diz qual usar na sua situação |
| `/sdd-connect` | uma vez por máquina | Conecta ao GitHub via `gh` para ler cards |
| `/sdd-init` | uma vez por repositório | Inspeciona o projeto e escreve o `AGENTS.md` da raiz |
| `/sdd-pack` | por módulo | Escreve o Module Pack: invariantes, blast radius, armadilhas |
| `/sdd-spec <card>` | por card | Lê o card, alinha por entrevista o que estiver vago, escreve o change spec e manda os três revisores revisarem antes do gate humano |
| `/sdd-execute` | por card | Decompõe em `tasks.md` e implementa em loop TDD |
| `/sdd-validate` | quando quiser | Confere spec ↔ tasks ↔ diff |
| `/sdd-review` | antes do push | Revisa sob três perspectivas, cada uma na própria seção |
| `/sdd-pr` | por card | Monta a descrição do PR a partir dos artefatos e abre após autorização |
| `/sdd-close` | antes do code review | Devolve o aprendizado ao Module Pack e arquiva o spec |

Time novo: `/sdd-connect` → `/sdd-init` → `/sdd-pack` no módulo de maior movimento → e
daí em diante o ciclo por card.

## Nada sai para fora sem você autorizar

O ciclo **lê** do GitHub por conta própria — issue, comentários, diff de PR. **Escrever
é outra história.** Abrir pull request, comentar, aprovar, fazer merge, criar ou fechar
issue são ações visíveis para o time inteiro, e nenhuma delas acontece por iniciativa do
agente.

A regra está escrita nas skills e enforçada pelo hook `gh-guard`, que escala a confirmação
para você **mesmo que o comando esteja no allowlist de permissões**.

O mesmo hook escala a leitura que devolve credencial — valor de variável de CI, chave,
token. Ler segredo é leitura, mas não é rotina, e o material que o agente carrega tem
fronteira própria.

## Documentação

Sem site de docs por enquanto — tudo vive em [docs/](./docs).

- [Instalação, argumentos e reinstalação](./docs/instalacao.md)
- [Harnesses suportados e o que cada um ganha](./docs/harnesses.md)
- [O ciclo por card e seus artefatos](./docs/ciclo.md)
- [Configuração e adaptação automática](./docs/configuracao.md)
- [A guarda de escrita no GitHub](./docs/guarda-gh.md)
- [Convenção de commits](./docs/commits.md)

## Contribuindo

```bash
node tests/run.js
```

É o que o CI roda, em Linux e em Windows: sintaxe, shellcheck, frontmatter contra a spec
Agent Skills, acoplamento com produto, referência a comando inexistente e as baterias dos
hooks e do instalador. Mudança em hook exige caso novo na bateria.

Commits seguem [Conventional Commits](https://www.conventionalcommits.org), com no
máximo 100 caracteres na primeira linha. Para validar antes de commitar:

```bash
npm install
git config core.hooksPath .githooks
```

Detalhes e lista de tipos em [docs/commits.md](./docs/commits.md).

Mexendo no ferramental? Comece por [docs/estrutura.md](./docs/estrutura.md).
