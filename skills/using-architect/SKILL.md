---
name: using-architect
description: >
  Use at the very start of any conversation, and before responding to any build,
  code, debug, or refactor request — establishes which skills auto-fire and which
  are human-invoked, and routes coding work through the complexity gate. Read this
  before EnterPlanMode and before writing any code.
license: MIT
metadata:
  layer: L0
  role: dispatcher
  invocation: model-invoked-discipline
  provenance: "Independently re-implements the dispatcher idea from obra/superpowers' using-superpowers, with a scoped auto-fire rule. See ADR 0001."
---

# Using Architect

The entry point for the framework. It resolves the one rule that lets ponytail,
superpowers, and mattpocock coexist: **who is allowed to auto-fire a skill.**

## The invocation law

Every skill is exactly one of two kinds:

- **model-invoked** — has a rich `description`; the model may reach for it
  autonomously. Reserved for **discipline** skills (cheap, always-safe behaviors).
- **user-invoked** — has `disable-model-invocation: true` and no trigger
  description; only the human can start it. Reserved for **orchestrators**
  (anything that changes scope or process).

## Three kinds of skill

This replaces superpowers' "even a 1% chance → you MUST invoke" rule, which caused
invocation storms and defeated the point of human-controlled orchestrators.

| Kind | Invocation | Auto-fires? | Examples |
|---|---|---|---|
| **Discipline** | model-invoked | yes — the model reaches for it | L0 `ponytail`; L4 `debugging`, `review`, `verification-before-completion` |
| **Primitive** | model-invoked | no — reached only via the router or a parent skill | L1 `complexity-router`, `grilling`, `domain-modeling` |
| **Orchestrator** | user-invoked (`disable-model-invocation: true`) | never — the human types it | L2 `to-prd`, `to-issues`, `writing-plans`; L3 `subagent-driven-development` |

The scoped rule:

> Auto-invoke only **discipline** skills. Reach a **primitive** only via the router or
> a parent skill, never spontaneously. Never start an **orchestrator** yourself — name
> it in one line and let the user choose.

Primitives are model-invoked (not user-invoked) for exactly one reason: **composition**.
A user-invoked skill cannot reach another user-invoked skill, so the shared engines
(`grilling`, `domain-modeling`) must be model-invoked for `to-prd` / `to-issues` to call
them. Being model-invoked makes them *reachable*, not *spontaneous* — the rule above keeps
them from firing on trivial messages.

If a discipline skill turns out wrong for the situation, you don't have to use it — but
you must have checked. If an orchestrator looks relevant, say so ("This looks like it
wants a plan — run `/writing-plans`?") and stop.

## On any coding task: gate first

Before writing code for a build/feature/refactor request, consult the L1
`complexity-router`. It decides whether the task is trivial (apply L0 `ponytail`
and go) or whether it crosses the threshold into the design→plan→TDD→review
pipeline. Do not skip the gate, and do not over-fire the pipeline on a one-liner.

## Order of operations

1. New conversation → this skill is your first read.
2. Build/code request → run `complexity-router` (L1).
3. Router says **trivial** → apply `ponytail` (L0), make the change, leave the
   one runnable check if the logic is non-trivial, `verification-before-completion`.
4. Router says **escalate** → run `grilling` (L1 primitive) to align, then name the
   user-invoked orchestrators for the user to start (`to-prd` / `to-issues` or
   `writing-plans` → `subagent-driven-development` → `review`). `ponytail` (L0) still
   governs the size of every diff inside it.
5. Bug/failure at any point → `debugging` (L4) auto-fires.

## What this skill is not

It does not itself plan, design, or write code. It is the traffic rule. Keep it
small — everything else loads lazily via the Skill tool, never by reading skill
files directly.
