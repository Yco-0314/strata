---
name: tdd
description: >
  Use when implementing a feature or fixing a bug — writes the test first, watches it
  fail, then minimal code to pass. Rigor is dialed by task complexity: a single runnable
  check for trivial changes, full red-green-refactor for branching logic, shared state,
  or any bug fix. Triggers: "TDD", "red-green-refactor", "test-first".
license: MIT
metadata:
  layer: L3
  role: discipline
  invocation: model-invoked-discipline
  provenance: "Merge: the Iron-Law + watch-it-fail ideas from superpowers; mattpocock vertical-slice body + public-interface tests; ponytail 'ONE check' as the trivial default. Dialed by the L1 complexity-router."
---

# TDD — L3, dialed by complexity

Rigor is a **dial, not a constant** (ADR 0001): one skill, two modes — a single check for
trivial changes, full red-green-refactor for the rest.

| Change | Mode | What you do |
|---|---|---|
| Single obvious path, no branching | **check** (default) | One runnable check behind the logic (ponytail L0). No framework, no fixtures. |
| Branching logic, shared state, **any bug fix**, or user/plan opt-in | **full** | The Iron Law + red-green-refactor below. |

> Encode the threshold explicitly: a check is enough when the change is a single obvious
> path. Engage RED-GREEN the moment there is branching logic, shared state, or a bug being
> fixed. When the `complexity-router` escalated the task, you are in **full** mode.

## The Iron Law (full mode)

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote code before the test? Delete it — delete means delete. Don't keep it as reference,
don't "adapt" it. Implement fresh from the test. *If you didn't watch the test fail, you
don't know it tests the right thing.*

## Vertical slices, never horizontal (the body)

Do **not** write all tests then all implementation — that tests *imagined* behavior and
produces tests coupled to shape, not behavior. One test → one implementation → repeat;
each test responds to what the last cycle taught you.

```
WRONG (horizontal):  RED: t1 t2 t3   GREEN: i1 i2 i3
RIGHT (vertical):    RED→GREEN t1→i1,  RED→GREEN t2→i2,  …
```

### The cycle

1. **RED** — write one minimal test for one behavior, named for the behavior. Real code,
   no mocks unless unavoidable. Use the `CONTEXT.md` glossary for test/interface names.
2. **Verify RED (mandatory)** — run it; confirm it *fails* (not errors) and for the right
   reason. Passes immediately? You're testing existing behavior — fix the test.
3. **GREEN** — the simplest code that passes. No options, no speculative params (ponytail
   YAGNI still governs the diff).
4. **Verify GREEN (mandatory)** — test passes, other tests still pass, output pristine.
5. **REFACTOR** — only while green: remove duplication, deepen modules (run `codebase-design`
   for the vocabulary). Never refactor while RED.

## Good tests

Test **behavior through the public interface**, not implementation. A good test reads like
a spec ("user can checkout with valid cart") and survives an internal refactor. Warning
sign: a test breaks when you rename an internal function though behavior is unchanged — it
was testing implementation.

## Rationalizations → reality (full mode)

| Excuse | Reality |
|---|---|
| "I'll test after" | Tests-after pass immediately and prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic; no record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost. Unverified code is the debt. |
| "Too simple to test" | Simple code breaks; the check takes 30s. |
| "Hard to test" | Hard to test = hard to use. Fix the interface. |

Any of these in **full** mode → stop, delete, start test-first. In **check** mode they
don't apply — a single check is the whole obligation.

Bug fix → always full: write the failing test that reproduces it first; the test proves the
fix and prevents regression. Pairs with L4 `debugging`.
