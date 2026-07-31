# Convenção de commits

O repositório segue [Conventional Commits](https://www.conventionalcommits.org).

```
<tipo>(<escopo opcional>): <descrição>
```

- **Tipo em inglês**, da lista fechada abaixo. **Descrição em português**, minúscula, no
  imperativo e sem ponto final.
- **Máximo de 100 caracteres** na primeira linha, escopo e tipo incluídos.
- Corpo e rodapé são livres. `BREAKING CHANGE:` no rodapé para quebra de compatibilidade.

| Tipo | Quando |
|---|---|
| `feat` | comportamento novo — skill, comando, flag |
| `fix` | correção de comportamento errado |
| `docs` | só documentação |
| `refactor` | mudança interna sem alterar comportamento |
| `test` | suíte e baterias de hook |
| `ci` | workflows do GitHub Actions |
| `build` | instalador, `package.json`, portas de entrada |
| `chore` | manutenção que não cabe nas outras |
| `perf`, `style`, `revert` | conforme o padrão |

Exemplos:

```
docs: enxuga o README e move a prosa para docs/
feat(sdd-review): aceita --severo para revisão mais rígida
fix(gh-guard): escala confirmação mesmo com comando no allowlist
```

## Ativando a validação local

Uma vez por clone:

```bash
npm install
git config core.hooksPath .githooks
```

O hook `.githooks/commit-msg` roda o commitlint antes de gravar o commit. Sem
`npm install` ele avisa e deixa passar — o CI é a rede de segurança.

**Não usamos husky de propósito.** O husky instala um script `prepare`, que o npm executa
também no `npx github:NicolasBonnefont/sdd-kit` do usuário final. A porta de instalação
deste projeto é bash e continua assim.

## No CI

O job `commits` do `.github/workflows/tests.yml` valida todos os commits do pull request
(`--from base --to head`) e o último commit em push na `main`. As regras vivem em
`commitlint.config.js`, que estende `@commitlint/config-conventional` e deixa o limite de
100 caracteres explícito.
