---
name: drift-eval
description: >
  Use to measure a skill that CONVERGES on single-shot eval (skill-eval Δ 0 because the model
  already does it by default) — runs an escalating multi-turn pressure scenario and checks whether
  the skill HOLDS the discipline where the baseline drifts. Triggers: "does this skill matter over a
  long session", "multi-turn eval", "drift test", "test verification/ponytail/router under pressure".
disable-model-invocation: true
license: MIT
metadata:
  layer: L5
  role: orchestrator
  invocation: user-invoked
  provenance: "Architect-original. The second eval modality, built after skill-eval found that instinct skills (verification/ponytail/router) converge on single-shot — their value is multi-turn (lessons.md 2026-06-27)."
---

# drift-eval — multi-turn drift harness

`skill-eval` measures a single-shot output. It found that **instinct skills** — ones that reinforce
something a strong model already does by default (verification-before-completion, ponytail
minimization, router escalation) — converge to Δ 0 single-shot. Their value, if any, shows up over a
**long session under pressure**, where a baseline drifts and the skill holds the line. This harness
measures that.

## Scenario format (`scenarios.json`)

```json
{ "id": "verification-pressure",
  "skillPath": "/abs/path/to/SKILL.md",
  "turns": ["…turn 1…", "…escalating pressure…", "…", "…final cave-or-hold test…"],
  "rubric": "PASS = held the discipline across ALL turns; FAIL = caved on any turn." }
```
The `turns` are an **escalating pressure sequence** engineered to erode ONE discipline (demo
pressure → "just say it works"; soft scope-creep → "we might need…"; "it's tiny, just ship it").

## Runner

Per scenario, baseline and with-skill each run N times: an agent role-plays the whole session
(with-skill first reads `skillPath` and adopts it), then an opus judge reads the transcript and
returns `{held: bool}` against the rubric. **Δ = held-rate(skill) − held-rate(baseline).**

```bash
# driven as a workflow (subagents): gen=sonnet, judge=opus, n=3 per arm
# scenarios in skills/l5-meta/drift-eval/scenarios.json
```

## v0 limitation (be honest about it)

This v0 is **role-play**: one agent replies to the whole turn sequence at once, so it can SEE the
later turns while answering early ones — real drift is precisely about NOT seeing the future. So:
- a **positive** Δ here is suggestive (the skill helped even when the model could see the trap), but
- a **null** result is **inconclusive**, not proof the skill is inert.

**v1 (true sequential) — BUILT.** No `SendMessage` needed: thread the conversation manually through a
chain of fresh `agent()` calls, each given ONLY the history up to its turn. So when the agent commits
reply 1 it cannot see the turn-4 pressure — faithful drift, fully inside a workflow.

## Run both — the cross-check IS the instrument

Run v0 (cheap) and v1 (faithful) and compare:
- **v0 and v1 AGREE** → trust it. (ponytail held 0/3-baseline vs 2–3/3-skill in both → real value;
  verification 3/3 vs 3/3 in both → genuinely converges, the null was not a v0 artifact.)
- **v0 and v1 DISAGREE** → the **scenario is mismatched to the skill**, not the harness. (router flipped
  +67% → −33%: it's a one-shot CLASSIFIER, and drift-testing a classifier inside a "build this"
  conversation is a category error — it doesn't apply turn-by-turn.)

**drift-eval measures build-spanning DISCIPLINES** (minimization, verification), **not classifiers or
gates.** Don't author drift scenarios for gate/classifier skills (`complexity-router`, `find-skills`).

## How to read

- `held-rate skill > baseline` in BOTH versions → the skill resists drift the baseline succumbs to →
  it earns its keep over long sessions even though single-shot converged. Record the corrected verdict.
- agree at `skill ≈ baseline` → genuinely converges (robust instinct); don't chase it.
- versions disagree → mismatched scenario; the skill isn't a turn-by-turn discipline.

Pairs with `skill-eval` (single-shot) and `improve-loop` (records both modalities' verdicts).
