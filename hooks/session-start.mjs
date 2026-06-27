#!/usr/bin/env node
// Architect — the ONE SessionStart injector for the whole framework.
// Injects (a) the compact L0 ponytail ladder, mode-filtered to the active level only, and
// (b) a slim dispatcher pointer. Everything else loads lazily via the Skill tool.
//
// Why one injector: two always-on SessionStart injectors (ponytail's + superpowers') bloat
// the per-turn prompt and leak across siblings (ponytail documented a contamination bug).
// This is the single resident injection; keep it compact — the context window is a public good.
//
// Level resolution: PONYTAIL_LEVEL env > .architect.json {"ponytailLevel"} > tier default.
// Tier default: weak tier → 'lite', strong/unknown tier → 'full'. This gates the resident BODY
// by model tier — the full constitution measured a −33% regression on a weak model (haiku) doing
// trivial tasks (its verbose body confused a model whose baseline was already minimal), while it
// is neutral-to-positive on strong models and on real over-engineering (lessons.md 2026-06-27).
//
// Tier resolution: PONYTAIL_TIER env > .architect.json {"ponytailTier"} > model-id sniff > 'strong'.
// A SessionStart hook is given NO model in its stdin or env (verified: code.claude.com/docs/en/hooks),
// so PONYTAIL_TIER is the reliable knob; the env sniff is best-effort for setups that export a model id.
// Unknown → 'strong' preserves today's full-body behavior (only weak models regress); a weak-model
// user sets PONYTAIL_TIER=weak (or =haiku).
//
// The compact copy below is drift-gated against the canonical ponytail SKILL.md by
// scripts/check-rule-copies.mjs (shared invariant phrases must survive in both).

import { readFileSync } from 'node:fs'

function readConfig() {
  try { return JSON.parse(readFileSync(new URL('../.architect.json', import.meta.url), 'utf8')) }
  catch { return {} } // no config → tier/level fall back to env then defaults
}
const CONFIG = readConfig()

// haiku is the only weak tier today; sonnet/opus/fable are strong. Bare weak|strong pass through.
const TIER_ALIAS = { haiku: 'weak', sonnet: 'strong', opus: 'strong', fable: 'strong' }

function resolveTier() {
  const knob = (process.env.PONYTAIL_TIER || CONFIG.ponytailTier || '').trim().toLowerCase()
  const norm = TIER_ALIAS[knob] || knob
  if (norm === 'weak' || norm === 'strong') return norm
  // best-effort: classify a model id if one happens to leak through the environment.
  const m = (process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || process.env.CLAUDE_CODE_MODEL || '').toLowerCase()
  if (m.includes('haiku')) return 'weak'
  if (/sonnet|opus|fable/.test(m)) return 'strong'
  return 'strong' // unknown → full body (the safe default; only weak models regress on it)
}

function explicitLevel() {
  const v = (process.env.PONYTAIL_LEVEL || CONFIG.ponytailLevel || '').trim().toLowerCase()
  return ['lite', 'full', 'ultra', 'off'].includes(v) ? v : null
}

// Explicit level (user intent) wins; otherwise the model tier picks the default body.
function resolveLevel() {
  return explicitLevel() || (resolveTier() === 'weak' ? 'lite' : 'full')
}

const LEVEL_LINE = {
  lite: 'Level lite: build what is asked, but name the lazier alternative in one line; the user picks.',
  full: 'Level full: ladder enforced, stdlib/native before deps, shortest diff + shortest explanation.',
  ultra: 'Level ultra: YAGNI extremist, deletion before addition; ship the one-liner and challenge the rest in the same breath.',
}

