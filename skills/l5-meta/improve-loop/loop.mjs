#!/usr/bin/env node
// improve-loop engine — the measure→gate→record arc of the meta-loop, automated.
// Runs every skill-eval set, applies the Δ ship-gate, flags dead weight (Δ≤0), appends a
// dated run to lessons.md, and surfaces the next backlog borrows. The 'apply' (editing a
// skill) stays a human/agent step — a script editing skills blind is the over-reach ponytail
// forbids. Run from the Architect/ root, in a logged-in terminal (same auth as skill-eval):
//   node skills/l5-meta/improve-loop/loop.mjs            # measure all, gate, write lessons.md
//   node skills/l5-meta/improve-loop/loop.mjs --dry      # measure + print, no lessons.md write
//   node skills/l5-meta/improve-loop/loop.mjs --self-test # prove the parser (no API)

import { readFileSync, readdirSync, existsSync, appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const SETS_DIR = 'skills/l5-meta/skill-eval/sets'
const RUNNER = 'skills/l5-meta/skill-eval/run.mjs'
const BACKLOG = 'skills/l5-meta/improve-loop/backlog.json'
const LESSONS = 'lessons.md'

// Pure: parse run.mjs stdout → { delta: number|null, gate }
function parseRun(out) {
  if (/All runs errored|runner error \(auth/.test(out)) return { delta: null, gate: 'ERROR' }
  const dm = out.match(/Δ\s*([+-]?\d+)%/)
  const gate = /ship gate:\s*PASS/.test(out) ? 'PASS'
    : /NO MOVEMENT/.test(out) ? 'NO MOVEMENT' : 'UNKNOWN'
  return { delta: dm ? parseInt(dm[1], 10) : null, gate }
}

function runSet(setPath) {
  try {
    const out = execFileSync('node', [RUNNER, setPath], { encoding: 'utf8', timeout: 600000, maxBuffer: 10 * 1024 * 1024 })
    return parseRun(out)
  } catch (e) {
    return parseRun(e.stdout || '')
  }
}

function selfTest() {
  const samples = [
    ['pass', '  pass rate baseline 1/3 (33%) with-skill 3/3 (100%) Δ +67%\n  ship gate: PASS — skill moves the number', { delta: 67, gate: 'PASS' }],
    ['nomove', '  pass rate baseline 3/3 with-skill 3/3 Δ +0%\n  ship gate: NO MOVEMENT — does this skill earn its context budget?', { delta: 0, gate: 'NO MOVEMENT' }],
    ['neg', '  Δ -25%\n  ship gate: NO MOVEMENT', { delta: -25, gate: 'NO MOVEMENT' }],
    ['error', 'All runs errored. Is claude authenticated and on PATH?', { delta: null, gate: 'ERROR' }],
  ]
  let ok = true
  for (const [n, s, want] of samples) {
    const got = parseRun(s)
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
    console.log('\nAll evals errored — run from a logged-in terminal (see scripts/eval.sh). lessons.md not updated.')
    return
  }
  if (dry) { console.log('\n--dry: lessons.md not written.'); return }

  const date = new Date().toISOString().slice(0, 10)
  const body = rows.map(r => `  - ${r.skill}: Δ ${r.delta === null ? 'n/a' : (r.delta >= 0 ? '+' : '') + r.delta + '%'} (${r.gate})`).join('\n')
  const tail = flagged.length ? `\n  flagged Δ≤0: ${flagged.map(r => r.skill).join(', ')}\n` : ''
  appendFileSync(LESSONS, `\n## ${date} — improve-loop measure run\n\n${body}\n${tail}`)
  console.log(`\nAppended this run to ${LESSONS}.`)
}

const arg = process.argv[2]
if (arg === '--self-test') selfTest()
else main(arg === '--dry')
