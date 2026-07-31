# Harnesses suportados

O núcleo segue o padrão aberto [Agent Skills](https://agentskills.io). As mesmas skills
funcionam em qualquer produto que implemente o padrão.

## Destinos de instalação

| Harness | Destino por projeto | Destino global |
|---|---|---|
| `claude` | `.claude/skills/` | `~/.claude/skills/` |
| `cursor` | `.cursor/skills/` | `~/.cursor/skills/` |
| `antigravity` | `.agents/skills/` | `~/.gemini/config/skills/` |
| `copilot` | `.github/skills/` | — |

Para qualquer outro harness compatível: `install.sh --dir <caminho-de-skills>`.

## O que o Claude Code ganha a mais

Rodando `install.sh claude`, além das skills são instalados:

- **Subagentes** em `.claude/agents/` — os três revisores rodam em paralelo, cada um no
  próprio contexto, em vez de sequencialmente no mesmo
- **Hooks** em `.claude/settings.json` — três: formatação automática após cada edição,
  bloqueio de edição fora do escopo declarado no change spec, e confirmação obrigatória
  antes de qualquer escrita no GitHub

Nos demais harnesses o ciclo funciona igual; só essas automações não existem, e a skill
`sdd-review` já sabe operar sem elas.
