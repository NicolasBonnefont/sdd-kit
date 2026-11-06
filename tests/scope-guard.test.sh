#!/usr/bin/env bash
# Bateria do scope-guard. Direção de falha: na dúvida, LIBERA.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
HOOK="$ROOT/hooks/scope-guard.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0

decision() { # <json>
  local out
  out=$(printf '%s' "$1" | bash "$HOOK" 2>/dev/null)
  [ -z "$out" ] && { printf 'libera'; return; }
  printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecision // "libera"'
}

expect() { # <esperado> <rotulo> <json>
  local got; got=$(decision "$3")
  if [ "$got" = "$1" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    printf '  FALHOU  esperado %-6s obtido %-6s  %s\n' "$1" "$got" "$2"
  fi
}

ev() { jq -n --arg f "$1" --arg c "${2:-}" '{cwd:$c, tool_input:{file_path:$f}}'; }

# --- projeto com convenção numérica -------------------------------------------
A="$TMP/num"
mkdir -p "$A/docs/specs/915-auditoria" "$A/src"
git -C "$A" init -q -b master; git -C "$A" config user.email t@t; git -C "$A" config user.name t
printf '## Arquivos no escopo\n- src/**\n' > "$A/docs/specs/915-auditoria/spec.md"
echo x > "$A/src/a.ts"
git -C "$A" add -A >/dev/null; git -C "$A" commit -qm base
git -C "$A" checkout -q -b 915-auditoria-filtros

expect libera 'dentro do escopo'              "$(ev "$A/src/b.ts" "$A")"
expect deny   'fora do escopo'                "$(ev "$A/lib/c.ts" "$A")"
expect libera 'o proprio spec'                "$(ev "$A/docs/specs/915-auditoria/spec.md" "$A")"
# O /sdd-close atualiza o pack na branch do card, antes de arquivar o spec.
expect libera 'module pack fora do escopo'    "$(ev "$A/lib/AGENTS.md" "$A")"
expect libera 'agents da raiz fora do escopo' "$(ev "$A/AGENTS.md" "$A")"
expect deny   'nome que so termina em AGENTS' "$(ev "$A/lib/NOTAS-AGENTS.md" "$A")"
expect libera 'dir novo dentro do escopo'     "$(ev "$A/src/novo/sub/x.ts" "$A")"
expect deny   'dir novo fora do escopo'       "$(ev "$A/lib/novo/y.ts" "$A")"

# O cwd da sessão em OUTRO repositório não pode fazer o hook aplicar este spec.
B="$TMP/outro"; mkdir -p "$B/src"; git -C "$B" init -q
expect libera 'arquivo de outro repositorio' "$(ev "$B/src/z.ts" "$A")"

# --- projeto com convenção JIRA e .sdd.json -----------------------------------
C="$TMP/jira"
mkdir -p "$C/especificacoes/ABC-123-tela" "$C/app"
git -C "$C" init -q -b main; git -C "$C" config user.email t@t; git -C "$C" config user.name t
echo '{"specsDir":"especificacoes","baseBranch":"main"}' > "$C/.sdd.json"
printf '## Arquivos no escopo\n- app/**\n' > "$C/especificacoes/ABC-123-tela/spec.md"
echo x > "$C/app/a.py"
git -C "$C" add -A >/dev/null; git -C "$C" commit -qm base
git -C "$C" checkout -q -b feature/ABC-123-tela

expect libera 'branch JIRA, dentro do escopo' "$(ev "$C/app/b.py" "$C")"
expect deny   'branch JIRA, fora do escopo'   "$(ev "$C/outro/c.py" "$C")"
expect libera 'specsDir customizado'          "$(ev "$C/especificacoes/ABC-123-tela/spec.md" "$C")"

# --- ausência de contexto deve sempre liberar ---------------------------------
git -C "$A" checkout -q -b chore/sem-numero
expect libera 'branch sem correspondencia'    "$(ev "$A/lib/c.ts" "$A")"
git -C "$A" checkout -q 915-auditoria-filtros
rm -rf "$A/docs/specs"
expect libera 'spec ausente no disco'         "$(ev "$A/lib/c.ts" "$A")"
expect libera 'input vazio'                   '{}'
expect libera 'fora de repositorio git'       "$(ev "$TMP/solto.ts" "$TMP")"

printf '\n  %d passou, %d falhou\n' "$pass" "$fail"
[ "$fail" = "0" ]
