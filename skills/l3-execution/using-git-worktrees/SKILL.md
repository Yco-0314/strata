---
name: using-git-worktrees
description: >
  Use when starting feature work that needs isolation, or before executing implementation
  plans — creates an isolated git worktree with smart directory selection, ignore-safety
  verification, and a clean test baseline. Called by subagent-driven-development to bind
  isolation into the dispatch step.
license: MIT
metadata:
  layer: L3
  role: primitive
  invocation: model-invoked-primitive
  provenance: "Independently implemented from the ideas in superpowers' using-git-worktrees. Worktree-bound fan-out borrowed from smtg-ai/claude-squad."
---

# Using git worktrees — L3 isolation primitive

Worktrees give each task/agent its own checkout sharing one repo, so parallel work can't
collide. Announce: "Setting up an isolated worktree."

## Directory selection (priority order)

1. `.worktrees/` exists → use it (wins over `worktrees/`).
2. `worktrees/` exists → use it.
3. `grep -i "worktree.*director" CLAUDE.md` → use the stated preference, don't ask.
4. None → ask: `.worktrees/` (project-local, hidden) or a global location.

## Safety (project-local dirs only)

Verify the dir is git-ignored before creating anything:
```bash
git check-ignore -q .worktrees || git check-ignore -q worktrees
```
Not ignored? Add it to `.gitignore`, commit, then proceed — otherwise worktree contents
get tracked. (Global dirs outside the repo need no check.)

## Create → setup → verify baseline

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
git worktree add "$LOCATION/$BRANCH" -b "$BRANCH" && cd "$LOCATION/$BRANCH"
```
Then auto-detect setup (`package.json`→`npm install`, `Cargo.toml`→`cargo build`,
`pyproject.toml`→`poetry install`, `go.mod`→`go mod download`) and run the project's tests
to confirm a clean baseline. Tests fail at baseline → report and ask before proceeding (you
can't tell new bugs from pre-existing ones otherwise). Then report: path, test count, ready.

## Worktree-bound fan-out (the borrow)

When a parent skill dispatches **N parallel agents** over independent domains, create N
worktrees **as part of the spawn step** — one per agent — so isolation is an invariant of
the fan-out, not a thing the caller must remember to pair. This fuses parallel-dispatch and
isolation into one operation: parallel agents can never touch the same tree.

Windows / sandboxes: `git worktree` may need privilege — fall back to separate clones if
`worktree add` fails.

## Red flags

Never create a project-local worktree without verifying it's ignored. Never skip the
baseline test. Never proceed past failing baseline tests without asking. Pairs with
`finishing-a-development-branch` (L4) for cleanup.
