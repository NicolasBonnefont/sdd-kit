#!/bin/sh
# Ponte da versão em bash. Instalação antiga registrou este caminho, e atualizar o clone
# com git pull não pode deixar a guarda apontando para o nada. Rodar o instalador de novo
# troca o registro pelo .js e esta ponte deixa de ser usada.
command -v node >/dev/null 2>&1 && exec node "${0%/*}/gh-guard.js"

# Sem Node não há como avaliar o comando. Na dúvida, pergunta sempre que ele cita o gh.
input=
while IFS= read -r line || [ -n "$line" ]; do input="$input$line"; done
case "$input" in
  *[gG][hH]*)
    printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"O gh-guard precisa do Node, que não foi encontrado. Instale o Node e rode o instalador do sdd-kit de novo."}}'
    ;;
esac
