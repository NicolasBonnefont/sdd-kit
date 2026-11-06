#!/usr/bin/env bash
# Verificações estruturais de um change spec. Determinístico, sem modelo.
#
# Uso: validate.sh [diretorio-do-spec] [branch-base]
#
# Sem argumentos, resolve o spec pela branch atual e detecta a branch base.
# Sai 0 quando tudo passa, 1 quando há falha. Cada linha começa com OK, FALHA ou AVISO.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
lib="$here/../../../lib/lib.sh"
[ -f "$lib" ] || lib="$here/lib.sh"
# shellcheck source=/dev/null
[ -f "$lib" ] && . "$lib"

root=$(git rev-parse --show-toplevel 2>/dev/null || printf '.')

dir="${1:-}"
if [ -z "$dir" ] && command -v sdd_find_spec >/dev/null 2>&1; then
  branch=$(git branch --show-current 2>/dev/null)
  dir=$(sdd_find_spec "$root" "$branch") || true
fi

base="${2:-}"
if [ -z "$base" ]; then
  if command -v sdd_base_branch >/dev/null 2>&1; then base=$(sdd_base_branch "$root"); else base=master; fi
fi

[ -n "$dir" ] && [ -d "$dir" ] || {
  echo "FALHA  diretório de spec não encontrado${1:+: $1}"
  echo "       nenhum spec casa com a branch atual — rode /sdd-spec"
  exit 1
}

echo "AVISO  spec: $dir · branch base: $base"

spec="$dir/spec.md"
tasks="$dir/tasks.md"
fail=0

check() { # <status> <mensagem>
  if [ "$1" = "0" ]; then echo "OK     $2"; else echo "FALHA  $2"; fail=1; fi
}

# --- spec.md -----------------------------------------------------------------
if [ -f "$spec" ]; then
  echo "OK     spec.md presente"
  for section in "Comportamento atual" "Comportamento alvo" "Invariantes" "Fora de escopo" "Arquivos no escopo" "Critério de verificação"; do
    grep -qF "## $section" "$spec"; check $? "seção \"$section\""
  done

  for section in "Invariantes" "Arquivos no escopo"; do
    body=$(awk -v s="## $section" '$0==s{c=1;next} /^## /{c=0} c && NF' "$spec" | grep -c .)
    [ "${body:-0}" -gt 0 ]; check $? "seção \"$section\" não está vazia"
  done
else
  echo "FALHA  spec.md ausente em $dir"; fail=1
fi

# --- tasks.md ----------------------------------------------------------------
if [ -f "$tasks" ]; then
  echo "OK     tasks.md presente"
  total=$(grep -cE '^- \[[ x]\] ###' "$tasks" || true)
  [ "${total:-0}" -gt 0 ]; check $? "tasks.md declara ao menos uma task ($total)"

  for field in Consumes Produces Requisito Verificação; do
    n=$(grep -cE "^\s*\*\*$field:\*\*" "$tasks" || true)
    [ "${n:-0}" -ge "${total:-1}" ]; check $? "todas as $total tasks têm **$field:** (achei $n)"
  done

  done_n=$(grep -cE '^- \[x\] ###' "$tasks" || true)
  echo "AVISO  $done_n de $total tasks concluídas"
else
  echo "AVISO  tasks.md ausente — rode /sdd-execute para gerar"
fi

# --- escopo vs. diff real ----------------------------------------------------
if [ -f "$spec" ] && git rev-parse --git-dir >/dev/null 2>&1; then
  if command -v sdd_scope_patterns >/dev/null 2>&1; then
    mapfile -t patterns < <(sdd_scope_patterns "$spec")
  else
    mapfile -t patterns < <(awk '
      /^##[[:space:]]+Arquivos no escopo/ { c=1; next }
      /^##[[:space:]]/                    { c=0 }
      c && /^[[:space:]]*-[[:space:]]+/ {
        sub(/^[[:space:]]*-[[:space:]]+/, ""); gsub(/`/, ""); sub(/[[:space:]]+$/, "")
        if (length($0)) print
      }' "$spec")
  fi

  specs_rel="docs/specs"
  command -v sdd_specs_dir >/dev/null 2>&1 && specs_rel=$(sdd_specs_dir "$root")

  if [ "${#patterns[@]}" -gt 0 ]; then
    changed=$(git diff --name-only "$base"...HEAD 2>/dev/null || true)
    outside=0
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      case "$f" in "$specs_rel"/*|AGENTS.md|*/AGENTS.md) continue ;; esac
      hit=1
      for p in "${patterns[@]}"; do
        # shellcheck disable=SC2053
        [[ "$f" == $p ]] && { hit=0; break; }
      done
      [ "$hit" = "1" ] && { echo "FALHA  fora do escopo declarado: $f"; outside=1; }
    done <<< "$changed"
    [ "$outside" = "0" ]; check $? "todos os arquivos do diff estão no escopo"
  fi
fi

echo ""
[ "$fail" = "0" ] && echo "Estrutura válida." || echo "Estrutura inválida."
exit "$fail"
