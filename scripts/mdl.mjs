#!/usr/bin/env node
// mdl — the two-term description-length gauge (roadmap item 1, HONEST form).
// MDL says: best system = min(description length of the theory + description length of what the
// theory fails to explain). For a skill framework: L1 = injected skill-corpus size, L2 = residual
// with-skill failures on the measured eval population. A healthy spiral shrinks the pair.
// DELIBERATE deviation from "one number": collapsing chars and failures into one scalar needs an
// invented exchange rate — the loop-cost anti-pattern (false precision). So the verdict is
// PARETO, not scalar: IMPROVED = neither term grew and one shrank; TRADE = one shrank, one grew
// (human call); REGRESSED = a term grew and nothing shrank. Snapshots append to runs/log.jsonl
// (kind:'mdl') so the trajectory accrues per model; comparisons never cross models.
//   node scripts/mdl.mjs [--model deepseek-chat] [--dry]   # snapshot + verdict vs previous
//   node scripts/mdl.mjs --self-test
import { readFileSync, readdirSync, appendFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SETS = resolve(ROOT, 'skills/l5-meta/skill-eval/sets')
const LOG = resolve(ROOT, 'skills/l5-meta/skill-eval/runs/log.jsonl')
const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: SKILL.md raw → injected body chars (frontmatter stripped — what the model actually pays).
export function bodyChars(raw = '') {
  const m = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  return (m ? m[1] : raw).trim().length
}

// Pure: evals.jsonl text + model → residual failures on the latest record per set.
export function residual(text = '', model) {
  const latest = {}
  for (const line of text.trim().split('\n').filter(Boolean)) {
    let r; try { r = JSON.parse(line) } catch { continue }
    if (r?.kind === 'eval' && r.model === model && Number.isInteger(r.graded)) latest[r.set] = r
  }
  const rows = Object.values(latest)
  return {
    sets: rows.length,
    graded: rows.reduce((s, r) => s + r.graded, 0),
    fails: rows.reduce((s, r) => s + (r.graded - r.skillPass), 0),
  }
}

// Pure: previous vs current {corpus, fails} → Pareto verdict.
export function mdlVerdict(prev, cur) {
  if (!prev) return 'BASELINE'
  const dc = cur.corpus - prev.corpus, df = cur.fails - prev.fails
  if (dc <= 0 && df <= 0) return dc < 0 || df < 0 ? 'IMPROVED' : 'FLAT'
  if (dc > 0 && df > 0) return 'REGRESSED'
  return (dc > 0 && df < 0) || (dc < 0 && df > 0) ? 'TRADE' : 'REGRESSED'
}

// Pure: log text + model → last mdl snapshot for that model, or null.
export function lastSnapshot(text = '', model) {
  let last = null
  for (const line of text.trim().split('\n').filter(Boolean)) {
    let r; try { r = JSON.parse(line) } catch { continue }
    if (r?.kind === 'mdl' && r.model === model) last = r
  }
  return last
}

function selfTest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  ok(bodyChars('---\nname: x\n---\n\nabc def\n') === 7, 'bodyChars strips frontmatter')
  ok(bodyChars('no frontmatter') === 14, 'bodyChars raw fallback')
  const log = ['{"kind":"eval","set":"a","model":"m","graded":4,"skillPass":3}',
    '{"kind":"eval","set":"a","model":"m","graded":4,"skillPass":4}',
    '{"kind":"eval","set":"b","model":"m","graded":7,"skillPass":6}',
    '{"kind":"eval","set":"c","model":"OTHER","graded":4,"skillPass":0}'].join('\n')
  const r = residual(log, 'm')
  ok(r.sets === 2 && r.graded === 11 && r.fails === 1, 'residual: latest per set, other models excluded')
  ok(mdlVerdict(null, { corpus: 1, fails: 1 }) === 'BASELINE', 'no prev → baseline')
  ok(mdlVerdict({ corpus: 100, fails: 3 }, { corpus: 90, fails: 3 }) === 'IMPROVED', 'corpus shrank, fails flat → improved')
  ok(mdlVerdict({ corpus: 100, fails: 3 }, { corpus: 100, fails: 3 }) === 'FLAT', 'both flat')
  ok(mdlVerdict({ corpus: 100, fails: 3 }, { corpus: 120, fails: 2 }) === 'TRADE', 'grew corpus, cut fails → trade (human call)')
  ok(mdlVerdict({ corpus: 100, fails: 3 }, { corpus: 120, fails: 3 }) === 'REGRESSED', 'grew corpus, fails flat → regressed')
  ok(mdlVerdict({ corpus: 100, fails: 3 }, { corpus: 110, fails: 5 }) === 'REGRESSED', 'both grew → regressed')
  ok(lastSnapshot('{"kind":"mdl","model":"m","corpus":1,"fails":1}\n{"kind":"mdl","model":"m","corpus":2,"fails":0}', 'm').corpus === 2, 'lastSnapshot takes latest')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0)
}

function main() {
  const argv = process.argv.slice(2)
  const model = argv.includes('--model') ? argv[argv.indexOf('--model') + 1] : 'deepseek-chat'
  const dry = argv.includes('--dry')
  // measured corpus = the skills the eval population actually exercises (apples-to-apples with L2)
  const skillPaths = [...new Set(readdirSync(SETS).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(resolve(SETS, f), 'utf8')).skill).filter(Boolean))]
  const perSkill = skillPaths.map(p => ({ p, chars: bodyChars(readFileSync(resolve(ROOT, p), 'utf8')) }))
  const corpus = perSkill.reduce((s, x) => s + x.chars, 0)
  const logText = readFileSync(LOG, 'utf8')
  const { sets, graded, fails } = residual(logText, model)
  const prev = lastSnapshot(logText, model)
  const verdict = mdlVerdict(prev && { corpus: prev.corpus, fails: prev.fails }, { corpus, fails })
  console.log(`mdl — two-term description length (model: ${model})\n`)
  for (const x of perSkill) console.log(`  ${x.p.split('/').slice(-2)[0].padEnd(34)} ${x.chars} chars`)
  console.log(`\n  L1 corpus     ${corpus} chars (${perSkill.length} measured skills)`)
  console.log(`  L2 residual   ${fails} with-skill failures / ${graded} graded cases (${sets} sets)`)
  console.log(`  verdict       ${verdict}${prev ? `  (prev: ${prev.corpus} chars, ${prev.fails} fails @ ${prev.ts?.slice(0, 10)})` : '  (first snapshot for this model)'}`)
  console.log('\n  Pareto, not scalar: chars↔failures has no honest exchange rate. TRADE = human call.')
  if (!dry) {
    appendFileSync(LOG, JSON.stringify({ kind: 'mdl', ts: new Date().toISOString(), model, corpus, skills: perSkill.length, sets, graded, fails, verdict }) + '\n')
    console.log(`  snapshot appended to runs/log.jsonl`)
  }
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) main()
