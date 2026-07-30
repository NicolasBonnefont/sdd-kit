#!/usr/bin/env bash
# Porta de entrada sem Node:
#
#   curl -fsSL https://raw.githubusercontent.com/NicolasBonnefont/sdd-kit/main/bootstrap.sh | bash
#
# Garante um clone em local estável e delega ao install.sh. O clone precisa ser
# estável porque as skills são instaladas por symlink.
set -euo pipefail

REPO="${SDD_KIT_REPO:-git@github.com:NicolasBonnefont/sdd-kit.git}"
HOME_DIR="${SDD_KIT_HOME:-$HOME/sdd-kit}"

command -v git >/dev/null 2>&1 || { echo "  git é necessário e não foi encontrado."; exit 1; }

if [ -f "$HOME_DIR/install.sh" ]; then
  git -C "$HOME_DIR" pull --ff-only --quiet 2>/dev/null \
    || echo "  Não consegui atualizar $HOME_DIR; seguindo com a versão local."
else
  echo "  Clonando $REPO"
  echo "  em $HOME_DIR"
  git clone --quiet "$REPO" "$HOME_DIR"
fi

exec "$HOME_DIR/install.sh" "$@"
