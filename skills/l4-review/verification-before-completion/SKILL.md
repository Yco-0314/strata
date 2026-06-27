---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs — requires running verification commands and confirming output before any success claim; evidence before assertions always.
license: MIT
metadata:
  layer: L4
  role: discipline
  invocation: model-invoked-discipline
  provenance: "Independently implemented from the ideas in superpowers' verification-before-completion. The framework's evidence gate; the user's CLAUDE.md 'verification-before-done' maps here."
---

# Verification before completion — L4 evidence gate

Claiming work is done without verification is dishonesty, not efficiency. Every "it works"
in this framework routes through this gate.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command **in this message**, you cannot claim it passes.

## The gate function

Before claiming any status or expressing satisfaction:

1. **Identify** — what command proves this claim?
2. **Run** — execute the full command, fresh and complete.
3. **Read** — full output, exit code, failure count.
4. **Verify** — does the output confirm the claim? No → state the actual status with the
   evidence. Yes → state the claim *with* the evidence.

Skipping any step is lying, not verifying.

## What each claim actually requires

| Claim | Requires | Not sufficient |
|---|---|---|
| Tests pass | Test output: 0 failures | "should pass", a previous run |
| Linter clean | Linter output: 0 errors | partial check, extrapolation |
| Build succeeds | Build exit 0 | linter passing, "logs look good" |
| Bug fixed | Original symptom re-tested: passes | code changed, assumed fixed |
| Regression test works | Red→green cycle verified (revert fix → must fail → restore → pass) | test passes once |
| Subagent completed | VCS diff shows the changes | the agent reported "success" |
| Requirements met | Line-by-line checklist | tests passing |

## Red flags — stop

"should" / "probably" / "seems to"; "Great!"/"Perfect!"/"Done!" before evidence; about to
commit/push/PR unverified; trusting an agent's success report; "just this once"; tired and
wanting it over. Any wording implying success without having run the check.

| Excuse | Reality |
|---|---|
| "Should work now" | Run the verification. |
| "I'm confident" | Confidence ≠ evidence. |
| "Linter passed" | Linter ≠ compiler. |
| "Agent said success" | Verify independently (check the diff). |
| "Partial check is enough" | Partial proves nothing. |

Run the command. Read the output. **Then** claim the result. Non-negotiable.
