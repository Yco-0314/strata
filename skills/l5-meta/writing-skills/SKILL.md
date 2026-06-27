---
name: writing-skills
description: >
  Use when authoring a new Architect skill or editing an existing one — when the
  user wants to write, draft, revise, refactor, or split a SKILL.md, fix a skill
  that fires unreliably or gets skipped, prune a bloated skill, or decide a skill's
  layer/role/invocation. Trigger phrases: "write a skill", "author a skill", "edit
  this skill", "this skill isn't working", "make a skill". Not for running the eval
  harness itself (that is skill-eval).
license: MIT
disable-model-invocation: true
metadata:
  layer: L5
  role: orchestrator
  invocation: user-invoked
  provenance: >
    Merges mattpocock writing-great-skills (theory/glossary), the ideas in superpowers' writing-skills
    (TDD-for-process method), and ponytail's measured-number ship gate. Borrows: Anthropic
    best-practices degrees-of-freedom field, WHEN-only description rule, skill-eval ship gate.
    ADR 0001, CONTEXT-MAP L5.
---

# writing-skills — the L5 authoring method

The deliberate, human-driven method for writing an Architect skill that **earns its
context budget**. It fuses three disciplines into one division of labor:

- **Theory** — *why* a skill works (mattpocock's glossary vocabulary).
- **Method** — *how* to author one (superpowers' TDD-for-process loop).
- **Gate** — *whether* it ships (ponytail's "must move a measured number" via `skill-eval`).

This skill is user-invoked: authoring is a deliberate act. It hands the finished skill
to `skill-eval` (L5) — the only judge of whether the skill ships.

## The root virtue: predictability

A skill exists to wrangle determinism out of a stochastic system. **Predictability** —
the agent taking the same *process* every run (not producing the same *output*) — is
the root virtue. Cost and brevity are symptoms of it, not rivals. Every rule below is a
lever on predictability. The per-line test that governs the whole document:

> **Does this line change behaviour versus the model's default?** If not, it is a
> **no-op** — you are paying context load to say nothing. Delete it.

## Step 0 — Classify before you write (the law)

Every skill's frontmatter is fixed by ADR 0001's invocation taxonomy. Decide three
fields *first*; they are not stylistic:

| Field | Values | The rule |
|-------|--------|----------|
| `layer` | L0–L6 | Where it sits on the altitude map (see CONTEXT-MAP.md). |
| `role` | discipline · primitive · orchestrator | What it is. |
| `invocation` | model-invoked-discipline · model-invoked-primitive · user-invoked | Derived from role. |

**Invocation is derived, not chosen freely:**

- **discipline** & **primitive** → model-invoked. Keep a rich `description`; no disable flag. The agent (or another skill) must reach it autonomously.
- **orchestrator** → user-invoked. Set `disable-model-invocation: true`; the `description` becomes human-facing. Zero context load, but the human is the index that must remember it.
- **A user-invoked skill cannot reach another user-invoked skill** (no description to fire). If two orchestrators need a shared engine, that engine **must be a primitive** (model-invoked), or external reference.

## The Iron Law — no skill without a failing test first

```
NO SKILL WITHOUT A FAILING PRESSURE-TEST FIRST.
```

Applies to **new skills AND edits**. If you didn't watch an agent fail *without* the
skill, you don't know what the skill needs to teach. Writing the skill first means you
are guessing at rationalizations instead of capturing them.

**No exceptions:** not for "just a section", not for "obvious" additions, not for "docs
only". Wrote the skill before the test? Delete it; start from RED. **Violating the
letter is violating the spirit.**

## RED → GREEN → REFACTOR (TDD for process)

1. **RED — watch it fail.** Write a pressure scenario (combine pressures for discipline
   skills: time + sunk cost + authority + exhaustion). Run a **subagent against it
   without the skill**. Record the baseline behaviour and the **exact rationalizations,
   verbatim** — those quotes become your rationalization table.
2. **GREEN — write the minimal skill.** Address *those specific* failures. No content
   for hypothetical cases. Re-run the scenario with the skill; the agent should comply.
3. **REFACTOR — close loopholes.** New rationalization surfaces? Add an explicit counter.
   Re-test until bulletproof. Capture every excuse in a `| Excuse | Reality |` table and
   a "Red Flags — STOP" list so the agent can self-check under pressure.

## Authoring standards (enforced)

### The description is WHEN-only — never WHAT

The `description` states *when to fire*, in third person, ≤1024 chars. **Do NOT summarize
the workflow body.** A WHAT-summary is a documented failure: the agent follows the summary
and *skips the body* — e.g. a description saying "review between tasks" caused one review
where the body's flowchart mandated two. Triggers, not process:

```yaml
# BAD — summarizes workflow; the agent follows this and skips the body
description: Use when executing plans — dispatch a subagent per task with review between
# GOOD — pure triggering conditions
description: Use when executing implementation plans with independent tasks
```

One trigger per **branch**; synonyms that rename one branch are **duplication** — collapse
them. Front-load the **leading word** that does the invocation work.

### Tag each section with its degrees of freedom

Match specificity to fragility (Anthropic best-practices). State it where it isn't obvious:

- **High freedom** — prose, "use judgement". Many valid paths, context decides (an *open field*). E.g. a review heuristic.
- **Medium freedom** — a preferred pattern / parameterized template, variation allowed.
- **Low freedom** — an exact command, "run this, do not modify" (a *narrow bridge with cliffs*). Fragile, sequence-critical, irreversible. E.g. a migration.

Over-constraining an open field wastes tokens and rigidifies good judgement;
under-constraining a narrow bridge invites the agent off the cliff.

### Steer with leading words, completion criteria, legwork

- **Leading word** — a compact concept already in the model's pretraining (*lesson*, *tracer bullets*, *red*) repeated as a *token, never a sentence*. It anchors a region of behaviour in the fewest tokens. A leading word too weak to beat the default is a no-op; the fix is a *stronger* word (*relentless* over *be thorough*), not more prose.
- **Completion criterion** — end every step on a *checkable* condition ("every modified model accounted for", not "produce a change list"). A vague bound invites **premature completion** — the agent's attention slips to *being done*.
- **Legwork** — the digging the agent does inside a step. A demanding completion criterion drives it; a leading word (*comprehensive*) raises it.

### Information hierarchy — push reference down the ladder

Three rungs, ranked by how immediately the agent needs the material:

1. **In-skill steps** — ordered actions, the primary tier.
2. **In-skill reference** — rules/facts consulted on demand (often a legitimately flat peer-set; not a smell).
3. **External reference** — disclosed behind a **context pointer** to a sibling file (`GLOSSARY.md`-style), loaded only when the pointer fires.

**Progressive disclosure** is the move down the ladder. The test is **branching**: inline
what *every* branch needs; disclose what only *some* reach. A context pointer's *wording*,
not its target, decides how reliably the agent reaches the material — sharpen the wording
before pulling material back inline. Keep a concept's definition, rules, and caveats
**co-located** under one heading.

## When to split

Each cut spends one of two loads — split only when the cut earns it:

- **By invocation** — split off a model-invoked skill when a distinct leading word should trigger it independently, or another skill must reach it. You pay permanent **context load** for its always-loaded description.
- **By sequence** — split a run of steps when the steps still ahead (**post-completion steps**) tempt the agent to rush the one in front (**premature completion**). Hiding them only works across a real context boundary (a user-invoked hand-off or subagent dispatch) — an inline call clears nothing.

## Prune: the five failure modes

Diagnose a misbehaving skill against these. Each pairs with its cure:

| Failure mode | Symptom | Cure |
|--------------|---------|------|
| **Premature completion** | step ends before truly done | sharpen the completion criterion first; only then hide post-completion steps by splitting |
| **Duplication** | one meaning in two places | one **single source of truth**; collapse to a leading word |
| **Sediment** | stale layers nobody dares delete | a pruning discipline; check every line for **relevance** |
| **Sprawl** | too long even when all-live, all-unique | push reference down the ladder; split by branch/sequence |
| **No-op** | a line the model already obeys by default | the per-line test — delete, or upgrade a weak leading word |

Hunt **no-ops sentence by sentence**, not just line by line: when one fails the test,
delete the whole sentence rather than trim words. Be aggressive.

## The ship gate — must move a measured number

ponytail, superpowers, and mattpocock all author by taste, with no measurement loop. A
skill ships **only if it moves a measured number.** After GREEN/REFACTOR, route the skill
through **`skill-eval`** (L5):

- Write an eval set whose assertions target *the behaviour the skill mandates that
  baseline won't show* — not facts a good baseline already produces.
- `Δ > 0` → the skill changes behaviour in the measured direction. **Ship it.**
- `Δ = 0` → either the trap is too easy (try a weaker `EVAL_MODEL`), or the skill isn't
  pulling its weight. Either way, ask: **does this skill earn its context budget?**

No Architect skill — and no ecosystem borrow — ships until it clears a Δ here.

## Flow

```
classify (Step 0)  →  RED (baseline fail)  →  GREEN (minimal skill)
  →  REFACTOR (close loopholes)  →  skill-eval (Δ>0?)  →  ship
```

Upstream: this skill is reached deliberately by the human. Downstream gate: **`skill-eval`**
(L5) — the only judge of whether the skill ships. Cross-ref CONTEXT-MAP.md for the layer
map and ADR 0001 for the invocation law.
