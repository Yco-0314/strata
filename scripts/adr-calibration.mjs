#!/usr/bin/env node
// adr-calibration — architecture judgment gets a track record (roadmap item 2).
// Teams write ADRs but never revisit them: the decision is recorded, the PREDICTION implicit,
// the outcome never graded — so architecture judgment never gets a calibration curve. Fix: each
// ADR carries explicit falsifiable predictions in fenced ```prediction blocks; this script lists
// what is due for review and reports the hit rate of everything graded. Grading itself is a
// HUMAN act (edit grade to "hit"/"miss"/"unclear" + cite evidence) — the script only refuses to
// let predictions rot unexamined. The calibration curve starts EMPTY and accrues; no retroactive
// predictions (those are fake).
//   ```prediction
//   {"id":"0001-p1","claim":"…","checkBy":"YYYY-MM-DD","grade":null,"evidence":null}
//   ```
//   node scripts/adr-calibration.mjs             # due / pending / graded + hit rate
//   node scripts/adr-calibration.mjs --self-test
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ADR = resolve(ROOT, 'docs/adr')
const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: markdown text → prediction objects (malformed blocks reported, not skipped silently).
export function parsePredictions(text = '') {
  const out = [], bad = []
  for (const m of text.matchAll(/```prediction\s*\n([\s\S]*?)```/g)) {
    try {
      const p = JSON.parse(m[1])
      if (p.id && p.claim && p.checkBy) out.push(p)
      else bad.push(p.id || '(no id)')
    } catch { bad.push('(unparseable block)') }
  }
  return { predictions: out, bad }
}

// Pure: predictions + today → buckets. Grading vocabulary is closed: hit | miss | unclear.
export function bucket(predictions, today) {
  const graded = predictions.filter(p => ['hit', 'miss', 'unclear'].includes(p.grade))
  const open = predictions.filter(p => !graded.includes(p))
  const due = open.filter(p => p.checkBy <= today)
  const hits = graded.filter(p => p.grade === 'hit').length
  const scored = graded.filter(p => p.grade !== 'unclear').length
  return { open, due, graded, hits, scored, hitRate: scored ? +(hits / scored).toFixed(2) : null }
}

function selfTest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  const md = 'x\n```prediction\n{"id":"p1","claim":"c","checkBy":"2026-10-01","grade":null}\n```\n' +
    '```prediction\n{"id":"p2","claim":"c","checkBy":"2026-01-01","grade":"hit","evidence":"e"}\n```\n' +
    '```prediction\n{"id":"p3","claim":"c","checkBy":"2026-01-01","grade":"unclear"}\n```\n' +
    '```prediction\nnot json\n```\n```prediction\n{"id":"p5"}\n```'
  const { predictions, bad: badBlocks } = parsePredictions(md)
  ok(predictions.length === 3 && badBlocks.length === 2, 'parses valid blocks, reports malformed + incomplete')
  const b = bucket(predictions, '2026-07-06')
  ok(b.open.length === 1 && b.due.length === 0, 'ungraded future prediction open, not due')
  ok(bucket(predictions, '2026-11-01').due.length === 1, 'past checkBy → due')
  ok(b.graded.length === 2 && b.hits === 1 && b.scored === 1, 'unclear excluded from scoring')
  ok(b.hitRate === 1, 'hit rate over scored only')
  ok(bucket([], '2026-07-06').hitRate === null, 'no graded → null, never a fake 0')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0)
}

function main() {
  const today = new Date().toISOString().slice(0, 10)
  let all = [], badAll = []
  for (const f of readdirSync(ADR).filter(f => f.endsWith('.md')).sort()) {
    const { predictions, bad } = parsePredictions(readFileSync(resolve(ADR, f), 'utf8'))
    all = all.concat(predictions.map(p => ({ ...p, file: f })))
    badAll = badAll.concat(bad.map(b => `${f}: ${b}`))
  }
  const b = bucket(all, today)
  console.log(`adr-calibration — ${all.length} prediction(s) across docs/adr/ (today: ${today})\n`)
  for (const p of b.due) console.log(`  DUE     ${p.id}  (checkBy ${p.checkBy})  ${p.claim.slice(0, 80)}`)
  for (const p of b.open.filter(p => !b.due.includes(p))) console.log(`  open    ${p.id}  (checkBy ${p.checkBy})`)
  for (const p of b.graded) console.log(`  ${p.grade.padEnd(7)} ${p.id}  ${p.evidence ? '— ' + String(p.evidence).slice(0, 60) : ''}`)
  if (badAll.length) console.log(`\n  ⚠ malformed: ${badAll.join('; ')}`)
  console.log(`\n  calibration: ${b.hitRate === null ? 'no graded predictions yet — the curve accrues from here' : `${b.hits}/${b.scored} hit rate ${b.hitRate}`}`)
  if (b.due.length) { console.log(`  ${b.due.length} prediction(s) OVERDUE for grading — grade them (hit/miss/unclear + evidence).`); process.exit(2) }
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) main()
