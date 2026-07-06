#!/usr/bin/env node
// dark-room — eval difficulty-coverage check (are we testing in the dark, only on easy cases?).
// The "dark room" problem (active inference / Friston): a system can minimise surprise by avoiding
// hard tasks — high stability that is actually degeneration. For a skill framework the tell is:
// an eval set of only EASY cases, where a strong baseline already aces every case (Δ≈0), can never
// reveal whether the skill helps. This is strata's own recorded finding ("sonnet converges to 0%
// on easy traps") made machine-checkable. Each case carries an optional ordinal:
//   difficulty 1 = toy (base model passes unaided — convergence-prone, non-discriminating)
//   difficulty 2 = realistic   ·   3 = adversarial (base model likely fails unaided)
// A set with NO case of difficulty ≥ 2 is a dark room. Borrowed: zone-of-proximal-development /
// easy-to-hard curricula (arxiv 2602.10014); none of it is novel — the honest gate is the point.
//   node scripts/dark-room.mjs             # coverage per set + dark-room flags
//   node scripts/dark-room.mjs --self-test # prove the pure coverage logic (no I/O)

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..') // cwd-independent
const SETS = resolve(ROOT, 'skills/l5-meta/skill-eval/sets')
const LOG = resolve(ROOT, 'skills/l5-meta/skill-eval/runs/log.jsonl')
const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: a case's difficulty ordinal (1–3) or null when untagged.
export const difficultyOf = (c) => Number.isInteger(c?.difficulty) && c.difficulty >= 1 && c.difficulty <= 3 ? c.difficulty : null

// Pure: one set's cases → coverage + verdict.
//   untagged  — no case tagged yet (difficulty unknown; tag when you touch the set)
//   darkroom  — tagged, but ZERO discriminating (≥2) cases: only convergence-prone easy ones
//   partial   — has discriminating cases but some still untagged
//   ok        — every case tagged and ≥1 discriminates
export function coverage(cases = []) {
  const diffs = cases.map(difficultyOf)
  const total = cases.length
  const untagged = diffs.filter(d => d === null).length
  const easy = diffs.filter(d => d === 1).length
  const mid = diffs.filter(d => d === 2).length
  const hard = diffs.filter(d => d === 3).length
  const discriminating = mid + hard
  const tagged = total - untagged
  const verdict = tagged === 0 ? 'untagged'
    : discriminating === 0 ? 'darkroom'
    : untagged > 0 ? 'partial' : 'ok'
  return { total, easy, mid, hard, untagged, discriminating, verdict }
}

// Pure: runs/log.jsonl text → MEASURED coverage per (set, model), latest eval record wins.
// Difficulty is model-relative (2026-07-06 finding: the "toy" debounce trap catches deepseek-chat's
// baseline while hand-tagged "realistic" traps pass unaided) — so the measured discriminator is the
// per-model baseline pass rate: a case whose baseline FAILS is the case that can show skill value.
// Zero baseline-fails = a measured dark room ON THAT MODEL, whatever the static tags predicted.
export function measuredCoverage(text = '') {
  const recs = text.trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l) } catch { return null } })
    .filter(r => r && r.kind === 'eval' && Array.isArray(r.cases))
  const latest = {}
  for (const r of recs) latest[`${r.set}@${r.model}`] = r
  return Object.values(latest).map(r => {
    const graded = r.cases.filter(c => c.baseline !== null)
    const baselineFails = graded.filter(c => c.baseline === false).length
    return {
      set: r.set, model: r.model, n: r.n || 1, graded: graded.length, baselineFails,
      verdict: !graded.length ? 'error' : baselineFails === 0 ? 'darkroom' : 'ok',
    }
  }).sort((a, b) => a.set.localeCompare(b.set))
}

