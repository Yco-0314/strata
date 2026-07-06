---
name: skill-eval
description: >
  Use when creating or editing a skill, and before shipping it — measures whether
  the skill actually changes the model's behavior by running each test prompt with
  the skill injected and without it (baseline), then comparing pass rates. Use when
  the user asks to evaluate, benchmark, or justify a skill, or asks "does this skill
  earn its context?".
license: MIT
metadata:
  layer: L5
  role: eval-harness
  invocation: model-invoked-discipline
  provenance: "Borrows anthropics/skills skill-creator's with-skill-vs-baseline loop; runs it via the local claude CLI. ADR 0001, CONTEXT-MAP L5."
---

# skill-eval — L5 quality gate

The framework's ship gate: **a skill earns its place only if it moves a measured
number.** This harness runs every test prompt twice — once with the skill injected
as a system prompt, once without (baseline) — and reports the delta.

## Why this is the keystone of L5

ponytail, superpowers, and mattpocock all author skills by taste, with no
measurement loop. On strong models the over-build traps converge (baseline already
picks the native answer), so eyeballing two outputs can't tell you the marginal
effect. This harness makes it a number.

## Run it (from the Architect/ root)

```bash
node skills/l5-meta/skill-eval/run.mjs --self-test          # prove the scorer, no API
node skills/l5-meta/skill-eval/run.mjs skills/l5-meta/skill-eval/sets/l0-ponytail.json
EVAL_N=5 node skills/l5-meta/skill-eval/run.mjs <set.json>  # 5 runs/case, majority vote
```

The runner uses the direct API when `ANTHROPIC_API_KEY` is set, else the local logged-in
`claude` CLI. Cost ≈ `2 × cases × EVAL_N` task calls, plus one judge call per `judge`
assertion per run.

Artifacts, every run: transcripts to `runs/<stamp>-<set>/<case>.{baseline,skill}.txt` and one
JSONL record (per-case grades, Δ, gate) to `runs/log.jsonl` — `improve-loop`'s
transcript-feedback reads these. Transcript dirs are gitignored; the log is tracked.

- `EVAL_MODEL` — model under test (default: set's `model`, else `haiku`).
- `EVAL_N` — runs per case; the case verdict is the **majority** across runs, which absorbs
  LLM non-determinism (default 1). Use an odd N to avoid ties (a tie counts as FAIL).
- `EVAL_JUDGE_MODEL` — model that grades `judge` assertions (default `sonnet` — judge with a
  stronger model than the one under test).

## Eval-set format

```json
{
  "skill": "skills/<layer>/<skill>/SKILL.md",
  "model": "haiku",
  "cases": [
    { "id": "debounce", "prompt": "…task…",
      "assert": [
        { "kind": "excludes", "pattern": "import\\s+[^\\n]*from\\s+['\"]lodash" },
        { "kind": "includes", "pattern": "skipped|add when" }
      ] }
  ]
}
```

- `skill` — the SKILL.md body injected for the with-skill run (frontmatter stripped).
- assertion `kind`:
  - `includes` / `excludes` — regex over the whole output (cheap, deterministic).
  - `verdict` — regex over the first line only (classifier outputs).
  - `judge` — `{ "kind": "judge", "rubric": "…what a passing answer must satisfy…" }`: an LLM
    (`EVAL_JUDGE_MODEL`) grades against the rubric. For fuzzy criteria regex can't capture; pair
    with a deterministic one. An undecidable reply is a runner error, never a silent pass.
- A case passes only if **all** its assertions pass.
- `difficulty` — optional 1 (toy) / 2 (realistic) / 3 (adversarial); `dark-room.mjs` flags sets
  with no case ≥2 as a dark room (only-easy sets reveal nothing).
- Assert *behavior the skill mandates that baseline won't show* (e.g. ponytail's `Skipped: X`),
  not facts a good baseline already produces.

## Reading the result

```
pass rate   baseline 0/3 (0%)   with-skill 3/3 (100%)   Δ +100%
ship gate: PASS — skill moves the number
```

- `Δ > 0` → the skill changes behavior in the measured direction. Ship it.
- `Δ = 0` (no movement) → either the model already behaves this way (the trap is too
  easy — pick a harder one or a weaker `EVAL_MODEL`), or the skill isn't pulling its
  weight. Either way: **does this skill earn its context budget?**

## Honest limits

- Text/regex assertions over a single run are a **weak signal**. Treat scores as a trend
  across edits, not ground truth. For load-bearing decisions, raise `EVAL_N` (majority vote)
  and add a `judge` assertion — both are built in.
- The `judge` is a stronger but still imperfect signal: LLM-as-judge scores drift across
  model versions, so pin `EVAL_JUDGE_MODEL` and compare runs against each other, not against
  an absolute bar.
- This is the gate the rest of the borrow backlog routes through: no ecosystem borrow
  ships until it clears a Δ here.
