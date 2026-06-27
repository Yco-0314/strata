---
name: find-skills
description: >
  Use before recommending, installing, or adding to the backlog any EXTERNAL skill, plugin, or
  dependency — gates the candidate on reputation (adoption count, verified source, active
  maintenance) so the framework doesn't take on untrusted supply chain. Triggers: "should we use
  this skill/library", "find a skill for X", "is this package trustworthy", "add an external borrow".
license: MIT
metadata:
  layer: L5
  role: primitive
  invocation: model-invoked-primitive
  provenance: "Borrows the reputation gate from vercel-labs/find-skills. A trust GATE, not a behavior-changer — no skill-eval Δ expected (like complexity-router)."
---

# find-skills — L5 supply-chain trust gate

Before any external skill/plugin/dependency enters the framework — recommended to the user, added
to `backlog.json`, or installed — run it through this gate. The framework's whole backlog is
external borrows; this is the front door.

## The three checks

1. **Adoption** — install count (skills.sh leaderboard rank, `npm` weekly downloads), GitHub stars,
   fork/issue activity. Above a sane threshold for its age?
2. **Verified source** — the repo exists, is owned by the claimed author, and has recent commits
   (not abandoned). A named org/firm (e.g. Trail of Bits) is a strong signal; an anonymous 0-star
   pre-release is a weak one.
3. **Non-overlap** — does it duplicate something the framework already has? (The anti-overlap law —
   a high-reputation skill is still a SKIP if it re-does an existing one.)

**Install count is a WEAK, gameable signal** (self-reported telemetry) — necessary, not sufficient.
Pair it with verified source + active maintenance.

## Verdict (one line per candidate)

- **PULL** — reputation + source + maintenance all clear, and it's non-overlapping → vendor it (then
  it still must clear `skill-eval`/`skill-validator` before shipping).
- **PATTERN-ONLY** — the idea is good but the package is untrusted (low adoption, pre-release,
  unmaintained) → lift the *technique* into your own code, don't vendor the dependency.
- **SKIP** — duplicates an existing skill, or unmaintained with no redeeming pattern.

## Why no Δ is expected

This is a trust gate, not a behavior-changer — like `complexity-router`, it has no `skill-eval` Δ
to chase. Its value is preventing a supply-chain mistake, measured by what it keeps OUT.

Retroactive check (it agrees with calls already made): the `skill-tools` PostToolUse plugin was
**PATTERN-ONLY** (early/unproven at the time — Strata lifted the hook pattern rather than vendoring the dependency);
Trail of Bits' security pack was **PULL**-grade (5.9k stars, active security firm) and its
diff-scoped review technique was borrowed into `review`. Composes with `improve-loop` (gate a borrow
before it reaches the backlog) and `skill-eval` (a PULL still has to move a number).
