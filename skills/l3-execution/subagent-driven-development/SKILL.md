---
name: subagent-driven-development
description: Execute an implementation plan or set of issues by dispatching a fresh subagent per task, with two-stage review (spec compliance, then code quality) after each.
disable-model-invocation: true
license: MIT
metadata:
  layer: L3
  role: orchestrator
  invocation: user-invoked
  provenance: "Independently implemented from the ideas in superpowers' subagent-driven-development. Borrows: self-contained story-file (BMAD), model-tier-by-role (wshobson), read-only reviewer preset (VoltAgent), worktree-bound fan-out (claude-squad)."
---

# Subagent-driven development — L3 (user-invoked)

Execute the slices from `to-issues` (or a plan) by dispatching a **fresh subagent per
task**, each followed by a **two-stage review: spec compliance first, then code quality**.
Fresh context per task = no pollution; the review order prevents over/under-building.

**Never start on `main`/`master` without explicit consent.** First set up isolation via
`using-git-worktrees`.

## Setup

1. Read the issues/plan once. Extract every task's full text up front; create a todo list.
2. **Compile a self-contained brief per task** (the borrow): fold in the relevant PRD slice,
   the architecture/seam snippet, acceptance criteria, and the *why*. The implementer reads
   **only this brief** — never the plan file. This defeats context rot: the subagent needs
   zero other context.

## Per task (one implementer at a time — never parallel implementers on shared state)

1. **Dispatch the implementer** (model tier: **Sonnet**) with the self-contained brief. It
   may ask questions before *and* during — answer fully before it proceeds.
2. Implementer **follows `tdd`** (full mode for non-trivial logic), commits, self-reviews.
3. **Spec-compliance reviewer** (tier: **Opus**, tools **`[Read, Grep, Glob]`** — read-only
   so it structurally cannot edit), bound by the **L4 reviewer contract**
   (`skills/l4-review/review/reviewer-contract.md`): default-REJECT, evidence = file:line it
   read itself (the implementer's "tests pass" is not evidence), last line
   `VERDICT: APPROVE|REJECT|ESCALATE`, no verdict = REJECT. Confirms the code matches the
   spec — nothing missing, nothing extra. Issues → same implementer fixes → **re-review**.
   Do not proceed on "close enough".
4. **Code-quality reviewer** (Opus, read-only, same contract) — only after spec is ✅ (order
   matters). Runs the L4 over-engineering + correctness lenses. Issues → implementer fixes →
   re-review.
5. Mark complete.

## Parallel fan-out (independent domains only)

When tasks are genuinely independent (different files/subsystems, no shared state), dispatch
one agent per domain concurrently — and create **one worktree per agent as part of the spawn
step** (`using-git-worktrees`, worktree-bound fan-out) so they can't collide. Give each a
focused scope, explicit constraints, and a required output summary. On return: read each
summary, check for conflicts, run the full suite, integrate. Related failures → investigate
together, not in parallel.

## Long multi-phase work (fresh session per phase)

For work spanning many tasks across multiple sessions, don't run the whole thing in one
controller context — it rots. Group tasks into phases; at each phase boundary, checkpoint and
**start a fresh session**, handing the next phase ONLY its self-contained briefs (the same
compiled story-files) plus a one-paragraph state summary. Hard context isolation per phase beats
in-session execution for long runs (GSD). The per-task loop above is unchanged within a phase.

## After all tasks

Dispatch a final reviewer over the whole implementation, then hand to
`finishing-a-development-branch` (L4).

## Model tiers (the borrow — bind tier to role, not task)

Opus = review / architecture / security. Sonnet = implement / test / debug. Haiku = ops.
The dispatch picks the model from the **role**, not the session default.

## Red flags

Never: skip either review, run them out of order (quality before spec), proceed with open
issues, dispatch multiple implementers on shared state, make a subagent read the plan file
(give it the compiled brief), give a reviewer write tools, or fix a failed task by hand
(dispatch a fix subagent — manual edits pollute the controller's context).

ponytail (L0) governs the diff inside every task; `tdd` (L3) governs how each subagent tests.
