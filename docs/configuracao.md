# Configuração e adaptação automática

## Resolvido sem configurar nada

O que muda de time para time e o ferramental descobre sozinho:

| Variação | Como é resolvida |
|---|---|
| Nome de branch | O spec é casado pelo nome do diretório. `915-auditoria`, `feat/ABC-123-tela` e `JIRA-456/ajuste` funcionam igual |
| Branch base | Detectada de `origin/HEAD`, com `main`/`master`/`develop` como fallback |
| Formatação | Detectada por linguagem: prettier, php-cs-fixer, pint, phpcbf, ruff, black, gofmt, rustfmt, rubocop, ktlint, sqlfluff |
| Ausência de testes | O ciclo declara isso em vez de fingir cobertura; `/sdd-execute` cai para caracterização ou verificação manual explícita |
| Modelo | Nenhum agente fixa modelo: todos herdam o da sessão. Alias de modelo é vocabulário de cada harness e muda com o tempo — quem quiser outro passa `--modelo` |

## Quando a convenção do time foge do padrão

Um `.sdd.json` na raiz do repositório sobrescreve. Todas as chaves são opcionais — não
crie o arquivo se os padrões servem:

```json
{
  "specsDir": "docs/specs",
  "baseBranch": "main",
  "formatCommand": "make fmt"
}
```

O `formatCommand` recebe o arquivo editado como último argumento, sem passar por shell, e
por isso recusa metacaractere. Nome com barra, como `scripts/fmt`, é caminho a partir da
raiz do repositório; sem barra, vem do PATH. Comando que não é encontrado gera um aviso e
a edição segue.

Formatar com o ferramental do projeto é executar código do projeto, pelo `formatCommand`
ou pelo prettier de `node_modules`. O hook roda em todo repositório aberto no agente, então
abrir um repositório desconhecido com ele instalado é confiar no que esse repositório traz.
