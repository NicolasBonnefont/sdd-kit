#!/bin/sh
# Ponte da versão em bash. Instalação antiga registrou este caminho, e atualizar o clone
# com git pull não pode deixar o hook apontando para o nada. Rodar o instalador de novo
# troca o registro pelo .js e esta ponte deixa de ser usada.
command -v node >/dev/null 2>&1 || exit 0
exec node "${0%/*}/scope-guard.js"
