#!/usr/bin/env bash
# One command to run the L5 real measurement. Run from a normal terminal (not inside
# another Claude Code session). Usage:  ./scripts/eval.sh
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "1/3  checking model access..."
KEY="${ANTHROPIC_API_KEY:-${ANTHROPIC_AUTH_TOKEN:-}}"
if [ -n "$KEY" ]; then
  BASE="${ANTHROPIC_BASE_URL:-https://api.anthropic.com}"; BASE="${BASE%/}"
  PMODEL="${EVAL_MODEL:-claude-haiku-4-5-20251001}"
  ping=$(curl -s "$BASE/v1/messages" \
    -H "x-api-key: $KEY" -H "authorization: Bearer $KEY" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" \
    -d "{\"model\":\"$PMODEL\",\"max_tokens\":8,\"messages\":[{\"role\":\"user\",\"content\":\"say pong\"}]}" 2>&1)
  if echo "$ping" | grep -qi '"error"'; then
    echo "  X  API key set but $BASE rejected the request (model $PMODEL):"
    echo "     $(echo "$ping" | head -c 220)"
    exit 1
  fi
  echo "  OK  (direct API — $BASE, model $PMODEL)"
else
  out=$(claude -p "reply with the single word: pong" --model haiku 2>&1) || true
  if echo "$out" | grep -qiE 'invalid bearer|authenticate|40[0-9]|not allowed|error'; then
    echo "  X  claude -p is not usable here (login/subscription/policy)."
    echo "     detail: $out"
    echo "     Fix: use an API key instead —"
    echo "       export ANTHROPIC_API_KEY=sk-ant-...   (from console.anthropic.com)"
    echo "     then re-run this script."
    exit 1
  fi
  echo "  OK  (claude CLI login)"
fi

echo "2/3  self-test (scorer logic, free)..."
node skills/l5-meta/skill-eval/run.mjs --self-test || exit 1

echo "3/3  eval: every set in sets/ ..."
for set in skills/l5-meta/skill-eval/sets/*.json; do
  echo
  echo "----- $(basename "$set") -----"
  node skills/l5-meta/skill-eval/run.mjs "$set"
done

echo
echo "Done. The line that matters is each block's 'ship gate' / 'Δ'."
echo "Tip: EVAL_N=5 ./scripts/eval.sh  for a majority vote that absorbs LLM noise."
