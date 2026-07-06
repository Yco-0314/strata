---
name: debugging
description: >
  Use when the user reports a bug, a test failure, a crash, unexpected behavior, or a
  performance regression, or says "debug"/"diagnose"/"it's broken"/"why is this failing".
  Builds a tight red-capable feedback loop before any hypothesis, finds the root cause, and
  fixes the shared function once. Auto-fires on any failure.
license: MIT
metadata:
  layer: L4
  role: discipline
  invocation: model-invoked-discipline
  provenance: "Merge: mattpocock diagnosing-bugs feedback-loop-first gate (entry) + the 4-phase approach from superpowers' systematic-debugging + ponytail root-cause-as-lazier-diff (fix rule). Phase 0 arbiter from arxiv 2605.25665; the 3+-failed-fixes rule is mechanized by hooks/loop-guard.mjs."
---

# Debugging — L4 (merged, feedback-loop-first)

## The Iron Law

```
NO HYPOTHESIS WITHOUT A RED-CAPABLE FEEDBACK LOOP FIRST
```

Reading code to build a theory before the loop exists is the exact failure this skill
prevents. Loop first, *then* think.

## Phase 0 — Failure arbiter: route before you debug

Classify before assuming a code bug — route, don't patch blindly:
- **contract-gap** — never specified → back to `to-issues` (fix the contract, not the code).
- **verification-gap** — uncovered by any check → to `review`'s coverage pass; code may be fine.
- **implementation-bug** — contract right, code wrong → Phase 1.
- **environment** — flaky infra/config, code unchanged → stabilize the env.

Only implementation-bug (and reproducible environment) proceed. A code fix for a contract-gap hides the hole.

## Phase 1 — Build the feedback loop (this IS the skill)

Construct a signal that goes **red on this specific bug**. Try in order: failing test →
curl/CLI + fixture diff → headless-browser script → replay a captured trace → throwaway harness
→ fuzz/bisection/differential loop → HITL script (last resort). Build the right loop and the bug
is 90% found.

**Gate — Phase 1 is done only when you can name one command already run (paste invocation +
output) that is:**
- **red-capable** — drives the real bug path and asserts the user's *exact* symptom (not "ran without erroring");
- **deterministic** — same verdict every run (flaky bug → raise the reproduction rate until debuggable);
- **fast** — seconds, not minutes;
- **agent-runnable** — unattended.

No such command → **stop**, do not hypothesise. Genuinely can't build one? Say what you
tried; ask for env access / a captured artifact / permission to instrument.

## Phase 2 — Reproduce + minimise

Run the loop; confirm it reproduces the **user's** failure (not a nearby one). Then shrink to
the smallest scenario still red — cut inputs/callers/config one at a time, re-running after
each. Done when every remaining element is load-bearing (this becomes the Phase 5 test).
Read errors and stack traces completely; check recent changes (`git diff`). Multi-component
systems: log data in/out at each boundary once to find *which* layer breaks first.

## Phase 3 — Hypothesise

Generate **3–5 ranked, falsifiable hypotheses** before testing any (single-hypothesis
anchors on the first idea). Each states a prediction: "if X is the cause, changing Y removes
it." Show the user the ranked list — they often re-rank instantly; don't block if AFK.

## Phase 4 — Instrument

One variable at a time, each probe mapped to a prediction. Debugger/REPL > targeted logs >
never "log everything and grep". Tag every debug log `[DEBUG-a4f2]` so cleanup is one grep.
Perf regressions: measure a baseline first (profiler/`performance.now()`/query plan), then bisect.

## Phase 5 — Fix at the root, the lazier way

Fix the **root cause, not the symptom**. The ponytail rule: **grep every caller of the
function you touch and fix the shared function once — one guard there is a smaller diff than
one guard per caller.** Write the regression test *before* the fix if a correct seam exists
(one that exercises the real bug pattern); watch it fail, fix, watch it pass, re-run Phase 1
on the original scenario. No correct seam? That absence is itself the finding —
note it. After **3+ failed fixes, stop and question the architecture** — a wrong pattern, not
a failed hypothesis. The `loop-guard` hook fires this rule mechanically — its stall warning
means re-classify (Phase 0), not retry.

## Phase 6 — Cleanup + post-mortem

Original repro gone (re-run the loop); regression test passes (or seam-absence documented);
all `[DEBUG-]` logs removed (grep); throwaway harnesses deleted; the correct hypothesis in the
commit message. Ask what would have prevented this — if architectural, hand to
`improve-codebase-architecture` after the fix.

Pairs with `tdd` (L3) for the failing test and `verification-before-completion` (L4) before
claiming fixed.
