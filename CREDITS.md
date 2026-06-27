# Credits & attribution

Strata is a **combination and measurement layer** built on top of existing open work. It does
not reinvent the skill format (it conforms to the [agentskills.io](https://agentskills.io)
open SKILL.md spec) — it curates, layers, and measures. Per-skill provenance is recorded in each
`SKILL.md`'s frontmatter (`metadata.provenance`); this file is the top-level summary.

Please consult each upstream project for its own license before reusing the corresponding parts.

## Primary sources (the three combined by altitude)

- **ponytail** — DietrichGebert/ponytail (MIT). The L0 behavioral constitution: the 7-rung
  minimize-before-you-build ladder, root-cause-as-lazier-diff, the `ponytail:` debt convention,
  the lite/full/ultra dial, and the safety carve-out. Strata's `ponytail` skill and resident
  injector adapt it.
- **superpowers** — obra/superpowers. The process engine: subagent-driven development, the
  two-stage (spec→quality) review, TDD enforcement spine, `verification-before-completion`,
  systematic debugging, git-worktree isolation, and the "TDD-for-skills" authoring method.
  > NOTE: superpowers has no explicit license at the time of writing; Strata's corresponding
  > skills are **independent implementations of its ideas/methods** (which are not copyrightable),
  > not copies of its text.
- **mattpocock/skills** — Matt Pocock. The composable toolbox + repo hygiene: `grilling`,
  `to-prd` / `to-issues` (tracer-bullet vertical slices), `domain-modeling` / CONTEXT.md, the
  vertical-slice TDD framing, and the model-vs-user invocation taxonomy that became Strata's
  invocation law.

## Ecosystem borrows (technique-level)

Adapted as conventions/lenses, not vendored wholesale (each cleared a reputation check —
see `find-skills`):

- **Anthropic** — `skills` (`skill-creator`: the with-skill-vs-baseline eval loop that inspired
  `skill-eval`), the agentskills.io spec, the Agent SDK, and skill best-practices (degrees of
  freedom, WHEN-only descriptions).
- **vercel-labs** — `react-best-practices` (impact-tiered rule slugs in `review`), `find-skills`
  (the reputation gate), and the `skills` CLI symlink-install model (`install.sh`).
- **Trail of Bits** — `skills` (diff-scoped differential security review, the L4 security lens).
- **wshobson/agents** (model-tier-by-role), **VoltAgent/awesome-claude-code-subagents**
  (read-only reviewer tool preset), **smtg-ai/claude-squad** (worktree-bound fan-out),
  **BMAD-METHOD** (self-contained story-file), **GSD** (fresh-session-per-phase).
- **OpenSpec**, **GitHub Spec-Kit**, **Amazon Kiro (EARS)** — planning-rigor techniques.
- **skill-tools** — the PostToolUse self-correction hook pattern.
- **multica-ai/andrej-karpathy-skills** (MIT) — guideline #3 "Surgical Changes", cherry-picked
  into `ponytail` (evaluated principle-by-principle, not vendored — see `lessons.md`).

## What is original to Strata

The **measurement layer** and the **layered composition**: `skill-eval` (single-shot Δ),
`drift-eval` (multi-turn drift, v0+v1), `skill-validator` (6-axis + budget), `improve-loop`,
the L0–L6 altitude architecture, the invocation law (ADR 0001), the drift gate, and the
evidence ledger (`lessons.md`).
