# Instalação

## As duas portas de entrada

```bash
npx github:NicolasBonnefont/sdd-kit
```

```bash
curl -fsSL https://raw.githubusercontent.com/NicolasBonnefont/sdd-kit/main/bootstrap.sh | bash
```

As duas fazem o mesmo: garantem um clone em `~/sdd-kit` e chamam o instalador. **Node
não é dependência do ferramental** — só do atalho `npx`.

O clone em local fixo é obrigatório, não conveniência: as skills são instaladas por
symlink, e apontar para o diretório temporário do `npx` deixaria tudo quebrado na
primeira limpeza de cache. Como efeito colateral bom, `npx` de novo atualiza tudo.

## Argumentos, para automação e CI

Com argumentos o instalador não pergunta nada:

```bash
~/sdd-kit/install.sh claude --global
~/sdd-kit/install.sh cursor /caminho/do/projeto
~/sdd-kit/install.sh --dir /caminho/de/skills
```

O instalador é idempotente e preserva configuração existente — rodar de novo não duplica
hook nem apaga o que já estava no `settings.json`.

> [!WARNING]
> Instalação por projeto cria symlinks com caminho absoluto, específicos da máquina.
> Não commite `.claude/skills/` no repositório — cada pessoa roda o instalador na dela.

## Preciso reinstalar depois de um `git pull`?

Na dúvida, pergunte ao próprio instalador:

```bash
~/sdd-kit/install.sh --check
```

As skills são instaladas por symlink, então **mudança de conteúdo vale na hora**, sem
reinstalar. O que exige reinstalação é mudança de estrutura: skill nova (falta o
symlink), hook novo (falta a entrada no `settings.json`) ou arquivo movido de lugar.
O `--check` diferencia os casos e diz o que fazer.

## Requisitos

**`jq`** — processador de JSON de linha de comando, obrigatório.

Os harnesses conversam com hooks por JSON: entregam o evento no stdin e leem a decisão
do stdout. O `jq` é quem extrai o caminho do arquivo do evento, monta a resposta de
bloqueio com escape correto, lê o `.sdd.json` e mescla os hooks no `settings.json` sem
sobrescrever a configuração que já existe. Fazer isso com `grep` e `sed` quebra no
primeiro caminho com espaço ou acento.

```bash
sudo apt install jq      # Debian, Ubuntu
sudo dnf install jq      # Fedora
brew install jq          # macOS
```

**`git`** e **`bash`** — já presentes em qualquer máquina de desenvolvimento.

**`gh`** — [GitHub CLI](https://cli.github.com/), instalado pelo `/sdd-connect`.
Necessário só para ler cards; o resto do ciclo funciona sem ele.
