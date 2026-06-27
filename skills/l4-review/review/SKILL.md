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
  provenance: "Three lenses, one entry: the two-stage spec+quality idea from superpowers (correctness); ponytail-review (over-engineering); Trail of Bits diff-scoped differential review (security). Read-only reviewer preset (VoltAgent), Opus tier (wshobson)."
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
"Distrust the report" — verify each claim against the actual code before trusting it.

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

## Output

Merge the three lenses into one list, **each finding tagged `[TIER] <lens>-<category-slug>`** —
tier ∈ CRITICAL / HIGH / MEDIUM / LOW, slug e.g. `security-authz`, `correctness-edge-case`,
`overeng-stdlib` (vercel impact-tiered convention). The list is sorted highest-impact-first, so a
reader addresses the worst thing first and a CI gate can fail on `CRITICAL`/`HIGH` only. For each:
the `[TIER] slug`, file:line, the lens, and the fix. Then hand to `verification-before-completion`
before anyone claims the review is clean, and to `finishing-a-development-branch` (L4) to integrate.
