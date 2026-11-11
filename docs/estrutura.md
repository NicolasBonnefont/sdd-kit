# Estrutura do repositório

```
skills/<nome>/SKILL.md       Portável — padrão Agent Skills, qualquer harness
skills/<nome>/scripts/       Verificações determinísticas invocadas pela skill
skills/<nome>/*-FORMAT.md    Gabaritos, carregados só quando a skill precisa deles
skills/<nome>/agents/        Adaptador por harness — hoje openai.yaml, para o Codex
agents/                      Portável — os três revisores como prompt. Claude Code os
                             carrega como subagentes; os demais leem como instrução
lib/lib.js                   Portável — configuração, detecção de branch base e
                             resolução de spec. Usado por hooks E por skills
hooks/                       Claude Code apenas — o protocolo de hooks é dele. Os .sh
                             são pontes para o .js, para quem instalou a versão em bash
install.js                   Instalador: interativo sem argumentos, direto com eles
bootstrap.sh                 Entrada por curl — clona e delega ao install.js
bin/cli.js                   Entrada por npx — clona e delega ao install.js
```

`lib/` não é opcional: o `sdd-validate` depende dele em qualquer harness. Só `hooks/`
é específico do Claude Code.

## Suíte

```bash
node tests/run.js
```

É o que o CI roda, em Linux e em Windows: sintaxe, shellcheck, frontmatter contra a spec
Agent Skills, acoplamento com produto, referência a comando inexistente e as baterias dos
hooks e do instalador.
Mudança em hook exige caso novo na bateria.
