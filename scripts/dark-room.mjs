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
  console.log('  note: COVERAGE snapshot only. "Is difficulty rising over time?" (the dark-room / ZPD')
  console.log('  signal) needs difficulty recorded at case-add time — it accrues from here. Tag a set')
  console.log('  when you next touch it; a set that stays all-easy silently degenerates into a dark room.')
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) report()
