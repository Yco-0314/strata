#!/usr/bin/env node
// skill-validator — deterministic budget scan (the cheap half; the 6-axis LLM judge is the
// other half, run via subagents). Run from the Architect/ root.
//   node skills/l5-meta/skill-validator/budget.mjs            scan every SKILL.md
//   node skills/l5-meta/skill-validator/budget.mjs --self-test
// Budgets: description <=1024 chars (agentskills.io spec); body soft-cap ~4000 chars, hard
// flag >6000 (resident skills pay this every turn); >200 lines flags sprawl.
import { readFileSync, readdirSync } from 'node:fs'

function walk(d) {
  let o = []
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`
    if (e.isDirectory()) o = o.concat(walk(p))
    else if (e.name === 'SKILL.md') o.push(p)
  }
  return o
}

function measure(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  const fm = m ? m[1] : ''
  const body = (m ? m[2] : raw).trim()
  const dm = fm.match(/description:\s*([\s\S]*?)(?=\n\w[\w-]*:|$)/)
  const desc = dm ? dm[1].replace(/\s+/g, ' ').trim() : ''
  return { desc: desc.length, body: body.length, lines: body.split('\n').length }
}

function flags(mm) {
  const f = []
  if (mm.desc > 1024) f.push('DESC>1024')
  if (mm.body > 6000) f.push('BODY>6k')
  else if (mm.body > 4000) f.push('body>4k')
  if (mm.lines > 200) f.push('lines>200')
  return f
}

function selfTest() {
  const raw = '---\nname: x\ndescription: hello there\n---\n\nbody one\nbody two'
  const mm = measure(raw)
  let ok = true
  const eq = (l, g, w) => { const good = g === w; ok &&= good; console.log(`${good ? 'ok' : 'XX'}  ${l}: ${g} want ${w}`) }
  eq('desc len', mm.desc, 'hello there'.length)
  eq('lines', mm.lines, 2)
  eq('tiny body unflagged', flags(mm).length, 0)
  eq('big body flagged', flags({ desc: 0, body: 7000, lines: 10 }).includes('BODY>6k'), true)
  eq('long desc flagged', flags({ desc: 1200, body: 100, lines: 5 }).includes('DESC>1024'), true)
  console.log(ok ? '\nself-test PASS' : '\nself-test FAIL')
  process.exit(ok ? 0 : 1)
}

if (process.argv[2] === '--self-test') selfTest()
else {
  const files = walk('skills').sort()
  console.log('skill                              desc  body  ~lines  flags')
  let flagged = 0
  for (const f of files) {
    const mm = measure(readFileSync(f, 'utf8'))
    const fl = flags(mm)
    if (fl.length) flagged++
    const name = f.split('/').slice(-2)[0]
    console.log(`${name.padEnd(34)} ${String(mm.desc).padStart(4)} ${String(mm.body).padStart(5)} ${String(mm.lines).padStart(6)}  ${fl.join(',')}`)
  }
  console.log(`\n${files.length} skills · ${flagged} flagged on budget`)
}
