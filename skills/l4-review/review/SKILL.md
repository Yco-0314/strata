---
name: review
description: >
  Use when asked to review code, audit a diff, or before a merge — runs three independent
  read-only lenses over the diff (correctness + spec compliance, over-engineering, security)
  and reports findings by severity. Triggers: "review this", "code review", "what can we
  delete", "is this over-engineered", "security review".
license: MIT
metadata:
  layer: L4
  role: discipline
  invocation: model-invoked-discipline
  provenance: "Three lenses, one entry: the two-stage spec+quality idea from superpowers (correctness); ponytail-review (over-engineering); Trail of Bits diff-scoped differential review (security). Read-only reviewer preset (VoltAgent), Opus tier (wshobson). Coverage pass from arxiv 2605.25665; verdict protocol in reviewer-contract.md."
---

# Review — L4, three lenses behind one entry

Review the **diff** (`BASE..HEAD`), not the whole tree. Each lens runs as a **separate
read-only reviewer** — tools `[Read, Grep, Glob]`, no Write/Edit/Bash, so a reviewer is
structurally unable to "fix it" silently — at the **Opus** tier. Lenses are independent;
run them in parallel and merge findings. `review` lists findings; it does not apply them
(pair with `simplify`/`--fix` or the implementer subagent).

## Lens 1 — Correctness + spec compliance (two stages, in order)

1. **Spec compliance first:** does the code do exactly what the task/issue specified —
   nothing missing, nothing extra? Over- and under-building both fail here.
2. **Then code quality:** bugs, edge cases, error handling, data flow, concurrency, perf.

Report each finding as **Critical / Important / Minor** with file:line and the why.

## Lens 2 — Over-engineering (the ponytail lens)

Hunt only unnecessary complexity. One line per finding:
`<file>:L<n>: <tag> <what>. <replacement>.`

- `delete:` dead code / speculative feature → nothing replaces it.
- `stdlib:` hand-rolled thing the standard library ships → name the function.
- `native:` dep/code doing what the platform already does → name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines → show the shorter form.

End with the only metric that matters: `net: -<N> lines possible.` Nothing to cut →
`Lean already. Ship.` A single smoke test / `assert` self-check is the ponytail minimum —
never flag it for deletion. Correctness, security, and perf are **out of scope** for this
lens (they belong to lenses 1 and 3). Carve-out: a seam with one implementation is allowed
when introduced under an active `codebase-design` / design-it-twice session.

## Lens 3 — Security (the Trail of Bits lens)

**Differential** review keyed to the diff: walk the changed lines through a security lens
(injection, authz, secrets, unsafe deserialization, path traversal, missing validation at
trust boundaries). Then **variant-hunt**: grep the codebase for the same pattern elsewhere —
one finding usually has siblings. Use CodeQL / Semgrep / SARIF if available; otherwise reason
from the diff. Report by severity with file:line.

## Coverage pass — the verification boundary

After the three lenses, run one explicit check the lenses can miss: **what changed behavior does
NO lens own?** List each contract clause / changed behavior and the lens that verifies it; any
behavior with **no owning lens is a verification-boundary gap** (the documented top failure
mode). Also flag any contract clause from
`to-issues` that no lens can check — that is contract-incompleteness surfacing at review time.
Report uncovered behaviors as `boundary:` findings at HIGH unless clearly trivial.

## Dispatch & verdict — the reviewer contract

Spawn each lens with the template in `reviewer-contract.md` (this dir). Non-negotiable: default
stance **REJECT** — the diff carries the burden of proof; evidence = file:line the reviewer read
itself (the implementer's narrative is not evidence; execution claims are settled by
`verification-before-completion` re-running them); every reviewer's LAST line is
`VERDICT: APPROVE | REJECT | ESCALATE` — no parseable verdict = REJECT (fail-closed). ESCALATE
means "cannot decide read-only" (needs execution or a human), distinct from "defective".

## Output

Merge the three lenses into one list, **each finding tagged `[TIER] <lens>-<category-slug>`** —
tier ∈ CRITICAL / HIGH / MEDIUM / LOW, slug e.g. `security-authz`, `correctness-edge-case`,
`overeng-stdlib` (vercel impact-tiered convention). Sorted highest-impact-first, so a CI gate
can fail on `CRITICAL`/`HIGH` only. For each:
the `[TIER] slug`, file:line, the lens, and the fix. Then hand to `verification-before-completion`
before anyone claims the review is clean, and to `finishing-a-development-branch` (L4) to integrate.
