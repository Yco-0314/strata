---
name: to-issues
description: Break a plan, spec, or PRD into independently-grabbable issues on the project issue tracker using tracer-bullet vertical slices.
disable-model-invocation: true
license: MIT
metadata:
  layer: L2
  role: orchestrator
  invocation: user-invoked
  provenance: "Adapted from mattpocock/skills to-issues. Default tracker = local .scratch/<feature>/ markdown."
---

# To Issues — L2 (user-invoked)

Break a plan into independently-grabbable issues using vertical slices (tracer bullets).

## Issue tracker

Default: local markdown under `.scratch/<feature>/`. One file per slice, e.g.
`.scratch/<feature>/001-<slug>.md`, published in dependency order so "Blocked by" can
reference real filenames.

## Process

### 1. Gather context
Work from what's already in the conversation. If the user passes an issue reference
(number, URL, or path), read its full body first.

### 2. Explore the codebase (optional)
Understand current state. Titles and descriptions use the `CONTEXT.md` glossary and
respect ADRs in the touched area. Look for prefactors that make the change easy —
"make the change easy, then make the easy change." Prefactoring goes first.

### 3. Draft vertical slices
Each issue is a **tracer bullet** — a thin slice cutting through ALL layers end-to-end
(schema, API, UI, tests), NOT a horizontal slice of one layer.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer.
- A completed slice is demoable or verifiable on its own.
- Prefactoring is its own first slice.
</vertical-slice-rules>

### 4. Quiz the user
Present the breakdown as a numbered list. Per slice show: **Title**, **Blocked by**
(which slices must finish first), **User stories covered**. Ask: is the granularity
right (too coarse / too fine)? Are the dependencies correct? Merge or split any? Iterate
until the user approves.

### 5. Publish
For each approved slice, write an issue with the template below and mark it
`ready-for-agent` (these are AFK-ready). Publish in dependency order. Do NOT modify the
parent.

<issue-template>
## Parent
Reference to the parent issue/PRD (omit if none).

## What to build
The end-to-end behavior of this slice, not layer-by-layer implementation. No file paths
or code snippets (exception: a prototype-derived decision snippet — trim to the
decision-rich part).

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by
Reference to the blocking slice, or "None — can start immediately".
</issue-template>

Approved slices hand off to L3 `subagent-driven-development`. L0 `ponytail` governs the
diff inside each slice.
