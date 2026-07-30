#!/usr/bin/env bash
# PreToolUse (Bash): nenhuma operação de escrita no GitHub acontece sem autorização
# explícita de quem está usando.
#
# Abrir pull request, comentar, revisar, fazer merge, criar ou fechar issue são ações
# que aparecem para o time inteiro e não podem ser tomadas por iniciativa do agente.
#
# Diferente do scope-guard, aqui a ambiguidade resolve para PERGUNTAR, não para liberar:
# o custo de um comentário indevido num PR é maior que o de uma confirmação a mais.
#
# Devolve "ask", que força a confirmação mesmo quando o comando está no allowlist —
# é isso que impede que a proteção seja perdida por configuração de permissão.
set -uo pipefail

allow() { exit 0; }

input=$(cat)
command=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

[ -z "$command" ] && allow

# Não menciona gh: não é assunto deste hook.
printf '%s' "$command" | grep -qE '(^|[^a-zA-Z0-9_-])gh([^a-zA-Z0-9_-]|$)' || allow

# O comando é avaliado por SEGMENTO, não como string única. Casar regex na string
# inteira é o que permitia o bypass: `gh issue view 1 && gh pr create` começa
# com leitura e liberava tudo o que vinha depois do &&.
#
# Regra: basta UM segmento gh que não seja comprovadamente leitura para perguntar.
# É allowlist: o que não estiver enumerado aqui vira pergunta, inclusive subcomando
# novo que o gh venha a ganhar.
readonly_segment='^[[:space:]]*gh[[:space:]]+('\
'--version|--help|help|version'\
'|auth[[:space:]]+(status|login|switch)'\
'|pr[[:space:]]+(view|list|diff|checks|status|checkout)'\
'|issue[[:space:]]+(view|list|status)'\
'|repo[[:space:]]+(view|list|clone)'\
'|release[[:space:]]+(view|list|download)'\
'|run[[:space:]]+(view|list|watch|download)'\
'|workflow[[:space:]]+(view|list)'\
'|search'\
'|(label|secret|variable|cache)[[:space:]]+list'\
'|gist[[:space:]]+(view|list)'\
'|browse'\
'|api'\
')([[:space:]]|$)'

needs_ask=0
while IFS= read -r segment; do
  # Segmento sem gh não interessa.
  printf '%s' "$segment" | grep -qE '(^|[^a-zA-Z0-9_-])gh([^a-zA-Z0-9_-]|$)' || continue

  if printf '%s' "$segment" | grep -qE "$readonly_segment"; then
    # `gh api` é o único verbo da lista de leitura que escreve sem mudar de nome.
    if printf '%s' "$segment" | grep -qE '(^|[^a-zA-Z0-9_-])gh[[:space:]]+api([[:space:]]|$)'; then
      # Método de escrita declarado.
      if printf '%s' "$segment" | grep -qiE '(-X|--method)[[:space:]]*=?[[:space:]]*(POST|PUT|PATCH|DELETE)'; then
        needs_ask=1; break
      fi
      # Armadilha do gh: a simples presença de campo (-f/-F/--field/--raw-field)
      # promove a chamada a POST implicitamente, sem nenhum -X na linha.
      if printf '%s' "$segment" | grep -qE '(^|[[:space:]])(-f|-F|--field|--raw-field)([[:space:]]|=|$)'; then
        needs_ask=1; break
      fi
    fi
    continue
  fi

  needs_ask=1; break
done <<< "$(printf '%s' "$command" | sed -E 's/(\&\&|\|\||;|\||\$\(|`)/\n/g')"

[ "$needs_ask" = "0" ] && allow

jq -n --arg cmd "$command" '
{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: (
      "Esta ação escreve no GitHub e fica visível para o time.\n\n" +
      "Comando: " + $cmd + "\n\n" +
      "Abrir pull request, comentar, revisar ou fazer merge exige autorização " +
      "explícita de quem está conduzindo o trabalho. Confirme apenas se você pediu " +
      "esta ação agora — e prefira revisar o conteúdo antes."
    )
  }
}'

exit 0
