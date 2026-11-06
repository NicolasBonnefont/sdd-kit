#!/usr/bin/env bash
# PreToolUse: impede que a edição saia dos "Arquivos no escopo" declarados no change spec.
#
# Só age quando existe um spec correspondente à branch atual. Em qualquer situação
# ambígua ele libera — hook que bloqueia trabalho legítimo é desinstalado na primeira
# semana e leva o resto do ferramental junto.
set -uo pipefail

# shellcheck source=../lib/lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/../lib/lib.sh"

allow() { exit 0; }

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

[ -z "$file" ] && allow

# O diretório do arquivo pode ainda não existir (criação de arquivo novo em pasta nova).
# Sobe pelo caminho DO ARQUIVO até achar um ancestral existente — nunca pelo cwd da
# sessão, que pode estar em outro repositório e faria o hook aplicar o spec errado.
dir=$(dirname "$file")
while [ ! -d "$dir" ] && [ "$dir" != "/" ] && [ "$dir" != "." ]; do
  dir=$(dirname "$dir")
done

root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || allow

# Se o arquivo não está sob a raiz encontrada, não é assunto deste repositório.
case "$file" in
  "$root"/*) ;;
  *) allow ;;
esac

branch=$(git -C "$root" branch --show-current 2>/dev/null) || allow
spec_dir=$(sdd_find_spec "$root" "$branch") || allow
spec="$spec_dir/spec.md"
[ -f "$spec" ] || allow

rel="${file#"$root"/}"
specs_rel=$(sdd_specs_dir "$root")

# Spec e Module Pack são artefatos do ciclo, não código da mudança: o /sdd-close atualiza
# o pack nesta mesma branch, e o escopo do card não tem por que listá-lo.
case "$rel" in
  "$specs_rel"/*|AGENTS.md|*/AGENTS.md) allow ;;
esac

patterns=$(sdd_scope_patterns "$spec")
[ -z "$patterns" ] && allow

while IFS= read -r pattern; do
  [ -z "$pattern" ] && continue
  # shellcheck disable=SC2053
  [[ "$rel" == $pattern ]] && allow
done <<< "$patterns"

jq -n --arg rel "$rel" --arg spec "${spec#"$root"/}" '
{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: (
      "Fora do escopo declarado no change spec.\n\n" +
      "Arquivo: " + $rel + "\n" +
      "Spec: " + $spec + "\n\n" +
      "Se a mudança realmente precisa deste arquivo, pare e peça ao usuário para " +
      "adicioná-lo à seção \"Arquivos no escopo\" do spec. Expandir o escopo sem " +
      "registrar é a origem mais comum de regressão."
    )
  }
}'

exit 0
