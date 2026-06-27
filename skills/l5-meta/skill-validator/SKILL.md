---
name: skill-validator
description: >
  Use to audit skill QUALITY (distinct from skill-eval, which measures behavioral effect) —
  scores every SKILL.md on six axes via an LLM judge and runs a deterministic token-budget
  check. Triggers: "validate the skills", "skill quality", "are the skills well-written",
  "audit SKILL.md", "skill scorecard".
disable-model-invocation: true
license: MIT
metadata:
  layer: L5
  role: orchestrator
  invocation: user-invoked
  provenance: "Borrows the 6-axis rubric + token budgets from agent-ecosystem/skill-validator. Complements skill-eval: that measures Δ behavior, this measures write quality."
---

# skill-validator — L5 quality gate (the second L5 gate)

`skill-eval` answers "does this skill *change behavior*?" — `skill-validator` answers "is this
skill *well-written*?". Two different failure modes; a skill can move a number and still be
bloated, vague, or scope-creeping. Both gate the framework.

## Two halves

**1. Deterministic budget scan (cheap, instant — no model):**
```bash
node skills/l5-meta/skill-validator/budget.mjs            # scan every SKILL.md
node skills/l5-meta/skill-validator/budget.mjs --self-test
```
Budgets: `description` ≤ 1024 chars (agentskills.io spec); body soft-cap ~4000 chars, hard flag
> 6000 (a resident skill like `ponytail` pays this on every turn); > 200 lines flags sprawl.

**2. Six-axis LLM judge (via subagents — one judge per skill):**
Each skill is scored 0-10 on —
1. **clarity** — unambiguous, well-structured, easy for a model to parse.
2. **actionability** — concrete executable steps/rules, not vague aspiration.
3. **token-efficiency** — concise for what it delivers; no bloat or repetition.
4. **scope-discipline** — one clear job; doesn't sprawl into other skills' territory.
5. **directive-precision** — the `description` says WHEN to use the skill, not just WHAT it does
   (a what-summary makes the model follow the description and skip the body).
6. **novelty** — actually changes behavior vs the model's default (not a no-op restatement).

Run the judge the same way `skill-eval` runs — through subagents when no API key is available
(no `claude -p` dependency), or adapt to a direct-API runner. The judge model should be strong
(opus); pin it and read scores as a **trend**, not an absolute bar (LLM-judge scores drift).

## How to read

- Budget flag → mechanical fix (trim the body; resident skills are the priority).
- Axis < 6 → a real authoring problem; the `top_issue` names the single most important fix.
- A skill that scores high on `skill-validator` but Δ 0 on `skill-eval` is well-written but
  inert; one that moves a number but scores low here is effective but a maintenance liability.
  The bar is both.

This is the gate every new skill (and every borrow that becomes a skill) passes alongside
`skill-eval` before shipping. Pairs with `improve-loop` (which records the results) and
`scripts/check-rule-copies.mjs` (structural drift).
