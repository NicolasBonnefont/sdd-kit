#!/usr/bin/env bash
# Instala as skills do sdd-kit no diretório que o harness escolhido espera.
#
# Sem argumentos e com terminal interativo, conduz por perguntas.
# Com argumentos, roda direto — é o modo usado em script e CI.
#
#   ./install.sh                              interativo
#   ./install.sh claude --global
#   ./install.sh cursor /caminho/do/projeto
#   ./install.sh --dir /caminho/de/skills
set -euo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
dim()  { printf '\033[2m%s\033[0m\n' "$1"; }

usage() {
  cat <<'EOF'
Uso: ./install.sh                            (interativo)
     ./install.sh <harness> [projeto]
     ./install.sh <harness> --global
     ./install.sh --dir <caminho-de-skills>

Harnesses e destinos:
  claude       <projeto>/.claude/skills        (global: ~/.claude/skills)
  cursor       <projeto>/.cursor/skills        (global: ~/.cursor/skills)
  antigravity  <projeto>/.agents/skills        (global: ~/.gemini/config/skills)
  copilot      <projeto>/.github/skills

Qualquer outro harness compatível com o padrão Agent Skills funciona com --dir.
EOF
  exit 1
}

require_jq() {
  command -v jq >/dev/null 2>&1 && return
  echo "Falta o jq, que é obrigatório (os hooks conversam por JSON)." >&2
  echo "  Debian/Ubuntu: sudo apt install jq" >&2
  echo "  Fedora:        sudo dnf install jq" >&2
  echo "  macOS:         brew install jq" >&2
  exit 1
}

# --- detecção -----------------------------------------------------------------

detect_harnesses() { # imprime "nome:onde-foi-visto" por linha, do mais provável ao menos
  local p="$PWD"
  [ -d "$p/.claude" ]        && echo "claude:.claude/ neste projeto"
  [ -d "$p/.cursor" ]        && echo "cursor:.cursor/ neste projeto"
  [ -d "$p/.agents" ]        && echo "antigravity:.agents/ neste projeto"
  [ -d "$p/.github/skills" ] && echo "copilot:.github/skills/ neste projeto"
  [ -d "$HOME/.claude" ]        && echo "claude:~/.claude/ na sua máquina"
  [ -d "$HOME/.cursor" ]        && echo "cursor:~/.cursor/ na sua máquina"
  [ -d "$HOME/.gemini" ]        && echo "antigravity:~/.gemini/ na sua máquina"
  command -v claude >/dev/null 2>&1 && echo "claude:CLI no PATH"
  command -v cursor >/dev/null 2>&1 && echo "cursor:CLI no PATH"
}

# --- modo interativo ----------------------------------------------------------

interactive() {
  local detected names name why line choice n i
  bold ""
  bold "  sdd-kit — ferramental de Spec-Driven Development"
  dim  "  ciclo: connect · init · pack · spec · execute · validate · review · pr · close"
  echo ""

  detected=$(detect_harnesses | awk -F: '!seen[$1]++')
  names=()
  i=0
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    name="${line%%:*}"; why="${line#*:}"
    i=$((i + 1)); names+=("$name")
    printf "  %d) %-12s %s\n" "$i" "$name" "$(printf '\033[2m— encontrado: %s\033[0m' "$why")"
  done <<< "$detected"

  for name in claude cursor antigravity copilot; do
    printf '%s\n' "${names[@]:-}" | grep -qx "$name" && continue
    i=$((i + 1)); names+=("$name")
    printf "  %d) %s\n" "$i" "$name"
  done

  echo ""
  read -r -p "  Onde instalar? [1] " choice < /dev/tty
  choice="${choice:-1}"
  n=$((choice))
  [ "$n" -ge 1 ] && [ "$n" -le "${#names[@]}" ] || { echo "  Opção inválida."; exit 1; }
  harness="${names[$((n - 1))]}"

  echo ""
  if [ "$harness" = "copilot" ]; then
    global=false
    dim "  O Copilot não tem escopo global; será instalado neste projeto."
  else
    echo "  1) Global — vale para todos os repositórios desta máquina (recomendado)"
    echo "  2) Só neste projeto — $PWD"
    echo ""
    read -r -p "  Escopo? [1] " choice < /dev/tty
    [ "${choice:-1}" = "2" ] && global=false || global=true
  fi
}

