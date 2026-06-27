---
name: writing-plans
description: Use to author a heavyweight, junior-engineer-proof implementation plan for LARGE multi-session work — exact file paths, complete code, and 2-5 minute TDD steps. The opt-in heavy path; for routine work prefer to-issues. Trigger phrases include "write a detailed plan", "full implementation plan", "spec this out before coding".
disable-model-invocation: true
license: MIT
metadata:
  layer: L2
  role: orchestrator
  invocation: user-invoked
  provenance: "Independently implemented from the ideas in superpowers' writing-plans (heavyweight TDD plan path). Borrows: OpenSpec ADDED/MODIFIED/REMOVED delta headers; GitHub Spec-Kit /analyze coverage-matrix gate; Amazon Kiro EARS requirement template."
---

# Writing Plans — L2 (user-invoked)

The **heavyweight** planning path: one exhaustive document a fresh engineer with zero
codebase context can execute step-by-step. Use it only for LARGE, multi-session,
multi-file work where the plan must survive a session boundary or a handoff.

> For routine features, `to-issues` (tracer-bullet slices on the tracker) is the DEFAULT —
> lighter, tracker-native, no long-lived doc. The L1 complexity router decides; pick this
> path deliberately. Don't write a 500-line plan for a 20-line change.

Assume the executing engineer is skilled but knows almost nothing about this toolset,
domain, or what good test design looks like here. Document everything. DRY, YAGNI, TDD,
frequent commits. Save to `docs/plans/YYYY-MM-DD-<feature>.md`.

## 1. Capture requirements as EARS clauses

Before tasks, pin behavior down with the Kiro **EARS** template — one row per clause, each
phrased as a single testable requirement:

> `WHEN`/`IF`/`WHILE`/`WHERE` [trigger] THE SYSTEM SHALL [behavior]

Give every clause an id (`R1`, `R2`, …). Each clause becomes **at least one test** in the
plan below — this list is exactly what the L3 `tdd` skill consumes as its test list.

## 2. Write the plan as a delta, not a full regenerate

A plan describes only **what shifts**. Use OpenSpec-style delta headers so a reader diffs
intent at a glance and you never re-describe untouched behavior:

- `## ADDED` — new capabilities / files.
- `## MODIFIED` — changed behavior (state old → new).
- `## REMOVED` — deleted behavior (and why it's safe).

## 3. Plan header

```markdown
# [Feature] Implementation Plan

> **For the executor:** hand off to L3 subagent-driven-development to implement task-by-task.

**Goal:** [one sentence]
**Architecture:** [2-3 sentences on approach]
**Tech stack:** [key libs]
**Requirements:** R1…Rn (see EARS table)
```

Titles, names, and decisions use the `CONTEXT.md` glossary and respect ADRs in the touched
area. Look for prefactors — "make the change easy, then make the easy change"; prefactoring
is its own first task.

## 4. Bite-sized tasks (2-5 min steps)

Each task lists exact paths, then one-action steps the executor cannot misread:

````markdown
### Task N: [Component]  (covers R3, R4)

**Files:** Create `src/x.py` · Modify `src/y.py:120-145` · Test `tests/test_x.py`

1. **Write the failing test** — full code, no "add a test".
2. **Run it, confirm it fails** — exact command + expected failure message.
3. **Write minimal implementation** — complete code, not "add validation".
4. **Run it, confirm it passes** — exact command + expected output.
5. **Commit** — `git commit -m "..."`.
````

Complete code in the plan. Exact commands with expected output. No prose stand-ins.

## 5. Coverage-matrix gate (pre-execution)

Before handoff, run a Spec-Kit `/analyze`-style consistency pass. Build a matrix and **fail
the plan** if either direction has orphans:

- Every requirement (R*) maps to **>= 1 task**. An unmapped requirement = a feature nobody builds.
- Every task cites **>= 1 requirement**. An uncited task = scope creep or a YAGNI violation.

| Req | Tasks |
|-----|-------|
| R1  | Task 1, Task 3 |
| …   | … |

List both orphan sets explicitly; resolve every one before the plan is "done".

## 6. Execution handoff

The plan is data; execution is L3. Once the matrix is clean, hand off to
**`subagent-driven-development`** (fresh subagent per task, review between tasks, this
session) — which dispatches through the merged `tdd` discipline and runs inside
`using-git-worktrees`. L4 `review` gates each task; L0 `ponytail` governs the diff size
inside every step.
