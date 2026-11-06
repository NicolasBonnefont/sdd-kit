# Instalação

O passo a passo por sistema — Linux, macOS, Windows e WSL — está no
[README](../README.md#instalação). Aqui fica o que vale para todos.

## As portas de entrada

```bash
npx github:NicolasBonnefont/sdd-kit
```

```bash
curl -fsSL https://raw.githubusercontent.com/NicolasBonnefont/sdd-kit/main/bootstrap.sh | bash
```

A primeira funciona em qualquer terminal; a segunda é para Linux, macOS e WSL. As duas
fazem o mesmo: garantem um clone em `~/sdd-kit` e chamam o instalador.

O clone em local fixo é obrigatório, não conveniência: as skills são instaladas por link,
e apontar para o diretório temporário do `npx` deixaria tudo quebrado na primeira limpeza
de cache. Como efeito colateral bom, `npx` de novo atualiza tudo.

## Argumentos, para automação e CI

Com argumentos o instalador não pergunta nada. No Windows, troque `~` por `$HOME` no
PowerShell ou por `%USERPROFILE%` no cmd:

```bash
node ~/sdd-kit/install.js claude --global
node ~/sdd-kit/install.js cursor /caminho/do/projeto
node ~/sdd-kit/install.js --dir /caminho/de/skills
```

O instalador é idempotente e preserva configuração existente — rodar de novo não duplica
hook nem apaga o que já estava no `settings.json`.

> [!WARNING]
> Instalação por projeto cria links com caminho absoluto, específicos da máquina.
> Não commite `.claude/skills/` no repositório — cada pessoa roda o instalador na dela.

## Preciso reinstalar depois de um `git pull`?

Na dúvida, pergunte ao próprio instalador:

```bash
node ~/sdd-kit/install.js --check
```

As skills são instaladas por link, então **mudança de conteúdo vale na hora**, sem
reinstalar. O que exige reinstalação é mudança de estrutura: skill nova (falta o
link), hook novo (falta a entrada no `settings.json`) ou arquivo movido de lugar.
O `--check` diferencia os casos e diz o que fazer.

## Requisitos

**`git`** — o ciclo inteiro lê a branch e o diff por ele.

**Node 18 ou superior** — hooks, validador e instalador são Node, porque é o que roda igual
no sh, no cmd e no PowerShell. O hook é chamado como `node`, então o Node precisa estar no
PATH do ambiente em que o agente roda.

**`gh`** — [GitHub CLI](https://cli.github.com/), instalado pelo `/sdd-connect`.
Necessário só para ler cards; o resto do ciclo funciona sem ele.

## Links no Windows

As skills são instaladas por junction, o link de diretório que o Windows cria sem permissão
de administrador, então elas se comportam como o symlink dos outros sistemas: `git pull` no
clone vale na hora.

Os três revisores são arquivos, e link de arquivo exige modo de desenvolvedor. Sem ele o
instalador copia. O efeito é um só: revisor alterado no clone só chega à instalação rodando
o instalador de novo.

## Windows e WSL são instalações separadas

O WSL tem pasta pessoal, Node e agente próprios. Cada lado precisa do próprio clone e da
própria instalação, e o `settings.json` registra caminho absoluto, então ele não atravessa de
um sistema para o outro. O [README](../README.md#wsl-linux-dentro-do-windows) tem os passos.
