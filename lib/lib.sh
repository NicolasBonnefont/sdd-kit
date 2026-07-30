#!/usr/bin/env bash
# Funções compartilhadas pelos hooks e pelo validador.
#
# Configuração por projeto é opcional. Um `.sdd.json` na raiz do repositório pode
# sobrescrever os padrões:
#
#   { "specsDir": "docs/specs", "baseBranch": "main", "formatCommand": "make fmt" }
#
# Sem o arquivo, tudo funciona por detecção.

sdd_config() { # <raiz> <chave> <padrão>
  local root="$1" key="$2" fallback="$3" value
  if [ -f "$root/.sdd.json" ]; then
    value=$(jq -r --arg k "$key" '.[$k] // empty' "$root/.sdd.json" 2>/dev/null)
    [ -n "$value" ] && { printf '%s' "$value"; return; }
  fi
  printf '%s' "$fallback"
}

sdd_specs_dir() { # <raiz>
  sdd_config "$1" specsDir "docs/specs"
}

sdd_base_branch() { # <raiz>
  local root="$1" configured detected
  configured=$(sdd_config "$root" baseBranch "")
  [ -n "$configured" ] && { printf '%s' "$configured"; return; }

  detected=$(git -C "$root" symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null)
  [ -n "$detected" ] && { printf '%s' "${detected#refs/remotes/origin/}"; return; }

  for candidate in main master develop; do
    git -C "$root" show-ref --verify --quiet "refs/heads/$candidate" && { printf '%s' "$candidate"; return; }
  done
  printf 'master'
}

# Acha o diretório de spec correspondente à branch atual, sem exigir convenção de
# nome. Casa quando o nome do diretório aparece na branch, ou quando o primeiro
# token do nome (o identificador do card) aparece nela.
#
# Cobre 915-auditoria-filtros, feat/ABC-123-coisa, JIRA-456/ajuste e afins.
sdd_find_spec() { # <raiz> <branch>
  local root="$1" branch="$2" specs dir name token
  specs="$root/$(sdd_specs_dir "$root")"
  [ -d "$specs" ] || return 1
  [ -n "$branch" ] || return 1

  for dir in "$specs"/*/; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    if [[ "$branch" == *"$name"* ]]; then
      printf '%s' "${dir%/}"; return 0
    fi
  done

  for dir in "$specs"/*/; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    token="${name%%-*}"
    [ -n "$token" ] && [ "$token" != "$name" ] || continue
    if [[ "$branch" =~ (^|[^A-Za-z0-9])"$token"([^A-Za-z0-9]|$) ]]; then
      printf '%s' "${dir%/}"; return 0
    fi
  done

  return 1
}

# Lê os globs da seção "Arquivos no escopo" de um spec.
sdd_scope_patterns() { # <caminho-do-spec.md>
  awk '
    /^##[[:space:]]+Arquivos no escopo/ { c=1; next }
    /^##[[:space:]]/                    { c=0 }
    c && /^[[:space:]]*-[[:space:]]+/ {
      sub(/^[[:space:]]*-[[:space:]]+/, ""); gsub(/`/, ""); sub(/[[:space:]]+$/, "")
      if (length($0)) print
    }' "$1"
}