function selfTest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  ok(difficultyOf({ difficulty: 2 }) === 2, 'valid ordinal')
  ok(difficultyOf({ difficulty: 0 }) === null, 'out-of-range → null')
  ok(difficultyOf({ difficulty: '2' }) === null, 'non-integer → null')
  ok(difficultyOf({}) === null, 'missing → null')
  ok(coverage([{ difficulty: 1 }, { difficulty: 2 }, { difficulty: 1 }]).verdict === 'ok', 'all tagged + a discriminator → ok')
  ok(coverage([{ difficulty: 1 }, { difficulty: 1 }]).verdict === 'darkroom', 'all easy → dark room')
  ok(coverage([{}, {}]).verdict === 'untagged', 'none tagged → untagged')
  ok(coverage([{ difficulty: 3 }, {}]).verdict === 'partial', 'discriminator + an untagged → partial')
  const cov = coverage([{ difficulty: 1 }, { difficulty: 1 }, { difficulty: 1 }, { difficulty: 2 }, { difficulty: 2 }, { difficulty: 2 }, { difficulty: 2 }])
  ok(cov.easy === 3 && cov.mid === 4 && cov.discriminating === 4, 'counts split (l0-ponytail shape)')
  const log = [
    '{"kind":"eval","set":"a","model":"m1","n":1,"cases":[{"id":"x","baseline":true,"skill":true},{"id":"y","baseline":false,"skill":true}]}',
    'garbage line',
    '{"kind":"eval","set":"a","model":"m1","n":5,"cases":[{"id":"x","baseline":true,"skill":true},{"id":"y","baseline":true,"skill":true}]}',
    '{"kind":"eval","set":"b","model":"m1","n":1,"cases":[{"id":"z","baseline":false,"skill":true},{"id":"w","baseline":null,"skill":null}]}',
    '{"kind":"measure-run","rows":[]}',
  ].join('\n')
  const mc = measuredCoverage(log)
  ok(mc.length === 2, 'latest per set@model, measure-run + garbage skipped')
  ok(mc.find(r => r.set === 'a').verdict === 'darkroom' && mc.find(r => r.set === 'a').n === 5, 'latest record wins: a@m1 all-baseline-pass → measured dark room')
  ok(mc.find(r => r.set === 'b').verdict === 'ok' && mc.find(r => r.set === 'b').graded === 1, 'baseline-fail discriminates; errored case excluded from graded')
  ok(measuredCoverage('').length === 0, 'empty log → empty, not crash')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0)
}

function report() {
  const files = readdirSync(SETS).filter(f => f.endsWith('.json')).sort()
  const rows = files.map(f => {
    const set = JSON.parse(readFileSync(resolve(SETS, f), 'utf8'))
    return { name: f.replace(/\.json$/, ''), ...coverage(set.cases || []) }
  })
  console.log('dark-room — eval difficulty coverage (only-easy sets can\'t reveal a skill\'s value)\n')
  console.log('  set                              cases  easy  mid  hard  untagged  verdict')
  const dash = (n) => n === 0 ? '·' : String(n)
  for (const r of rows) {
    const line = `  ${r.name.padEnd(32)} ${String(r.total).padEnd(5)}  ${dash(r.easy).padEnd(4)}  ${dash(r.mid).padEnd(3)}  ${dash(r.hard).padEnd(4)}  ${dash(r.untagged).padEnd(8)}  ${r.verdict}`
    console.log(line + (r.verdict === 'darkroom' ? '  ⚠ DARK ROOM' : ''))
  }
  const tagged = rows.filter(r => r.verdict !== 'untagged').length
  const dark = rows.filter(r => r.verdict === 'darkroom').length
  console.log(`\n  corpus: ${tagged}/${rows.length} sets have difficulty tags · ${dark} dark room(s) · ${rows.length - tagged} untagged`)

  let mc = []
  try { mc = measuredCoverage(readFileSync(LOG, 'utf8')) } catch { /* no measured runs yet */ }
  if (mc.length) {
    console.log('\n  measured (runs/log.jsonl, latest per set@model — difficulty is MODEL-RELATIVE;')
    console.log('  this layer is ground truth, the static tags above are the pre-run prediction):')
    console.log('    set@model                                  baseline-fail/graded  verdict')
    for (const r of mc) {
      const line = `    ${(r.set + '@' + r.model).padEnd(42)} ${String(r.baselineFails).padStart(2)}/${String(r.graded).padEnd(2)}${r.n > 1 ? ` (N=${r.n})` : '      '}  ${r.verdict}`
      console.log(line + (r.verdict === 'darkroom' ? '  ⚠ MEASURED DARK ROOM on this model' : ''))
    }
  } else {
    console.log('\n  note: no measured runs yet — verdicts above are static-tag predictions only.')
  }
  console.log('\n  note: "Is difficulty rising over time?" (the ZPD signal) accrues from tagging at')
  console.log('  case-add time; a set that stays all-easy silently degenerates into a dark room.')
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) report()