// Compact L0 constitution, mode-filtered: 'lite' (the weak-tier body) keeps the ladder, the
// surgical-changes guard, and the non-negotiable safety carve-out, but drops the root-cause and
// deletion prose that bulked the body and regressed a weak model on trivial tasks. full/ultra
// emit the whole thing. The CAPITALISED safety line and the ladder/root-cause/check phrases are
// load-bearing invariants — scripts/check-rule-copies.mjs asserts they also exist verbatim (by
// substring) in skills/l0-constitution/ponytail/SKILL.md. Do not reword without updating it; the
// gate reads this file's source, so every invariant survives here even when 'lite' omits it at runtime.
function constitution(level) {
  const lite = level === 'lite'
  return [
    `[Architect L0 — ponytail · level: ${level}]`,
    'Lazy senior dev: lazy means efficient, not careless. Climb the ladder, stop at the first rung that holds:',
    '1 Does this need to exist at all? (YAGNI)  2 Already in this codebase? reuse it  3 Stdlib does it?  4 Native platform feature?  5 Already-installed dependency?  6 One line?  7 Only then: the minimum code that works.',
    lite ? null : 'Bug fix = root cause, not symptom: grep every caller of the function you touch and fix the shared function once — one guard there is a smaller diff than one per caller.',
    lite ? null : 'Mark deliberate cuts `// ponytail: <ceiling>, <upgrade path>`. Deletion over addition. Shortest working diff wins — but only once you understand the problem.',
    'Surgical on existing code: change only what the request needs, match the surrounding style, do not refactor what is not broken, and remove only the orphans your change created.',
    'NEVER simplify away: input validation at trust boundaries, error handling that prevents data loss, security, accessibility basics, anything explicitly requested. Non-trivial logic leaves ONE runnable check.',
    LEVEL_LINE[level],
  ].filter(Boolean).join('\n')
}

const DISPATCH = [
  '[Architect dispatch]',
  'Build/code request → the L1 complexity-router decides PROCESS (trivial+reversible → ponytail nudge alone; new feature/multi-file/irreversible → escalate).',
  'Discipline skills auto-fire: debugging (on any failure), review, verification-before-completion.',
  'Primitives, reached only via the router or a parent skill: grilling, domain-modeling, using-git-worktrees, finishing-a-development-branch.',
  'Orchestrators are user-invoked (the human types them) — never auto-start: to-prd, to-issues, writing-plans, subagent-driven-development, writing-skills.',
  'Full map + the invocation law: skills/using-architect/SKILL.md.',
].join('\n')

function buildContext() {
  const level = resolveLevel()
  return level === 'off' ? DISPATCH : `${constitution(level)}\n\n${DISPATCH}`
}

// `node hooks/session-start.mjs --selftest` exercises the tier/level branching and the lite
// filter without emitting the hook JSON — ponytail's own "non-trivial logic leaves ONE runnable
// check" applied to this file.
function selftest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  const reset = (...keys) => ['PONYTAIL_TIER', 'PONYTAIL_LEVEL', 'ANTHROPIC_MODEL', 'CLAUDE_MODEL', 'CLAUDE_CODE_MODEL'].forEach(k => delete process.env[k])
  reset(); process.env.PONYTAIL_TIER = 'weak'; ok(resolveLevel() === 'lite', 'weak tier → lite default')
  reset(); process.env.PONYTAIL_TIER = 'strong'; ok(resolveLevel() === 'full', 'strong tier → full default')
  reset(); ok(resolveLevel() === 'full', 'unknown tier → full default')
  reset(); process.env.PONYTAIL_TIER = 'haiku'; ok(resolveTier() === 'weak', 'haiku alias → weak')
  reset(); process.env.PONYTAIL_TIER = 'weak'; process.env.PONYTAIL_LEVEL = 'full'; ok(resolveLevel() === 'full', 'explicit PONYTAIL_LEVEL overrides tier')
  reset(); process.env.ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'; ok(resolveTier() === 'weak', 'env model-id sniff → weak')
  const full = constitution('full'), lt = constitution('lite')
  ok(lt.length < full.length, 'lite body shorter than full')
  ok(!lt.includes('grep every caller'), 'lite drops root-cause prose')
  ok(lt.includes('input validation at trust boundaries') && lt.includes('match the surrounding style'), 'lite keeps the safety + surgical guards')
  for (const p of ['input validation at trust boundaries', 'error handling that prevents data loss', 'grep every caller', 'match the surrounding style', 'ONE runnable check', 'Stdlib does it', 'Native platform feature'])
    ok(full.includes(p), `full keeps invariant: "${p}"`)
  console.log(bad ? `\n${bad} selftest failure(s)` : '\nselftest passed')
  process.exit(bad ? 1 : 0)
}

if (process.argv.includes('--selftest')) {
  selftest()
} else {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: buildContext() },
  }))
}