# --- argumentos ---------------------------------------------------------------

require_jq

# --- diagnóstico --------------------------------------------------------------

check() {
  local problems=0 found=0 dir name skill settings_file stale installed path registered

  bold ""
  bold "  sdd-kit — diagnóstico"
  dim  "  fonte: $SOURCE"
  echo ""

  for dir in "$HOME/.claude/skills" "$HOME/.cursor/skills" "$HOME/.gemini/config/skills" \
             "$PWD/.claude/skills" "$PWD/.cursor/skills" "$PWD/.agents/skills" "$PWD/.github/skills"; do
    [ -d "$dir" ] || continue

    # Symlink pendurado é o rastro que uma instalação anterior deixa quando a fonte
    # muda de nome ou de lugar. Reconhecer a sobra por isso, e não por prefixo de
    # nome, dispensa carregar o nome antigo aqui dentro para sempre.
    stale=$(find "$dir" -maxdepth 1 -type l ! -exec test -e {} \; -print 2>/dev/null)

    installed=0
    for skill in "$SOURCE"/skills/*/; do
      name=$(basename "$skill")
      if [ -e "$dir/$name" ] || [ -L "$dir/$name" ]; then installed=1; break; fi
    done
    [ "$installed" = "1" ] || [ -n "$stale" ] || continue
    found=1
    echo "  $dir"

    for skill in "$SOURCE"/skills/*/; do
      name=$(basename "$skill")
      if [ -L "$dir/$name" ] && [ ! -e "$dir/$name" ]; then
        echo "    quebrado   /$name  → $(readlink "$dir/$name")"; problems=$((problems + 1))
      elif [ ! -e "$dir/$name" ]; then
        echo "    faltando   /$name"; problems=$((problems + 1))
      fi
    done

    for path in $stale; do
      name=$(basename "$path")
      [ -d "$SOURCE/skills/$name" ] && continue
      echo "    obsoleto   /$name  → $(readlink "$path")"; problems=$((problems + 1))
    done
    echo ""
  done

  for settings_file in "$HOME/.claude/settings.json" "$PWD/.claude/settings.json"; do
    [ -f "$settings_file" ] || continue
    grep -q 'scope-guard\|gh-guard\|format\.sh' "$settings_file" 2>/dev/null || continue
    echo "  $settings_file"
    for name in scope-guard gh-guard format; do
      # Confere o caminho REGISTRADO, e não o do repositório: entrada que sobrou de
      # instalação anterior aponta para arquivo que já saiu do lugar, e é exatamente
      # esse caso que precisa aparecer aqui.
      registered=$(jq -r --arg n "$name" \
        '[.hooks // {} | to_entries[]?.value[]?.hooks[]?.command // empty]
         | map(select(test($n))) | first // empty' "$settings_file" 2>/dev/null)
      if [ -z "$registered" ]; then
        echo "    faltando   $name.sh"; problems=$((problems + 1))
      elif [ ! -x "${registered%% *}" ]; then
        echo "    quebrado   $name.sh  → $registered"; problems=$((problems + 1))
      else
        echo "    ok         $name.sh"
      fi
    done
    echo ""
  done

  [ "$found" = "1" ] || { echo "  Nenhuma instalação encontrada."; echo ""; exit 1; }

  if [ "$problems" = "0" ]; then
    bold "  Tudo em dia. Não precisa reinstalar."
  else
    bold "  $problems pendência(s). Rode o instalador de novo para resolver."
  fi
  echo ""
  exit $((problems > 0))
}

[ "${1:-}" = "--check" ] && check

harness=""
global=false
project="$PWD"
target=""

if [ $# -eq 0 ]; then
  # Lê do /dev/tty, não do stdin: assim o modo interativo funciona também em
  # `curl ... | bash`, onde o stdin carrega o próprio script.
  [ -e /dev/tty ] || usage
  interactive
else
  harness="$1"; shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --global) global=true ;;
      -h|--help) usage ;;
      *) project="$1" ;;
    esac
    shift
  done
fi

if [ "$harness" = "--dir" ]; then
  target="$project"
