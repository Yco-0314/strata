---
name: complexity-router
description: >
  Use before starting any coding task, to decide whether it needs the full
  design→plan→TDD→review pipeline or just a minimal change under the L0
  constitution. Use when a build, feature, fix, or refactor request arrives and
  it is not obvious whether to plan it or just do it.
license: MIT
metadata:
  layer: L1
  role: router
  invocation: model-invoked-discipline
  provenance: "Architect-original. Implements ADR 0001 decision #4 (the complexity gate). The ambiguity pre-check is cherry-picked from multica-ai/andrej-karpathy-skills (Karpathy guideline #1)."
---

# Complexity router — L1

The gate that keeps the heavy pipeline off trivial work and on real features.
Misfiring either way is the framework's single biggest risk: too eager and a
one-liner drowns in ceremony; too lax and a migration ships with no design. So
the threshold is explicit and checkable, not a vibe.

## First: is the request ambiguous? (intent, not complexity)

Ambiguity and complexity are different axes — check intent before scoring complexity.
If the request admits more than one reasonable interpretation, or hinges on a key
decision the user didn't state, **surface the interpretations — don't silently pick
one.** Name them, recommend one with a one-line why, then either proceed on the
recommendation (stating the assumption) or ask first when guessing wrong is costly or
hard to undo. Trivial-in-size is not the same as clear-in-intent: a one-line change to
the wrong interpretation is still the wrong change, and this is the cheapest correctness
gate there is. (A deep, branch-by-branch interview is `grilling`'s job on the escalate
path; this is just the always-on reflex not to assume.)

## Decide: trivial or escalate

Score the task. **Any one** escalate-signal wins — escalate.

| | Trivial path (do it now) | Escalate (engage the pipeline) |
|---|---|---|
| **Reversibility** | Easy to undo (rename, config tweak, doc edit, one-liner) | Hard/irreversible: schema migration, data deletion, public API change, security boundary |
| **Blast radius** | ≤ 1–2 files, one module | Multi-file or cross-module |
| **Logic** | Single obvious path, no new branching | New branching, shared state, concurrency, a parser |
| **Surface** | No new public interface, no new dependency | New feature/capability, new public interface, or new dependency |
| **Ask** | "just fix/change X" | User explicitly asked for a plan, spec, or issues |

## Trivial path

1. Apply **L0 `ponytail`** — climb the ladder, shortest working diff.
2. If the logic is non-trivial, leave the ONE runnable check (ponytail's rule).
3. Run **`verification-before-completion`** before claiming it works.
4. Done. No grilling, no PRD, no subagent fan-out.

## Escalate path

Name the chain and let the **user start each orchestrator** (they are
user-invoked — see `using-architect`). Do not auto-run them.

1. **L1 `grilling`** — pin intent and edge cases; update `CONTEXT.md` vocabulary.
2. **L2** — `to-issues` (default, tracer-bullet slices) or `writing-plans`
   (heavyweight, multi-session).
3. **L3 `subagent-driven-development`** + merged `tdd` (rigor dialed up) +
   worktree isolation.
4. **L4 `review`** (three lenses: correctness · over-engineering · security) +
   `verification-before-completion`.

L0 `ponytail` still governs the size of every diff inside the pipeline — the
router escalates *process*, never solution size.

## Mid cases — default light, name the door

When it sits on the fence, **take the trivial path but flag the escalation in one
line** (ponytail style): ship the minimal version and say what would cross the
threshold —

> "Did the minimal change. This is one branch away from touching the auth
> boundary — want the full pipeline (`/grilling`) before we go further?"

Never stall waiting for the user to classify it. Default to motion, surface the
door.

## Self-check

This router's threshold is the thing most likely to be miscalibrated. When the
L5 eval loop exists, it gets its own eval set (trivial tasks that must NOT
escalate; risky tasks that MUST). Until then, prefer the light path and lean on
the mid-case flag rather than silent escalation.
