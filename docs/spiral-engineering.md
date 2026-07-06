# Spiral Engineering — spec v0.1 (draft)

> A loop returns to where it started. A spiral doesn't — and can prove it.

**Definition.** Prompt engineering shaped one call; context engineering shaped one session;
harness engineering shaped one task's environment; loop engineering closed the task cycle.
**Spiral engineering is second-order: the loop's output flows back into the system that runs
the loop** — its skills, gates, evals, and judges — and every such self-change must carry
**evidence**. A self-improvement claim without a measurement is a loop with marketing.

Reference implementation: this repo (strata). Everything below is built and running here, or
explicitly marked open.

## 1. The falsifiability contract

A system may call itself a spiral only if it publishes, from its own ledger:

- **Pitch** — verified self-changes per unit time, each classified by evidence:
  `SHIP` (moved a measured Δ>0), `GATE` (structural, verified by review/self-test, no
  single-shot Δ), `NULL` (honest closure: a revert, convergence, or correction).
- **Null-ratio** — a spiral that never rejects anything is not measuring.
- **Grounding ratio** — external-triggered vs self-generated changes. The Data Processing
  Inequality is the hard ceiling: a closed loop cannot learn more than its external signal
  carries. Self-certification is not merely bad practice; it is thermodynamically empty.
