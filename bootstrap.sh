#!/usr/bin/env bash
# Porta de entrada por curl, para Linux, macOS e WSL. No cmd e no PowerShell a porta é o
# npx, descrito no README.
#
#   curl -fsSL https://raw.githubusercontent.com/NicolasBonnefont/sdd-kit/main/bootstrap.sh | bash
#
# Garante um clone em local estável e delega ao install.js. O clone precisa ser
# estável porque as skills são instaladas por link.
set -euo pipefail

REPO="${SDD_KIT_REPO:-https://github.com/NicolasBonnefont/sdd-kit.git}"
HOME_DIR="${SDD_KIT_HOME:-$HOME/sdd-kit}"

command -v git >/dev/null 2>&1 || { echo "  git é necessário e não foi encontrado."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "  Node 18 ou superior é necessário e não foi encontrado."; exit 1; }

if [ -d "$HOME_DIR/.git" ]; then
  git -C "$HOME_DIR" pull --ff-only --quiet 2>/dev/null \
    || echo "  Não consegui atualizar $HOME_DIR; seguindo com a versão local."
else
  echo "  Clonando $REPO"
  echo "  em $HOME_DIR"
  git clone --quiet "$REPO" "$HOME_DIR"
fi

exec node "$HOME_DIR/install.js" "$@"
