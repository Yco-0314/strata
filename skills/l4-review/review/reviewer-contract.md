# Reviewer contract — spawn template + verdict protocol (L4)

A checker must measure what the maker **structurally cannot fake**. An implementer's summary is
a narrative; the reviewer's own reading of the code is evidence. This file is the operational
half of `review`'s lens-dispatch: the exact spawn prompt and the verdict protocol every
reviewer is bound by.

Borrow: default-REJECT verifier agents (cobusgreyling/loop-engineering, the one substantial
part of its verifier design); fail-closed last-line verdict (loopflow); the "work is bad" vs
"I cannot judge" split (PlanWeave's NEEDS_COORDINATOR). See lessons.md 2026-07-06.

## Verdict protocol (binding for every reviewer: the three lenses and SDD's two-stage reviewers)

- **Default stance: REJECT.** Start from "this diff has not proven itself"; approve only when
  your own evidence clears it. Insufficient evidence = REJECT, never APPROVE.
- **Three values:**
  - `APPROVE` — every claim you checked held; no CRITICAL/HIGH finding.
  - `REJECT` — a defect found, or the evidence was insufficient to decide.
  - `ESCALATE` — undecidable read-only: the verdict hinges on executing something, a missing
    spec, or a human judgment call. Escalating "I cannot judge" is honest and distinct from
    "the work is bad"; never convert it to APPROVE.
- **Evidence rules:** every finding and any APPROVE cites `file:line` read in THIS review.
  The implementer's commit messages, summaries, and "tests pass" claims are NOT evidence.
  Execution claims are settled by `verification-before-completion` re-running the commands —
  if your verdict hinges on execution, ESCALATE and name the exact command.
- **Fail-closed parse:** the reply's LAST line must be exactly `VERDICT: APPROVE`,
  `VERDICT: REJECT`, or `VERDICT: ESCALATE — <what is needed>`. No parseable last-line
  verdict → the orchestrator counts the review as REJECT.

## Spawn template (one subagent per lens, parallel, read-only tools, Opus tier)

```
You are a read-only {LENS NAME} reviewer. Tools: Read, Grep, Glob only — you cannot edit or
run anything; do not try. Review ONLY the diff {BASE}..{HEAD}.

{PASTE THE LENS SECTION FROM review/SKILL.md — or, for SDD, the spec/quality stage
instructions from subagent-driven-development/SKILL.md}

Contract (binding):
- Default stance REJECT: the diff carries the burden of proof.
- Every finding and any APPROVE must cite file:line you read yourself. The implementer's
  narrative (summaries, commit messages, "tests pass") is not evidence.
- If your verdict hinges on executing something, do not guess: ESCALATE and name the command.
- Output findings as [TIER] <lens>-<slug> file:line + why + fix (review/SKILL.md "Output"),
  then END with the LAST line being exactly one of:
  VERDICT: APPROVE
  VERDICT: REJECT
  VERDICT: ESCALATE — <what you need>
No last-line verdict = your review counts as REJECT.
```

## Orchestrator duties

- Spawn the three lenses in parallel; merge findings into the single tiered list
  (`review/SKILL.md` Output section).
- Merged verdict: any `REJECT` → REJECT (fix, re-review); else any `ESCALATE` → ESCALATE
  (route to `verification-before-completion` for execution claims, to the human otherwise);
  else APPROVE.
- Parse only the last line. Missing/malformed → re-dispatch once with the contract restated;
  still missing → count as REJECT and say so in the report.
- Never give a reviewer write tools or accept a reviewer "fixing it" — read-only is what makes
  the verdict trustworthy.
