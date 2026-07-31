#!/usr/bin/env bash
# Suíte completa. É o que o CI roda.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
failed=0

step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# Os scripts shell do repositório. `.githooks/commit-msg` não tem extensão, então entra
# por caminho. `node_modules/` é dependência de desenvolvimento — código de terceiro que
# não passa pela nossa régua.
FIND_SHELL=(-type f \( -name '*.sh' -o -path "$ROOT/.githooks/*" \)
            -not -path '*/.git/*' -not -path '*/node_modules/*')

step "sintaxe dos scripts"
while IFS= read -r f; do
  bash -n "$f" || { echo "  ERRO de sintaxe: $f"; failed=1; }
done < <(find "$ROOT" "${FIND_SHELL[@]}")
[ "$failed" = "0" ] && echo "  ok"

step "shellcheck"
if command -v shellcheck >/dev/null 2>&1; then
  # SC1091: não segue `source` de caminho resolvido em runtime.
  find "$ROOT" "${FIND_SHELL[@]}" -print0 \
    | xargs -0 shellcheck --severity=warning --exclude=SC1091 \
    || failed=1
  [ "$failed" = "0" ] && echo "  ok"
else
  echo "  shellcheck ausente — pulado"
fi

step "frontmatter das skills"
for skill in "$ROOT"/skills/*/; do
  name=$(basename "$skill")
  f="$skill/SKILL.md"
  [ -f "$f" ] || { echo "  $name: SKILL.md ausente"; failed=1; continue; }
  # A spec exige que o campo name case com o nome do diretório.
  declared=$(awk -F': *' '/^name:/{print $2; exit}' "$f")
  [ "$declared" = "$name" ] || { echo "  $name: campo name é \"$declared\""; failed=1; }
  grep -q '^description:' "$f" || { echo "  $name: sem description"; failed=1; }
  lines=$(wc -l < "$f")
  [ "$lines" -le 500 ] || { echo "  $name: $lines linhas (spec recomenda até 500)"; failed=1; }
done
[ "$failed" = "0" ] && echo "  ok"

step "invocacao coerente entre harnesses"
# disable-model-invocation e do Claude Code; allow_implicit_invocation e do Codex.
# Uma skill e user-invoked nos dois ou em nenhum — divergencia deixa ela auto-invocavel
# num harness e nao no outro.
for s in "$ROOT"/skills/*/; do
  n=$(basename "$s")
  c=$(grep -c 'disable-model-invocation: true' "$s/SKILL.md" || true)
  o=$(grep -c 'allow_implicit_invocation: false' "$s/agents/openai.yaml" 2>/dev/null || echo 0)
  [ "$c" = "$o" ] || { echo "  $n: claude=$c codex=$o"; failed=1; }
  [ -f "$s/agents/openai.yaml" ] || { echo "  $n: sem adaptador agents/openai.yaml"; failed=1; }
done
[ "${failed:-0}" = "1" ] || echo "  ok"

