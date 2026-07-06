#!/usr/bin/env node
// improve-loop engine — the measure→gate→record arc of the meta-loop, automated.
// Runs every skill-eval set, applies the Δ ship-gate, flags dead weight (Δ≤0), appends a
// measure-run record to skill-eval's runs/log.jsonl (lessons.md stays human-written), and
// surfaces the next backlog borrows. The 'apply' (editing a skill) stays a human/agent step —
// a script editing skills blind is the over-reach ponytail forbids. Run from the Architect/
// root, in a logged-in terminal (same auth as skill-eval):
//   node skills/l5-meta/improve-loop/loop.mjs            # measure all, gate, record to runs/log.jsonl
//   node skills/l5-meta/improve-loop/loop.mjs --dry      # measure + print, no record written
//   node skills/l5-meta/improve-loop/loop.mjs --self-test # prove the parser (no API)

import { readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const SETS_DIR = 'skills/l5-meta/skill-eval/sets'
const RUNNER = 'skills/l5-meta/skill-eval/run.mjs'
const BACKLOG = 'skills/l5-meta/improve-loop/backlog.json'
const LOG = 'skills/l5-meta/skill-eval/runs/log.jsonl'

// Pure: the record run.mjs appended to the log during this invocation → { delta, gate }.
// `before` is the log's prior content; a run that died before recording → ERROR.
function newRecord(before, after) {
  const fresh = after.slice(before.length).trim().split('\n').filter(Boolean)
  if (!fresh.length) return { delta: null, gate: 'ERROR' }
  try {
    const r = JSON.parse(fresh[fresh.length - 1])
    return { delta: r.delta ?? null, gate: r.gate || 'ERROR' }
  } catch { return { delta: null, gate: 'ERROR' } }
}

const readLog = () => existsSync(LOG) ? readFileSync(LOG, 'utf8') : ''

function runSet(setPath) {
  const before = readLog()
  try {
    execFileSync('node', [RUNNER, setPath], { encoding: 'utf8', timeout: 600000, maxBuffer: 10 * 1024 * 1024 })
  } catch { /* exit 2 on all-errored — the ERROR record still landed in the log */ }
  return newRecord(before, readLog())
}

function selfTest() {
  const samples = [
    ['fresh line parsed', ['old\n', 'old\n{"kind":"eval","delta":67,"gate":"PASS"}\n'], { delta: 67, gate: 'PASS' }],
    ['no growth -> ERROR', ['old\n', 'old\n'], { delta: null, gate: 'ERROR' }],
    ['malformed -> ERROR', ['', 'not json\n'], { delta: null, gate: 'ERROR' }],
    ['empty before', ['', '{"delta":0,"gate":"NO MOVEMENT"}\n'], { delta: 0, gate: 'NO MOVEMENT' }],
    ['error record', ['x\n', 'x\n{"delta":null,"gate":"ERROR"}\n'], { delta: null, gate: 'ERROR' }],
    ['last of several fresh', ['', '{"delta":1,"gate":"PASS"}\n{"delta":-25,"gate":"NO MOVEMENT"}\n'], { delta: -25, gate: 'NO MOVEMENT' }],
  ]
  let ok = true
  for (const [n, [before, after], want] of samples) {
    const got = newRecord(before, after)
    const good = got.delta === want.delta && got.gate === want.gate
    ok &&= good
    console.log(`${good ? 'ok' : 'XX'}  ${n}: delta=${got.delta} gate=${got.gate}`)
  }
  console.log(ok ? '\nself-test PASS' : '\nself-test FAIL')
  process.exit(ok ? 0 : 1)
}

function main(dry) {
  const sets = readdirSync(SETS_DIR).filter(f => f.endsWith('.json')).sort()
  const rows = []
  for (const f of sets) {
    const skill = f.replace('.json', '')
    process.stderr.write(`measuring ${skill}…\n`)
    rows.push({ skill, ...runSet(`${SETS_DIR}/${f}`) })
  }

  console.log('\nskill                            Δ       gate')
  for (const r of rows) {
    const d = r.delta === null ? '—' : `${r.delta >= 0 ? '+' : ''}${r.delta}%`
    const flag = r.gate === 'NO MOVEMENT' ? '  <- no movement' : r.gate === 'ERROR' ? '  (eval errored — auth?)' : ''
    console.log(`${r.skill.padEnd(32)} ${d.padStart(5)}   ${r.gate}${flag}`)
  }

  const errored = rows.filter(r => r.gate === 'ERROR').length
  const flagged = rows.filter(r => r.gate === 'NO MOVEMENT')
  let pending = []
  if (existsSync(BACKLOG)) pending = (JSON.parse(readFileSync(BACKLOG, 'utf8')).items || []).filter(i => i.status === 'pending')

  console.log(`\n${rows.length} skills measured · ${errored} eval-errored · ${flagged.length} flagged (Δ≤0)`)
  if (flagged.length) console.log('  flagged → re-examine or revert: ' + flagged.map(r => r.skill).join(', '))
  console.log(`\nbacklog: ${pending.length} pending borrow(s) to evaluate next (author via writing-skills):`)
  for (const i of pending.slice(0, 5)) console.log(`  - ${i.id}: ${i.hypothesis}`)

  if (errored === rows.length) {
    console.log('\nAll evals errored — run from a logged-in terminal (see scripts/eval.sh). No measure-run record written.')
    return
  }
  if (dry) { console.log('\n--dry: no measure-run record written.'); return }

  const rec = { kind: 'measure-run', ts: new Date().toISOString(), rows, flagged: flagged.map(r => r.skill), errored }
  appendFileSync(LOG, JSON.stringify(rec) + '\n')
  console.log(`\nAppended measure-run record to ${LOG} (lessons.md is for human-written conclusions).`)
}

const arg = process.argv[2]
if (arg === '--self-test') selfTest()
else main(arg === '--dry')
