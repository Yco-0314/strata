# Architect — context map

A layered meta-framework that combines three skill repos by **altitude**, not by merging:

- `ponytail` — a behavioral nudge (how much code)
- `superpowers` — a process engine (what process)
- `mattpocock/skills` — a composable toolbox + repo hygiene (how to compose & stay in control)

These are three orthogonal axes. The whole design rests on one decision — see
[docs/adr/0001-layering-and-invocation.md](docs/adr/0001-layering-and-invocation.md).

## The one rule that makes the combination work

`superpowers` wants the agent to auto-drive everything ("even 1% chance → must invoke").
`mattpocock` deliberately keeps heavyweight skills human-invoked to keep the user in control.
We resolve this, not paper over it:

1. **`mattpocock`'s invocation taxonomy is law.** Every skill is either model-invoked
   (rich trigger `description`) or user-invoked (`disable-model-invocation: true`, human-only).
2. **Only L0/L4 discipline skills auto-fire.** All orchestrators (plan / prd / issues / execute)
   are user-invoked and never auto-trigger.
3. **A complexity router at L1 gates the heavy pipeline.** Trivial + reversible → ponytail nudge
   alone. New feature / multi-file / irreversible → escalate to the design gate + full TDD + subagent review.
4. **Exactly one SessionStart injector** for the whole framework (mode-filtered ponytail ladder +
   a slim dispatcher pointer). Everything else loads lazily via the Skill tool.

## The layers

| Layer | Owns | Primary source | Auto-fires? | Status |
|-------|------|----------------|-------------|--------|
| **L0** Behavioral constitution | minimal-code ladder, resident every turn; + `using-architect` dispatcher | `ponytail` | yes (mode-filtered) | **built** |
| **L1** Alignment & domain | grilling + `CONTEXT.md` glossary + ADRs + complexity router | `mattpocock` (+ superpowers gate) | router/primitives only | router + `grilling` + `domain-modeling` **built** |
| **L2** Planning | `to-issues` default / `writing-plans` heavy | `mattpocock` + `superpowers` | no (user-invoked) | `to-prd` + `to-issues` + `writing-plans` **built** |
| **L3** Execution | subagent dispatch + merged TDD + worktrees | `superpowers` | `tdd` discipline; SDD user-invoked | `subagent-driven-development` + `tdd` + `using-git-worktrees` **built** |
| **L4** Review & verify | 3 lenses: correctness · over-eng · security; evidence gate | composite | yes (discipline) | `review` + `debugging` + `verification-before-completion` + `finishing-a-development-branch` **built** |
| **L5** Meta & self-improvement | skill-authoring + eval loop + `lessons.md` | all three + Anthropic `skill-creator` | no | `skill-eval` + `writing-skills` + `improve-loop` **built**; 7 eval sets; `lessons.md` + `backlog.json` seeded — **the meta-loop closes once eval runs** |
| **L6** Portability & install | `agentskills.io` spec + one `marketplace.json` | shared | n/a | injector + drift gate + installer + **hooks manifest** (`.claude-plugin/hooks/hooks.json`: SessionStart + PostToolUse edit-time validation) **built**; SDK namespacing planned |

Per-layer `CONTEXT.md` files are created under `skills/<layer>/` **when that layer's skills are
actually built** — not before (no empty stubs).

## Build order (evidence-gated — do not build all at once)

1. ~~L0 ponytail resident + invocation taxonomy + complexity router~~ — **built** (`using-architect`, `ponytail`, `complexity-router`).
2. ~~One L5 eval loop (borrow `skill-creator`'s `run_loop`)~~ — **built** (`skill-eval`): with-skill-vs-baseline harness via the local `claude` CLI; scorer self-tested. Run from a terminal where `claude` is logged in.
3. ~~The remaining ecosystem borrows → backlog~~ — **seeded** in `skills/l5-meta/improve-loop/backlog.json` (6 pending). Each ships only once it "moves a measured number" through `skill-eval`, driven by `improve-loop` — numbers land in `skill-eval`'s `runs/log.jsonl`, conclusions in `lessons.md`.

## Eval coverage (the loop's fuel)

7 sets in `skills/l5-meta/skill-eval/sets/` — one per **behaviorally-measurable** skill:
`l0-ponytail`, `complexity-router`, `tdd`, `debugging`, `verification-before-completion`,
`review`, `grilling`. Each asserts the behavior the skill mandates that a baseline won't show
(deterministic regex + LLM-judge for order-of-operations like test-first / reproduce-before-fix).

**Deliberately uncovered:** the multi-turn orchestrators (`to-prd`, `to-issues`, `writing-plans`,
`subagent-driven-development`, `writing-skills`) and mechanical helpers (`domain-modeling`,
`using-git-worktrees`, `finishing-a-development-branch`). The single-prompt harness can't measure an
interactive workflow honestly — forcing a set would manufacture false signal. They're verified by
the drift gate (structure) and real use, not by `skill-eval`.

Run all sets: `./scripts/eval.sh` (from a logged-in terminal — see below).

## L6 — install & enable

```bash
scripts/install.sh                 # dry-run: list the 17 skills it would link
scripts/install.sh --apply         # symlink each skill into ~/.claude/skills (one canonical copy)
scripts/install.sh --apply --copy  # copy instead (Windows / no-symlink sandboxes)
node scripts/check-rule-copies.mjs # CI drift gate: invariant phrases + per-skill conformance
```

Enable the **single** SessionStart injector (resident L0 ladder, mode-filtered, + slim
dispatcher) in `settings.json`:

```json
{ "hooks": { "SessionStart": [ { "hooks": [
  { "type": "command", "command": "node /ABS/PATH/Architect/hooks/session-start.mjs" }
] } ] } }
```

Set intensity via `PONYTAIL_LEVEL=lite|full|ultra|off` or `.architect.json`
(`{"ponytailLevel":"full"}`). `off` injects only the dispatcher pointer. There must be exactly
one SessionStart injector — do not also enable ponytail's or superpowers' own hooks.

## Research inputs

Source repos cloned for reference under `_research/` (`ponytail`, `superpowers-main`, `mattpocock-skills`).
The full borrow list (22 candidates) and conflict analysis live in the session record.

**Evaluated, not vendored:** `multica-ai/andrej-karpathy-skills` (`_research/karpathy-skills`). 3 of its
4 principles are already owned (simplicity → L0 ponytail; think-before-coding → L1 grilling/router;
goal-driven → L4 verification). Only its #3 *Surgical Changes* was non-redundant, so it was
cherry-picked into the L0 `ponytail` rules (and the resident injector) rather than added as a 4th
always-on behavioral skill — adding the whole skill would have violated the framework's anti-overlap law.
