# ADR 0001 — Layering and invocation policy

- Status: Accepted
- Date: 2026-06-25
- Deciders: project owner

## Context

We are combining three Claude Code skill repos into one meta-framework:

- `ponytail` (DietrichGebert) — a single always-on "lazy senior dev" behavioral nudge, benchmarked,
  shipped to 14 agents.
- `superpowers` (obra) — an end-to-end auto-triggering workflow (brainstorm → plan → subagent TDD → review).
- `mattpocock/skills` — a composable toolbox with strong repo hygiene (model-vs-user invocation
  discipline, `CONTEXT.md` ubiquitous language, ADRs, tracer-bullet issues).

They sit at three different altitudes: `ponytail` governs **how much code**, `superpowers` governs
**what process**, `mattpocock` governs **composition and control**. They are orthogonal, but they
overlap on several capabilities and carry one genuine philosophical conflict.

### Forces

- **The invocation conflict.** `superpowers`' `using-superpowers` mandates auto-invoking any skill
  with "even a 1% chance" of relevance, before any response. `mattpocock` deliberately sets
  `disable-model-invocation: true` (and strips the `description`) on heavyweight orchestrators so the
  human keeps the wheel. Stacked verbatim, the 1% rule causes skill-invocation storms and over-fires
  on trivial questions, defeating mattpocock's control model.
- **Duplicate capabilities.** Three alignment skills (brainstorming / grill-me / grill-with-docs),
  three TDD stances, three debugging loops, three review approaches.
- **Always-on injection risk.** `ponytail` already documented a SessionStart hook that contaminated a
  benchmark baseline. `superpowers` also injects its dispatcher on every SessionStart. Two always-on
  injectors bloat the per-turn prompt and leak across sibling skills.

## Decision

1. **Layered architecture (L0–L6).** Each layer has one primary owner; capabilities are not merged
   across layers. See [CONTEXT-MAP.md](../../CONTEXT-MAP.md) for the table.

2. **`mattpocock`'s invocation taxonomy is the law for the whole namespace.** Every skill is classified
   model-invoked (rich `description` with trigger phrasing) or user-invoked
   (`disable-model-invocation: true`, no description, human-only).

3. **Only L0 + L4 discipline skills auto-fire.** The dispatcher (a rewritten `using-superpowers`)
   auto-considers *only* model-invoked discipline skills (the ponytail nudge, debugging,
   verification). All workflow orchestrators (plan / prd / issues / execute) are user-invoked and
   never auto-trigger. The "1% must-invoke everything" rule is replaced by this scoped rule.

4. **A complexity router at L1 gates the heavy pipeline.** `ponytail` is always resident (governs
   solution size). `superpowers`' design-gate pipeline engages only above a complexity threshold
   (new feature / multi-file / irreversible). Trivial + reversible → ponytail nudge alone.

5. **Rigor is a dial, not a constant, on the merged skills.** One `tdd` skill: ponytail's "ONE
   runnable check" is the trivial default; full RED-GREEN + vertical-slice body engages on non-trivial
   logic or explicit opt-in. Same pattern for the merged debugging skill and the 3-lens `/review`.

6. **Exactly one SessionStart injector.** It injects the mode-filtered ponytail ladder + a slim
   dispatcher pointer only. Everything else loads lazily via the Skill tool. The hook is isolated
   (`--setting-sources project,local`) and invariant phrases are pinned by a `check-rule-copies.js`-style
   CI gate.

7. **Conform to the `agentskills.io` spec.** Non-standard fields (version, author, provenance) go in
   `metadata: {}` only. Ship as one `.claude-plugin/marketplace.json` grouping skills into per-layer
   plugins. SDK-deployable from day one (require `setting_sources`, namespace `plugin:skill`).

## Consequences

**Positive**

- The one real conflict is resolved by design, not by hoping two rules coexist.
- `mattpocock`'s "you stay in control" pitch survives; only cheap discipline auto-fires.
- Capable-model-only behavior is contained; the per-turn prompt stays small.
- Spec conformance keeps every skill portable across 40+ clients.

**Negative / risks**

- **The complexity router is a single point of failure.** Wrong threshold → trivial fixes drown in
  ceremony (mattpocock's anti-thesis) or real features skip the design gate. It needs its own eval set.
- **Capable-model dependency is inherited from all three repos** — degrades silently to ceremony on
  weak models. The framework must declare its target tier loudly.
- **De-duplication is a one-time migration AND an ongoing governance burden** — without the drift gate,
  collapsed skill families silently re-diverge.
- **Borrow-overload is itself an over-engineering risk** — every ecosystem borrow must clear ponytail's
  bar ("does it move a measured number?") before shipping.

## Alternatives considered

- **Flat merge into one skill set** — rejected: destroys the altitude separation and forces the
  invocation conflict into every skill.
- **Adopt one repo wholesale, drop the others** — rejected: each owns something the others lack
  (ponytail's nudge, superpowers' dispatch, mattpocock's hygiene + control).
- **Keep all three installed side by side, unmodified** — rejected: the 1%-invoke rule, duplicate
  skills, and double SessionStart injectors actively fight each other.
