---
name: domain-modeling
description: >
  Use when a decision or a domain term needs to be *recorded* — when grilling
  surfaces a resolved term or an architectural choice, when to-prd/to-issues need
  the glossary written down, or when the user wants to pin down the ubiquitous
  language, sharpen fuzzy terminology, or capture an architectural decision (ADR).
  The skill that maintains CONTEXT.md and docs/adr/ — the deep-module shared vocabulary.
license: MIT
metadata:
  layer: L1
  role: primitive
  invocation: model-invoked-primitive
  provenance: "Adapted from mattpocock/skills domain-modeling (CONTEXT.md ubiquitous language + ADRs). Kept lean and model-invoked so grilling and the L2 planners can reach it."
---

# Domain modeling — L1 alignment primitive

Actively build and sharpen the project's domain model, then **write it down the moment
it crystallises**. This is the *recording* primitive: `grilling` surfaces decisions and
domain terms during alignment, and `to-prd` / `to-issues` consume the glossary —
domain-modeling is what persists them. Merely *reading* `CONTEXT.md` for vocabulary is a
one-line habit any skill can do; reach for this skill when you are *changing* the model.

The goal is a **shared vocabulary** precise enough that every downstream skill names the
same concept the same way — the deep-module boundary expressed in language.

## Where it lives

- **Single context (most repos):** one `CONTEXT.md` at the repo root; ADRs in `docs/adr/`.
- **Multiple contexts:** a `CONTEXT-MAP.md` at the root points to per-context `CONTEXT.md`
  files (e.g. `src/ordering/CONTEXT.md`), with system-wide ADRs in `docs/adr/` and
  context-specific ones beside each `CONTEXT.md`.

Create files **lazily** — only when there's something to write. No `CONTEXT.md`? Create it
when the first term resolves. No `docs/adr/`? Create it when the first ADR is warranted.

## During the session

- **Challenge against the glossary.** When a term conflicts with `CONTEXT.md`, call it out:
  "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"
- **Sharpen fuzzy language.** Propose a precise canonical term for overloaded ones:
  "You said 'account' — do you mean the Customer or the User? Those are different things."
- **Stress-test with scenarios.** Invent concrete edge cases that force the user to be
  precise about the boundaries between concepts.
- **Cross-reference the code.** If what the user states contradicts the code, surface it:
  "Your code cancels entire Orders, but you said partial cancellation is possible — which?"
- **Update inline, don't batch.** When a term resolves, write it to `CONTEXT.md` right then.

## CONTEXT.md — the glossary, nothing else

It is a glossary, **devoid of implementation detail** — not a spec or a scratchpad.

```md
# {Context Name}
{One or two sentences on what this context is.}

## Language
**Order**: A customer's request to purchase goods. _Avoid_: Purchase, transaction
**Invoice**: A request for payment sent after delivery. _Avoid_: Bill, payment request
```

Be opinionated: when several words mean the same thing, pick one and list the rest under
`_Avoid_`. Keep definitions to one or two sentences — say what it *is*, not what it *does*.
Only include terms specific to this project; general programming concepts don't belong.

## docs/adr/ — record decisions sparingly

Offer an ADR **only when all three hold** — otherwise skip it:

1. **Hard to reverse** — changing your mind later costs something real.
2. **Surprising without context** — a future reader will wonder "why this way?".
3. **A real trade-off** — there were genuine alternatives and you picked one for reasons.

Number sequentially (`docs/adr/0001-slug.md`, …). An ADR can be a single paragraph —
the value is recording *that* a decision was made and *why*:

```md
# {Short title of the decision}
{1-3 sentences: the context, what we decided, and why.}
```

Add Status / Considered Options / Consequences sections only when they earn their place.

## Within Architect

- **Composable primitive**, not a top-level command. `grilling` (L1) hands off resolved
  terms and ADR-worthy decisions here; the `complexity-router` may route here directly.
  `to-prd` and `to-issues` (L2) read the resulting glossary — keep it current for them.
- L0 `ponytail` applies to the output: don't manufacture terms or ADRs the project doesn't
  need. The lightest model that keeps the vocabulary shared is the right one.

Done when every resolved term lives in `CONTEXT.md` and every irreversible, surprising,
traded-off decision has its ADR — nothing more.
