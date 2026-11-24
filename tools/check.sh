#!/usr/bin/env bash
# Quick safety check, ~1 minute. Run before every push:  bash tools/check.sh
# Needs Node + playwright (npm i playwright && npx playwright install chromium).
cd "$(dirname "$0")" || exit 1
fail=0
out=$(node smoke.js 2>&1); echo "$out" | tail -4
echo "$out" | grep -q "^errors \[\]$" || { echo "SMOKE FAILED"; fail=1; }
out=$(node boot.js 2>&1); echo "$out" | tail -3
echo "$out" | grep -q "errors \[\]" || { echo "BOOT FAILED"; fail=1; }
out=$(node est-tag.js 2>&1); echo "$out"
echo "$out" | grep -q "Burrito | .* · est\." || { echo "EST TAG FAILED"; fail=1; }
node two-devices.js | tail -12 || fail=1
out=$(node pause.js 2>&1); echo "$out" | tail -3
echo "$out" | grep -q FAIL && { echo "PAUSE FAILED"; fail=1; }
out=$(node scorecard.js 2>&1); echo "$out" | tail -3
echo "$out" | grep -q FAIL && { echo "SCORECARD FAILED"; fail=1; }
out=$(node dedupe.js 2>&1); echo "$out" | tail -3
echo "$out" | grep -q FAIL && { echo "DEDUPE FAILED"; fail=1; }
out=$(node extractjson.js 2>&1); echo "$out" | tail -3
echo "$out" | grep -qE "FAIL|THROW" && { echo "EXTRACTJSON FAILED"; fail=1; }
for vp in 360x740 390x844 412x915; do
  out=$(VP=$vp node screens.js 2>&1); echo "$vp: $(echo "$out" | tail -1)"
  echo "$out" | grep -q "SCREENS OK" || { echo "$out" | grep -E "FAIL|   "; echo "SCREENS FAILED at $vp"; fail=1; }
done
[ $fail = 0 ] && echo "ALL CHECKS PASSED" || { echo "CHECKS FAILED"; exit 1; }