else
  case "$harness" in
    claude)      $global && target="$HOME/.claude/skills"        || target="$project/.claude/skills" ;;
    cursor)      $global && target="$HOME/.cursor/skills"        || target="$project/.cursor/skills" ;;
    antigravity) $global && target="$HOME/.gemini/config/skills" || target="$project/.agents/skills" ;;
    copilot)     $global && { echo "copilot não tem escopo global; use por projeto"; exit 1; }
                 target="$project/.github/skills" ;;
    -h|--help)   usage ;;
    *)           echo "Harness desconhecido: $harness"; usage ;;
  esac
fi

# --- instalação ---------------------------------------------------------------

mkdir -p "$target"

echo ""

# Symlink pendurado no destino é sobra de instalação anterior cuja fonte mudou de nome
# ou de lugar. Remover é seguro — já não aponta para nada — e é o que faz o rename de
# uma skill não deixar rastro. Só o que está quebrado sai; skill de outra ferramenta
# que funciona fica onde está.
while IFS= read -r path; do
  [ -n "$path" ] || continue
  echo "  removido  /$(basename "$path")  → $(readlink "$path")"
  rm -f "$path"
done <<< "$(find "$target" -maxdepth 1 -type l ! -exec test -e {} \; -print 2>/dev/null)"

for skill in "$SOURCE"/skills/*/; do
  name=$(basename "$skill")
  dest="$target/$name"
  rm -rf "$dest"
  ln -s "$skill" "$dest" 2>/dev/null || cp -r "$skill" "$dest"
  echo "  /$name"
done

echo ""
echo "  Skills instaladas em $target"

# Claude Code é o único harness que consome subagentes e hooks no formato deste repo.
# Nos demais, os revisores de agents/ são lidos pela própria skill sdd-review.
if [ "$harness" = "claude" ]; then
  $global && base="$HOME/.claude" || base="$project/.claude"
  agents_dir="$base/agents"
  mkdir -p "$agents_dir"
  for agent in "$SOURCE"/agents/*.md; do
    dest="$agents_dir/$(basename "$agent")"
    rm -f "$dest"
    ln -s "$agent" "$dest" 2>/dev/null || cp "$agent" "$dest"
  done
  echo "  Revisores instalados em $agents_dir"

  settings="$base/settings.json"
  [ -f "$settings" ] || echo '{}' > "$settings"

  # Entrada substituível é a que aponta para dentro desta fonte, ou para um arquivo
  # que não existe mais — sobra de instalação anterior. Casar por nome de script
  # apagaria a entrada de outra ferramenta que use o mesmo basename.
  stale=$(jq -r '[.hooks // {} | to_entries[]?.value[]?.hooks[]?.command // empty] | .[]' "$settings" 2>/dev/null \
          | while IFS= read -r cmd; do [ -e "${cmd%% *}" ] || printf '%s\n' "$cmd"; done \
          | jq -R . | jq -sc .)
  [ -n "$stale" ] || stale='[]'

  tmp=$(mktemp)
  jq --arg guard "$SOURCE/hooks/scope-guard.sh" \
     --arg gh "$SOURCE/hooks/gh-guard.sh" \
     --arg format "$SOURCE/hooks/format.sh" \
     --arg src "$SOURCE/" \
     --argjson stale "$stale" '
    def substituivel: (. // "") | (startswith($src) or (($stale | index(.)) != null));
    .hooks.PreToolUse  = ((.hooks.PreToolUse  // [])
       | map(select((.hooks[0].command // "") | substituivel | not))
       + [{matcher: "Write|Edit", hooks: [{type: "command", command: $guard}]},
          {matcher: "Bash",       hooks: [{type: "command", command: $gh}]}])
    | .hooks.PostToolUse = ((.hooks.PostToolUse // [])
       | map(select((.hooks[0].command // "") | substituivel | not))
       + [{matcher: "Write|Edit", hooks: [{type: "command", command: $format}]}])
  ' "$settings" > "$tmp" && mv "$tmp" "$settings"

  echo "  Hooks registrados em $settings"
fi

echo ""
bold "  Pronto."
dim  "  Próximo passo: /sdd-connect (uma vez por máquina), depois /sdd-init no seu repositório."
echo ""
