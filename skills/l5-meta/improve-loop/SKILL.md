---
name: improve-loop
description: >
  Use to run the framework's self-improvement loop — measure every skill with skill-eval,
  apply the Δ ship-gate (keep what moves a number, revert what doesn't), record the result to
  lessons.md, and surface the next backlog borrow to evaluate. Triggers: "run the improve loop",
  "self-improve the skills", "measure all skills", "what should we improve next".
disable-model-invocation: true
license: MIT
metadata:
  layer: L5
  role: orchestrator
  invocation: user-invoked
  provenance: "Architect-original. Ties writing-skills (author) + skill-eval (measure) + lessons.md (record) into one closed loop. Implements the 'must move a measured number' ship discipline."
---

# improve-loop — L5 self-improvement engine

The closed loop that makes the framework improve itself. One turn:

1. **Pick** a backlog item (`backlog.json`) — a borrow or edit, with a hypothesis and a ship-test.
2. **Author** the change with `writing-skills`. This is a real edit — the human/agent step the
   engine deliberately does **not** automate (a script editing skills blind is the over-reach
   ponytail forbids).
3. **Measure** with `skill-eval`: run the skill's eval set before and after — did Δ improve?
4. **Gate**: Δ>0 (or a documented failure removed) → ship. Otherwise → **revert**.
5. **Record** to `lessons.md`: what was tried, the Δ, the verdict — so it isn't retried.
6. Repeat until the backlog stops moving the number.

## Transcript feedback — diagnose before you re-author (the borrow that closes the back half)

A low or surprising Δ does **not** mean "edit the skill". First **read the actual failing
transcripts** (the `skill-eval` `baseOut`/`skillOut` for the cases that failed) and classify the
failure mode — the fix is often NOT the skill:
- **Wrong test** — the assertion penalises correct behavior. (Real example: `verification`'s
  `excludes` banned "should pass", but the skill correctly *quotes* that phrase to refute it →
  false-negative. Removing the assertion revealed the true Δ = 0: Claude already verifies by default.)
- **Mis-fire** — the skill didn't trigger; the `description` needs WHEN-clauses (run `skill-validator`).
- **Convergence** — baseline already does it (strong model / instinct skill). Δ 0 is the honest
  answer, not a skill defect; record it, don't chase it.
- **Real gap** — only now is editing the skill the right move; do it via `writing-skills`.
Instrument what you can (tool-call count, errors, tokens) and feed it back here. A correction to the
*eval* counts as loop progress — `lessons.md` records the corrected number, superseding the old one.

## The engine

```bash
node skills/l5-meta/improve-loop/loop.mjs             # measure every set, gate, append lessons.md
node skills/l5-meta/improve-loop/loop.mjs --dry       # measure + print, don't write lessons.md
node skills/l5-meta/improve-loop/loop.mjs --self-test # prove the parser (no API)
```

The engine automates **measure → gate → record**: runs every eval set via `skill-eval`, parses
each Δ and ship-gate, flags any skill with Δ≤0 (dead weight / regression), appends a dated run to
`lessons.md`, and prints the next pending backlog items. Needs a logged-in `claude` (same auth as
`skill-eval`) — run it from a terminal or CI, not a nested session (see `scripts/eval.sh`).

## The gate rule

A change earns its place only if it **moves a measured number** (Δ>0 on the skill's eval set) or
removes a documented failure mode. No movement → revert and record why. This is the discipline
that stops the framework accreting borrows it can't justify — the borrow-overload risk. The 22
candidate borrows in the synthesis mean nothing until each clears this gate; that is what
`backlog.json` tracks.

## Autonomous mode

To run unattended over the backlog, drive the engine on a schedule (`/schedule`) or interval
(`/loop`) in an environment where `claude` is authenticated — CI with an API key is cleanest, and
it doubles as the drift-gate runner. Each run records to `lessons.md`; a human reviews the ledger
and approves the author step for flagged items. The loop never auto-edits skills.

Cross-refs: `writing-skills` (author) · `skill-eval` (measure) · `lessons.md` (memory) ·
`backlog.json` (worklist) · `scripts/check-rule-copies.mjs` (the structural gate run alongside).
