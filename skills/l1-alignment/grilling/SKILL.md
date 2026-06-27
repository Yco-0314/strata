---
name: grilling
description: >
  Use when the complexity-router escalates a task, when a parent skill (to-prd,
  to-issues, writing-plans) needs to pin down intent before building, or when the
  user wants to stress-test a plan or design — or uses any "grill" trigger phrase.
  A relentless one-question-at-a-time interview that resolves the design tree.
license: MIT
metadata:
  layer: L1
  role: primitive
  invocation: model-invoked-primitive
  provenance: "Adapted from mattpocock/skills grilling (the composable interview engine). Kept model-invoked so user-invoked orchestrators can reach it."
---

# Grilling — L1 alignment primitive

Interview the user relentlessly about every aspect of this plan or design until you
reach a shared understanding. Walk down each branch of the design tree, resolving
dependencies between decisions one by one. **For each question, give your recommended
answer** — never just an open prompt.

## Rules

- **One question at a time.** Wait for the answer before the next. Asking several at
  once is bewildering and gets shallow answers.
- **If the codebase can answer it, read the codebase instead of asking.** Don't spend
  the user's attention on facts you can find yourself.
- **Resolve dependencies in order.** A decision that gates other decisions comes first;
  don't ask about leaf details before the branch they hang off is settled.
- **Recommend, don't interrogate blindly.** Each question carries your proposed answer
  and a one-line why, so the user can just confirm or redirect.

## Within Architect

- This is a **composable primitive**, not a top-level command. `to-prd`, `to-issues`,
  and `writing-plans` invoke it when they hit a gap; the `complexity-router` routes
  here on the escalate path. The human can also trigger it directly with a "grill" phrase.
- As decisions land, fold new domain terms into the project's `CONTEXT.md` glossary,
  and flag any decision that is architectural (irreversible, cross-cutting) as
  ADR-worthy — note it so `domain-modeling` / an ADR can capture it. Grilling surfaces
  decisions; it does not have to record them itself.
- L0 `ponytail` still applies to the *output*: recommend the lazy option when two
  answers are equivalent, and don't grill about complexity the task doesn't need.

Stop when the design tree has no unresolved branch that would change what gets built.
