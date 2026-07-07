# Strata

> A self-measuring skills framework for Claude Code & Codex — best-of-breed engineering
> skills stacked by altitude, where **every skill has to prove it moves a measured number.**

Most skill repos are a *pile* of skills. Strata is three things at once:

1. **A curated stack, by altitude (L0–L6).** It combines `ponytail` (a behavioral
   constitution), `superpowers` (a process engine), and `mattpocock/skills` (a composable
   toolbox) — plus 8 vetted ecosystem borrows — not heaped together but **layered**, with one
   invocation law that resolves the conflicts between them (see `docs/adr/0001-…`).
2. **A measurement bench for skills.** Two eval modalities — `skill-eval` (single-shot Δ) and
   `drift-eval` (multi-turn drift) — plus a quality gate (`skill-validator`) and an edit-time
   hook. A skill ships only if it moves a measured number or removes a documented failure.
3. **A self-improvement loop with an evidence ledger.** `improve-loop` runs the cycle and
   `lessons.md` records every measurement and decision. Strata measured *itself*, caught its
   own eval bugs, built a second modality when the first couldn't see a skill's value, and
   produced an evidence-backed theory of which kind of skill helps where.

The differentiator isn't *which* skills it has — it's that **it knows which of its skills
actually work, with numbers.**

## The layers

| Layer | Owns | What |
|------|------|------|
| **L0** constitution | `ponytail` | always-on minimal-code ladder (resident, model-tier-gated) |
| **L1** alignment | `complexity-router`, `grilling`, `domain-modeling` | pin intent before building |
| **L2** planning | `to-prd`, `to-issues`, `writing-plans` | spec → plan → tracer-bullet issues |
| **L3** execution | `subagent-driven-development`, `tdd`, `using-git-worktrees` | dispatch + dialed TDD + isolation |
| **L4** review & verify | `review` (3 lenses), `debugging`, `verification-before-completion`, `finishing-a-development-branch` | correctness · over-eng · security; evidence gate |
| **L5** meta | `skill-eval`, `drift-eval`, `skill-validator`, `improve-loop`, `find-skills`, `writing-skills` | measure, gate, improve the skills themselves |
| **L6** portability | `marketplace.json`, `install.sh`, hooks, drift gate | one source → many hosts |

`CONTEXT-MAP.md` is the full map; `using-architect` is the in-session dispatcher.

## What measuring it revealed (the evidence, not vibes)

- **Process skills** (`grilling`, `debugging`, `review`, `tdd`) — value shows **single-shot**
  (+50–100% on sonnet): they add a step the baseline skips.
- **Instinct skills** (`ponytail`, `complexity-router`) — converge single-shot but show value
  **multi-turn** (+67–100%): the baseline has the instinct yet *drifts off it under pressure*;
  the resident skill re-asserts it every turn. **This is the empirical case for ponytail being L0-resident.**
- **Robust instinct** (`verification-before-completion`) — low marginal value either way; a
  strong model already refuses to claim "done" without evidence.
- Along the way the loop caught its **own** eval bugs (router first-line, ponytail phrasing,
  verification quote-vs-refute, the hook's own regex) by reading real transcripts. See `lessons.md`.

## Install

```bash
# Claude Code — RECOMMENDED: install as a namespaced plugin (skills become strata:<name>,
# so they never collide with skills you already have from other repos/plugins)
claude plugin marketplace add <path-or-git-url-to-this-repo>
claude plugin install strata@strata
# then optionally wire the two hooks into ~/.claude/settings.json (snippet below)

# Alternative (flat install into ~/.claude/skills) — only if you have NO same-named skills;
# this overwrites colliding names, so prefer the plugin route above.
scripts/install.sh --apply

# Codex — ~/.agents/skills; add ponytail to a project's .agents/AGENTS.md for always-on
scripts/install.sh --host codex --apply

# claude.ai web — upload the pure-instruction skills via Customize → Skills (no shell/hooks/subagents)
```

Hooks for Claude Code (`~/.claude/settings.json`, merge into any existing `"hooks"`):
```json
{ "hooks": {
  "SessionStart": [{ "hooks": [{ "type": "command", "command": "node <REPO>/hooks/session-start.mjs" }] }],
  "PostToolUse":  [{ "matcher": "Write|Edit|MultiEdit",
                     "hooks": [{ "type": "command", "command": "node <REPO>/hooks/skill-postedit.mjs" }] }]
}}
```
> Claude Code bug #26251: `disable-model-invocation: true` currently also blocks the `/name`
> slash command. Until fixed, invoke user-invoked orchestrators by asking ("use to-issues to …").

## Use

- **Small change** → the `complexity-router` calls it trivial; `ponytail` keeps the diff minimal; done. No ceremony.
- **Real feature** → router escalates → `grilling` aligns → you run `/to-prd` → `/to-issues` →
  `/subagent-driven-development` (TDD + worktrees + two-stage review) → `verification-before-completion`
  → `finishing-a-development-branch`. `debugging` auto-fires on any failure.

## Maintain & extend (the self-measuring part)

```bash
node skills/l5-meta/skill-eval/run.mjs <set.json>     # single-shot Δ (needs a model runner)
node skills/l5-meta/improve-loop/loop.mjs             # measure all, gate, record to runs/log.jsonl
node skills/l5-meta/skill-validator/budget.mjs        # write-quality budget scan
node scripts/check-rule-copies.mjs                    # invariant drift gate
node scripts/spiral-pitch.mjs                         # second-order pitch + measured Σ
node scripts/dark-room.mjs                            # eval difficulty coverage (dark rooms)
node scripts/derive-difficulty.mjs                    # difficulty tags from measured baselines
node scripts/mdl.mjs                                  # two-term description length (Pareto)
node scripts/adr-calibration.mjs                      # ADR predictions due / hit rate
node scripts/lessons-index.mjs [tag]                  # lessons entries by [[tag]]
```
A model runner is the local `claude` CLI, or any Anthropic-compatible endpoint via
`ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` (DeepSeek etc.). All scripts ship a `--self-test`.

The measurement discipline behind this — second-order self-improvement with evidence-gated
instruments (pitch, grounding, dark-room, measured difficulty) — is specified in
[docs/spiral-engineering.md](docs/spiral-engineering.md).

## Honest limits

- **Capable-model dependency.** The disciplines are validated on Claude-class models; on weak
  models they can degrade to ceremony (the resident body is tier-gated for exactly this).
- **`drift-eval` v0 is role-play** (sees the whole turn sequence); **v1 is true-sequential**.
  Trust results that agree across both; disagreement means the scenario is mismatched to the skill.
- **claude.ai** gets the instruction layer only — no shell, hooks, subagents, or the meta-tooling.

Built by combining and *measuring* — `lessons.md` is the ledger of what was tried and what moved a number.
