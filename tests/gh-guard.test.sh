#!/usr/bin/env bash
# Bateria do gh-guard. Direção de falha: na dúvida, PERGUNTA.
set -uo pipefail

HOOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)/hooks/gh-guard.sh"
pass=0; fail=0

# Liberar é ausência de saída, não um JSON dizendo "allow" — por isso o vazio
# precisa ser traduzido aqui, e não com um `// "libera"` dentro do jq.
decision() { # <stdin do hook>
  local out
  out=$(printf '%s' "$1" | bash "$HOOK" 2>/dev/null)
  [ -z "$out" ] && { printf 'libera'; return; }
  printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecision // "libera"'
}

expect() { # <esperado> <comando>
  local got; got=$(decision "$(jq -n --arg c "$2" '{tool_input:{command:$c}}')")
  if [ "$got" = "$1" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    printf '  FALHOU  esperado %-6s obtido %-6s  %s\n' "$1" "$got" "$2"
  fi
}

expect_raw() { # <esperado> <stdin bruto> <rótulo>
  local got; got=$(decision "$2")
  if [ "$got" = "$1" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    printf '  FALHOU  esperado %-6s obtido %-6s  %s\n' "$1" "$got" "$3"
  fi
}

# --- leitura: deve liberar ----------------------------------------------------
expect libera 'gh --version'
expect libera 'gh --help'
expect libera 'gh help'
expect libera 'gh version'
expect libera 'gh auth status'
expect libera 'gh auth login'
expect libera 'gh auth switch --user alguem'
expect libera 'gh pr view 42'
expect libera 'gh pr list --state open'
expect libera 'gh pr diff 42'
expect libera 'gh pr checks 42'
expect libera 'gh pr status'
expect libera 'gh pr checkout 42'
expect libera 'gh issue view 915 --comments'
expect libera 'gh issue list --limit 1'
expect libera 'gh issue status'
expect libera 'gh repo view'
expect libera 'gh repo list org'
expect libera 'gh repo clone org/repo'
expect libera 'gh release view v1.0.0'
expect libera 'gh release list'
expect libera 'gh release download v1.0.0'
expect libera 'gh run view 12345'
expect libera 'gh run list --limit 5'
expect libera 'gh run watch 12345'
expect libera 'gh run download 12345'
expect libera 'gh workflow view ci.yml'
expect libera 'gh workflow list'
expect libera 'gh search issues bug'
expect libera 'gh search prs --author eu'
expect libera 'gh search repos spec-driven'
expect libera 'gh search code needle'
expect libera 'gh label list'
expect libera 'gh secret list'
expect libera 'gh variable list'
expect libera 'gh cache list'
expect libera 'gh gist view abc123'
expect libera 'gh gist list'
expect libera 'gh browse'
expect libera 'gh api repos/o/r/issues'
expect libera 'gh api -X GET repos/o/r/issues'
expect libera 'gh api repos/o/r/pulls --paginate --jq ".[].number"'

# Cadeia inteiramente de leitura continua liberada — o guard não é um pedágio.
expect libera 'gh pr view 1 && gh pr view 2'
expect libera 'gh pr list | grep open'
expect libera 'gh issue list ; gh pr status'

# Sem gh nenhum: não é assunto deste hook.
expect libera 'npm test'
expect libera 'git log --oneline'
expect libera 'echo ghost'
expect libera 'cat highlight.txt'

# --- escrita direta: deve perguntar -------------------------------------------
expect ask 'gh pr create --fill'
expect ask 'gh pr comment 42 --body "comentario"'
expect ask 'gh pr review 42 --approve'
expect ask 'gh pr merge 42 --squash'
expect ask 'gh pr close 42'
expect ask 'gh pr reopen 42'
expect ask 'gh pr edit 42 --title x'
expect ask 'gh pr ready 42'
expect ask 'gh issue create --title x'
expect ask 'gh issue comment 915 --body "texto"'
expect ask 'gh issue close 9'
expect ask 'gh issue reopen 9'
expect ask 'gh issue edit 9 --add-label bug'
expect ask 'gh issue pin 9'
expect ask 'gh issue transfer 9 org/outro'
expect ask 'gh issue delete 9'
expect ask 'gh release create v1.0.0'
expect ask 'gh release delete v1.0.0'
expect ask 'gh release edit v1.0.0 --title x'
expect ask 'gh release upload v1.0.0 dist.zip'
expect ask 'gh repo create org/novo --private'
expect ask 'gh repo delete org/repo'
expect ask 'gh repo edit --description x'
expect ask 'gh repo fork org/repo'
expect ask 'gh repo archive org/repo'
expect ask 'gh workflow run ci.yml'
expect ask 'gh workflow enable ci.yml'
expect ask 'gh workflow disable ci.yml'
expect ask 'gh run rerun 12345'
expect ask 'gh run cancel 12345'
expect ask 'gh secret set TOKEN'
expect ask 'gh secret delete TOKEN'
expect ask 'gh variable set NIVEL'
expect ask 'gh variable delete NIVEL'
expect ask 'gh label create bug'
expect ask 'gh label delete bug'
expect ask 'gh label edit bug --color ff0000'
expect ask 'gh gist create notas.md'
expect ask 'gh gist delete abc123'
expect ask 'gh gist edit abc123'

# --- gh api: método explícito -------------------------------------------------
expect ask 'gh api -X POST repos/o/r/issues'
expect ask 'gh api -XPOST repos/o/r/issues'
expect ask 'gh api --method DELETE repos/o/r/issues/1'
expect ask 'gh api --method=PATCH repos/o/r/issues/1'
expect ask 'gh api --method PUT repos/o/r/issues/1/lock'

# --- gh api com campo: POST implícito, sem -X nenhum --------------------------
# Campo presente muda o método: o gh promove a chamada a POST sem nenhum -X.
expect ask 'gh api repos/o/r/issues -f title=x'
expect ask 'gh api repos/o/r/issues -F body=@corpo.md'
expect ask 'gh api repos/o/r/issues --field title=x'
expect ask 'gh api repos/o/r/issues --raw-field body=texto'

# --- o bypass que a revisão externa encontrou --------------------------------
# Cadeia que COMEÇA com leitura e termina em escrita. Passava antes da correção,
# porque a regex de leitura estava ancorada no início e avaliava a string inteira.
expect ask 'gh pr view 1 && gh pr create'
expect ask 'gh pr list; gh issue close 3'
expect ask 'gh pr view 1 | gh pr comment'
expect ask 'gh pr diff 1 || gh pr close 1'
expect ask 'gh issue list ; gh issue close 9'
expect ask 'gh auth status && gh pr merge 42'
expect ask 'npm test && gh pr create'
expect ask 'echo oi | gh pr comment 42 --body-file -'
expect ask 'X=$(gh pr create --fill)'
expect ask 'echo `gh pr review 1 --approve`'
expect ask 'gh api repos/o/r/issues && gh api -X POST repos/o/r/issues'
expect ask 'gh api repos/o/r/issues && gh api repos/o/r/issues -f title=x'

# --- entrada degenerada: nada a decidir ---------------------------------------
expect_raw libera ''                     'stdin vazio'
expect_raw libera '{}'                   'JSON sem tool_input'
expect_raw libera '{"tool_input":{}}'    'tool_input sem command'
expect_raw libera '{"tool_input":{"command":""}}' 'command vazio'
expect_raw libera 'isto nao e json'      'stdin que nao e JSON'

printf '\n  %d passou, %d falhou\n' "$pass" "$fail"
[ "$fail" = "0" ]