step "router cobre todos os comandos"
# Router que nao lista um comando manda a pessoa para lugar nenhum; router que lista um
# comando removido manda para um comando que nao existe. Os dois sao pior que nada.
for s in "$ROOT"/skills/*/; do
  n=$(basename "$s")
  [ "$n" = "sdd-help" ] && continue
  grep -q "/$n" "$ROOT/skills/sdd-help/SKILL.md" || { echo "  $n ausente do router"; failed=1; }
done
grep -oE '/sdd-[a-z]+' "$ROOT/skills/sdd-help/SKILL.md" | sort -u | while read -r c; do
  [ -d "$ROOT/skills/${c#/}" ] || echo "  router cita $c, que nao existe"
done
[ "${failed:-0}" = "1" ] || echo "  ok"

step "proibicao imperativa dentro do orcamento"
# Proibicao nomeia o comportamento errado e o torna disponivel. Guardrail duro pode
# permanecer; o resto se escreve no positivo. Orcamento: 6.
n=$(grep -rocE '^[-*[:space:]]*\*{0,2}(Não|Nunca|Jamais) |\*\*(Não|Nunca) ' "$ROOT"/skills/*/SKILL.md "$ROOT"/agents/*.md | awk -F: '{s+=$2}END{print s+0}')
if [ "$n" -le 6 ]; then echo "  ok ($n)"; else echo "  $n proibicoes imperativas (orcamento 6)"; failed=1; fi

step "revisores atendem spec e diff"
# O passo mais barato do ciclo é revisar o spec. Se um revisor perder o modo spec,
# a verificação volta inteira para depois do código.
for a in "$ROOT"/agents/*.md; do
  if ! grep -q '^## Dois momentos' "$a"; then
    echo "  $(basename "$a") sem a seção 'Dois momentos' — perdeu o modo spec"; failed=1
  fi
done
grep -q 'modo spec' "$ROOT/skills/sdd-spec/SKILL.md" \
  || { echo "  sdd-spec não dispara os revisores antes do gate humano"; failed=1; }
[ "${failed:-0}" = "1" ] || echo "  ok"

step "escolha de modelo pertence a quem usa"
# Alias de modelo é vocabulário de cada harness, e envelhece a cada modelo novo.
# O padrão tem de ser herdar da sessão; quem quiser outro passa argumento.
if grep -rnE '^model:' "$ROOT/agents" 2>/dev/null; then
  echo "  ↑ agente fixando modelo. Remova: o padrão é herdar da sessão"
  failed=1
else
  echo "  ok"
fi

step "caminho absoluto de máquina"
# Regra 1 do AGENTS.md: fato de um ambiente específico não vive no ferramental. Caminho
# absoluto é a forma genérica desse vazamento — só funciona na máquina de quem escreveu.
if grep -rnE '/home/|/Users/|C:\\' "$ROOT/skills" "$ROOT/agents" 2>/dev/null; then
  echo "  ↑ caminho absoluto de máquina encontrado no ferramental"
  failed=1
else
  echo "  ok"
fi

step "token residual da migração"
# Trava de regressão permanente do rename: nome antigo que reaparecer reprova aqui.
# Cada padrão abre com a primeira letra entre colchetes para que esta linha não case
# consigo mesma. A fronteira à esquerda em `[l]d-` é obrigatória: sem ela `build-` casa
# e o passo reprova texto legítimo. O spec da migração cita os nomes antigos por
# definição, então `docs/superpowers/specs/` fica de fora.
residual=$(grep -rniE '[l]icitar|[g]lab|[g]itlab|(^|[^a-z])[l]d-' "$ROOT" \
             --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null \
           | grep -v "^$ROOT/docs/superpowers/specs/")
if [ -n "$residual" ]; then
  printf '%s\n' "$residual"
  echo "  ↑ token da migração ainda presente fora de docs/superpowers/specs/"
  failed=1
else
  echo "  ok"
fi

step "referências a comandos inexistentes"
for ref in $(grep -rhoE '/sdd-[a-z]+' "$ROOT/skills" "$ROOT/agents" "$ROOT/README.md" 2>/dev/null | sort -u); do
  # `~/sdd-kit` e `NicolasBonnefont/sdd-kit` são o nome do repositório dentro de um
  # caminho, não um comando. O prefixo dos comandos casa com o nome do projeto.
  [ "$ref" = "/sdd-kit" ] && continue
  [ -d "$ROOT/skills/${ref#/}" ] || { echo "  $ref é referenciado mas não existe"; failed=1; }
done
[ "$failed" = "0" ] && echo "  ok"

step "bit de execução nos entrypoints"
# install.sh roda como ./install.sh, bootstrap.sh faz exec nele, os hooks são invocados
# pelo harness por caminho absoluto e bin/cli.js é o bin do pacote. Sem o bit a instalação
# morre em "Permission denied" antes de copiar qualquer skill.
execs=("$ROOT/install.sh" "$ROOT/bootstrap.sh" "$ROOT/bin/cli.js" "$ROOT"/hooks/*.sh)
for f in "${execs[@]}"; do
  [ -x "$f" ] || { echo "  ${f#"$ROOT"/} não é executável"; failed=1; }
done
# O índice do git é o que quem clona recebe: bit certo aqui e 100644 lá não resolve nada.
if git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  for f in "${execs[@]}"; do
    rel="${f#"$ROOT"/}"
    mode=$(git -C "$ROOT" ls-files -s -- "$rel" | awk '{print $1}')
    [ -z "$mode" ] || [ "$mode" = "100755" ] \
      || { echo "  $rel está $mode no índice do git (esperado 100755)"; failed=1; }
  done
fi
[ "$failed" = "0" ] && echo "  ok"

step "bateria dos hooks"
bash "$ROOT/tests/scope-guard.test.sh" || failed=1
bash "$ROOT/tests/gh-guard.test.sh"    || failed=1

printf '\n'
if [ "$failed" = "0" ]; then
  printf '\033[1m  Suíte verde.\033[0m\n\n'
else
  printf '\033[1m  Suíte vermelha.\033[0m\n\n'
fi
exit "$failed"
