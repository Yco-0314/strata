---
name: to-prd
description: Turn the current conversation into a PRD and publish it to the project issue tracker — synthesis of what you've already discussed, not a fresh interview.
disable-model-invocation: true
license: MIT
metadata:
  layer: L2
  role: orchestrator
  invocation: user-invoked
  provenance: "Adapted from mattpocock/skills to-prd. Default tracker = local .scratch/<feature>/ markdown."
---

# To PRD — L2 (user-invoked)

Take the current conversation and codebase understanding and produce a PRD. Do **not**
re-interview the user — synthesize what you already know. If there is a genuine gap that
changes the shape of the feature, invoke the `grilling` primitive to close just that gap,
then continue.

## Issue tracker

Default: local markdown under `.scratch/<feature>/`. Write the PRD to
`.scratch/<feature>/prd.md`. (GitHub Issues / Linear are configurable later via a setup
skill; this default needs no configuration and matches the repo convention.)

## Process

1. **Explore the repo** to understand the current state if you haven't. Use the project's
   `CONTEXT.md` glossary vocabulary throughout, and respect any ADRs in `docs/adr/` for
   the area you're touching.
2. **Sketch the seams** where the feature will be tested. Prefer existing seams; use the
   highest seam possible; the fewer new seams the better (ideal: one). Check the seams
   match the user's expectations before writing.
3. **Write the PRD** with the template below, then publish it to the tracker and mark it
   `ready-for-agent` (no further triage needed).

L0 `ponytail` applies: keep the PRD lean. A long user-story list is fine; speculative
scope is not. Cut anything you'd flag as YAGNI in code.

<prd-template>

## Problem Statement
The problem the user faces, from the user's perspective.

## Solution
The solution, from the user's perspective.

## User Stories
A long, numbered list, each: `As an <actor>, I want a <feature>, so that <benefit>`.
Cover all aspects of the feature.

## Implementation Decisions
Modules built/modified, their interfaces, technical clarifications, architectural
decisions, schema changes, API contracts, specific interactions. No file paths or code
snippets (they go stale) — exception: a prototype-derived snippet that encodes a decision
more precisely than prose (state machine, reducer, schema, type shape); inline only the
decision-rich part and note it came from a prototype.

## Testing Decisions
What makes a good test (test external behavior, not implementation details), which modules
are tested, and prior art for those tests in the codebase.

## Out of Scope
What is deliberately excluded.

## Further Notes
Anything else.

</prd-template>

Hand off to `to-issues` to slice the PRD into grabbable work.
