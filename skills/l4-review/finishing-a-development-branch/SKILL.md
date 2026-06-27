---
name: finishing-a-development-branch
description: >
  Use when implementation is complete and you need to integrate the work — presents the
  four structured hand-off options (merge locally / open PR / keep / discard), gates every
  merge-or-PR claim behind verification-before-completion, and tears down the worktree
  created by using-git-worktrees. The integration step called by subagent-driven-development
  and review at the end of work.
license: MIT
metadata:
  layer: L4
  role: primitive
  invocation: model-invoked-primitive
  provenance: "Independently implemented from the ideas in superpowers' finishing-a-development-branch. Pairs with using-git-worktrees (L3) for teardown; routes completion claims through verification-before-completion (L4)."
---

# Finishing a development branch — L4 integration primitive

The hand-off at the end of work: prove the branch is clean, let the user pick how to
integrate it, execute that choice, and remove the worktree. Announce: "Finishing the
development branch." This is a model-invoked primitive so the user-invoked SDD orchestrator
can reach it (a user-invoked skill cannot call another user-invoked skill).

## Step 1 — Verify clean state (the gate)

Do **not** present options on unverified work. Route the completion claim through
`verification-before-completion` (L4): run the project's test command and read the actual
output. Evidence before assertions.

Tests fail → stop here. Report the failures and the count; do not offer merge/PR/discard.
You cannot integrate broken work, and you can't tell new failures from pre-existing ones.

Tests pass with output you've seen → continue.

## Step 2 — Determine the base branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```
No match → ask which branch this split from. Don't guess.

## Step 3 — Present exactly four options

```
Implementation complete and verified. What would you like to do?

1. Merge back to <base> locally
2. Push and open a Pull Request
3. Keep the branch as-is (handle it later)
4. Discard this work
```
No commentary — keep the menu terse. Open-ended "what next?" is the failure mode.

## Step 4 — Execute the choice

**1 · Merge locally** — `git checkout <base> && git pull && git merge <branch>`, then
**re-verify tests on the merged result** (the merge can break what passed in isolation),
then `git branch -d <branch>`. → teardown.

**2 · Open PR** — `git push -u origin <branch>` then `gh pr create` with a Summary (2–3
bullets) and Test Plan. The PR body must reflect verified state only — never claim "tests
pass" in a PR you haven't run `verification-before-completion` against. → **keep** worktree.

**3 · Keep as-is** — report the branch name and worktree path. Touch nothing.

**4 · Discard** — list what dies (branch, commits, worktree path) and require the user to
type `discard`. On exact confirmation: `git checkout <base> && git branch -D <branch>`. →
teardown.

## Step 5 — Worktree teardown

This removes the worktree `using-git-worktrees` (L3) created — it owns setup, this skill
owns cleanup. Only for options **1 and 4**:

```bash
git worktree list | grep "$(git branch --show-current)"   # in a worktree?
git worktree remove <worktree-path>
```
Options 2 and 3 **keep** the worktree (the PR may need follow-ups; "keep" means keep).

| Option | Merge | Push | Delete branch | Keep worktree |
|--------|:----:|:----:|:------------:|:------------:|
| 1 Merge | ✓ | – | ✓ | – |
| 2 PR | – | ✓ | – | ✓ |
| 3 Keep | – | – | – | ✓ |
| 4 Discard | – | – | ✓ force | – |

## Red flags

Never present options on unverified or failing work. Never claim a merge/PR is clean
without routing through `verification-before-completion`. Never re-skip the post-merge test
run on option 1. Never delete work without a typed `discard`. Never force-push or auto-clean
the worktree on options 2 or 3.

## Flow

Called by `subagent-driven-development` (L3) and `review` (L4) once all tasks pass. Gates on
`verification-before-completion` (L4). Pairs with `using-git-worktrees` (L3) — that skill
sets up the worktree, this one tears it down.