- **Disambiguation** (von Foerster's eigenform): pitch→0 with high grounding is a *mature*
  system that inspects itself and finds nothing to change; pitch→0 with low grounding is a
  *starved* one. Pitch alone cannot tell death from maturity — grounding can.

**Falsification of the discipline itself:** if, across real projects, ledger-measured spirals
do not outperform unmeasured loop-pattern adoption on realized outcomes (skill Δ retention
across model swaps, defect escape rate, cost per verified outcome), spiral engineering is a
name, not a discipline. This spec commits to publishing negative results.

## 2. Instruments (all in this repo, all `--self-test`ed, all in CI)

| Instrument | Question it answers | File |
|---|---|---|
| Pitch | Is the system verifiably editing itself, at what rate, on what evidence? | `scripts/spiral-pitch.mjs` |
| Measured layer | What did automated eval actually record (latest per set@model)? | `runs/log.jsonl` via spiral-pitch/dark-room |
| Dark-room | Can this eval even reveal skill value, or is it all-easy? (FEP dark-room problem) | `scripts/dark-room.mjs` |
| Difficulty derivation | Tags from measurement, not opinion (difficulty is model-relative) | `scripts/derive-difficulty.mjs` |
| Judge guard | Is the judge stronger than the model under test? (judge==model fabricates Δ0) | `skill-eval/run.mjs` |
| Circuit breaker | Same-error stall detection, reset-on-success | `hooks/loop-guard.mjs` |
| Verdict contract | Default-REJECT reviewers, fail-closed last-line verdict | `skills/l4-review/review/reviewer-contract.md` |
| Graduation gate | Autonomy earned by ledger, never switched on | `improve-loop/SKILL.md` |
| Drift gate | Invariant phrases survive verbatim in every copy | `scripts/check-rule-copies.mjs` |
| Ledger split | Machine records (JSONL) vs human conclusions (lessons.md + `[[tag]]` index) | `runs/log.jsonl` · `scripts/lessons-index.mjs` |

## 3. Evidence (2026-07-06, all automated into `runs/log.jsonl`)

Canonical table — deepseek-chat under test, deepseek-reasoner judging, `EVAL_N=5` majority
vote, whole run ≪ $1:

```
debugging +100 · tdd +100 · grilling +75 · verification-before-completion +50
l0-ponytail +43 · review +25 · complexity-router +13        Σ +406%, 7/7 pass the gate
```

Findings the instruments produced (none available to a pattern catalog):

1. **Judge==model fabricates results.** With the model judging itself, `debugging` read Δ0 —
   flagged dead weight — while its transcripts were textbook-correct. A stronger judge:
   **Δ0 → +100%**, the strongest skill on the table. Correcting the *eval* was the progress.
2. **Skill value is model-relative.** `verification-before-completion` converges to Δ0 on a
   strong model (recorded) but is +50–75% on a weaker one. Depreciation must be per-model;
   a skill "dead" on model A is load-bearing on model B.
3. **Difficulty is model-relative.** 4 of 7 hand-assigned difficulty tags were overturned by
   measured baseline verdicts. Tags are now derived, with a traceable `difficultyBasis`.
4. **Honest error paths.** A ~1-minute transport window killed 40/40 calls of one set; the
   ledger recorded `gate:ERROR`, the re-run replaced it, and the failure bought one retry-on-
   transport-throw (never on API errors). Nulls are recorded, never invented.

## 4. Laws (statement → root → instrument → how it dies)

1. **Pitch law.** No measured second-order change, no spiral. *(2nd-order cybernetics →
   spiral-pitch → dies if pitch correlates with nothing downstream.)*
2. **Grounding law.** Learning rate is capped by external signal (DPI). *(Info theory →
   grounding ratio → dies if high-grounding spirals don't outlearn closed ones.)*
3. **Asymmetry law.** Direction comes from gates, not metaphors: verified gains enter easily,
   unverified changes hardly; autonomy is revocable (de-graduation). *(Ratchet/pawl → ship
   gate + graduation → dies if gate-less systems accumulate equally well.)*
4. **Depreciation law.** Process capital is a model-specific asset; on model swap, re-measure,
   retire converged skills — deletion is progress. *(Evidence #2/#3 → derive-difficulty +
   per-model records → dies if Δ tables transfer across models unchanged.)*
5. **Dual-strand law.** The judging strand needs maintenance too: judge stronger than judged,
   human calibration preserved. *(Bainbridge's automation irony → judge guard → dies if weak
   judges prove harmless at scale.)*
6. **Dark-room law.** A healthy spiral lets tasks get harder; rising pass rates on static
   difficulty is hiding, not improving. *(Active inference → dark-room + difficulty axis →
   dies if all-easy evals predict deployed skill quality just as well.)*

## 5. Prior art and the narrow claim

None of the mechanisms are novel, and this spec says so: skill libraries that self-optimize
(SkillOpt/SkillGen lineage), self-modifying agents benchmarked on variants (Darwin Gödel
Machine), architecture fitness functions (Ford/Parsons/Kua), easy-to-hard curricula (ZPD),
PDCA and double-loop learning (Deming, Argyris), and Boehm's 1986 spiral *model* — which
organized project phases, where spiral *engineering* organizes the improvement of the
development system itself. **The defensible contribution is narrow: honest measurement +
mechanical gates + no self-certification, demonstrated end-to-end on a real ledger.** The
economics are new, not the ideas: one methodologically clean full-population measurement now
costs under a dollar, so "we couldn't afford to verify" is no longer an excuse.

## 6. Anti-patterns (from the loop-engineering autopsy, 2026-07)

Self-certifying audits (filename regex as "proof of runs"); invented cost constants presented
with false precision; honor-system "binding" prose without enforcement; scaffolding-per-
pattern before any need; manufactured community (pre-written good-first-issues, badge
funnels); judging a model with itself. The failure catalog that *names* "verifier theater"
while *being* verifier theater is the cautionary tale: naming a disease is not a blood test.

## 7. Boundaries — what a spiral does not claim

- It cannot out-learn its grounding channel (DPI): synthetic evals are proxies until deployment
  outcomes calibrate them (`paper-deployment-calibration`, open).
- It measures process, not product: it can tell you the loop improved, not that you built the
  right thing.
- The architect's residue stays human for now: authoring the distribution of plausible
  futures, risk appetite, organizational negotiation, accountability. The counterfactual
  wind tunnel (`design-tunnel`, roadmap) attacks the technical core — candidate selection
  under change — not these.

## 8. Roadmap (each item ships only through the gate)

1. **MDL total description length** — skill tokens + residual failure entropy, monotonically
   decreasing: the one number you cannot game by adding skills. Unblocked now that residual
   failure is measured.
2. **ADR outcome calibration** — `predicted_outcomes` on ADRs + scheduled revisits graded
   against git evidence: architecture judgment gets a Brier score.
3. **design-tunnel** — agents implement the same next-N features against competing skeletons;
   change-cost becomes a measurement (~$10²/decision vs an architect-week).
4. **Replication protocol** — the falsification experiment of §1, run on repos that aren't
   this one.

## 9. Replicate this

```bash
node skills/l5-meta/improve-loop/loop.mjs      # measure all skills (any Anthropic-compatible endpoint)
node scripts/spiral-pitch.mjs                  # pitch, grounding, null-ratio, measured Σ
node scripts/dark-room.mjs                     # can your eval even discriminate?
node scripts/derive-difficulty.mjs             # replace your difficulty guesses with data
```

Publish the numbers — including the ugly ones. That is the entire discipline.
