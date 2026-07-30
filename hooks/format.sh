#!/usr/bin/env bash
# PostToolUse: formata o arquivo recém-editado com o formatador do próprio projeto.
#
# Detecta a ferramenta pela linguagem e só usa o que já está instalado no repositório
# ou no PATH. Falha sempre em silêncio — formatação nunca deve interromper o trabalho.
#
# Para sobrescrever a detecção, declare em `.sdd.json` na raiz:
#   { "formatCommand": "make fmt --" }
# O caminho do arquivo é acrescentado ao final do comando.
set -uo pipefail

# shellcheck source=../lib/lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/../lib/lib.sh"

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0

custom=$(sdd_config "$root" formatCommand "")
if [ -n "$custom" ]; then
  # O .sdd.json é versionado no repositório clonado, então este valor é entrada não
  # confiável executada num PostToolUse. Duas restrições fecham o caminho óbvio de
  # injeção sem impedir os casos reais (`make fmt`, `npx prettier --write`):
  #   1. nada de metacaractere de shell
  #   2. o primeiro token tem de resolver para um executável
  if printf '%s' "$custom" | grep -qE '[;&|`$><()]|\$\(' ; then
    echo "sdd: formatCommand com metacaractere de shell foi ignorado: $custom" >&2
    exit 0
  fi
  # shellcheck disable=SC2086
  set -- $custom
  command -v "$1" >/dev/null 2>&1 || exit 0
  "$@" "$file" >/dev/null 2>&1
  exit 0
fi

run() { command -v "$1" >/dev/null 2>&1 && { "$@" >/dev/null 2>&1; exit 0; }; }

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.css|*.scss|*.less|*.html|*.vue|*.svelte|*.yml|*.yaml|*.md)
    local_prettier="$root/node_modules/.bin/prettier"
    [ -x "$local_prettier" ] && { "$local_prettier" --write --log-level silent "$file" >/dev/null 2>&1; exit 0; }
    run prettier --write --log-level silent "$file"
    ;;
  *.php)
    local_fixer="$root/vendor/bin/php-cs-fixer"
    [ -x "$local_fixer" ] && { "$local_fixer" fix "$file" >/dev/null 2>&1; exit 0; }
    local_pint="$root/vendor/bin/pint"
    [ -x "$local_pint" ] && { "$local_pint" "$file" >/dev/null 2>&1; exit 0; }
    local_phpcbf="$root/vendor/bin/phpcbf"
    [ -x "$local_phpcbf" ] && { "$local_phpcbf" "$file" >/dev/null 2>&1; exit 0; }
    ;;
  *.py)
    run ruff format "$file"
    run black --quiet "$file"
    ;;
  *.go)
    run gofmt -w "$file"
    ;;
  *.rs)
    run rustfmt --quiet "$file"
    ;;
  *.rb)
    run rubocop --autocorrect --format quiet "$file"
    ;;
  *.java|*.kt)
    run ktlint --format "$file"
    ;;
  *.sql)
    run sqlfluff fix --disable-progress-bar "$file"
    ;;
esac

exit 0
