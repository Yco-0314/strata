#!/usr/bin/env node
// Architect CI drift gate. Two jobs, both mechanical:
//  1. Invariant survival — load-bearing phrases (the ponytail safety carve-out + ladder
//     anchors) must exist verbatim (by substring) in BOTH the canonical ponytail SKILL.md
//     AND the resident injector (hooks/session-start.mjs). A reword in either trips this.
//  2. Skill conformance — every SKILL.md: name == dir, invocation ⇔ disable-model-invocation,
//     description <= 1024 chars (agentskills.io spec).
// Run from the Architect/ root:  node scripts/check-rule-copies.mjs
// Borrowed from ponytail's check-rule-copies.js (canonical-body + thin-adapter drift model).

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PONYTAIL = 'skills/l0-constitution/ponytail/SKILL.md'
const INJECTOR = 'hooks/session-start.mjs'

// Phrases that must survive in both the canonical skill and the injected copy.
const INVARIANTS = [
  'input validation at trust boundaries',
  'error handling that prevents data loss',
  'accessibility',
  'grep every caller',
  'match the surrounding style',
  'ONE runnable check',
  'Stdlib does it',
  'native platform feature',
]

let failures = 0
const fail = (msg) => { console.log(`  XX ${msg}`); failures++ }

// --- job 1: invariant survival ---
// Normalise whitespace so a phrase matches regardless of markdown line-wrapping.
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ')
console.log('invariant survival (ponytail SKILL.md ∩ injector):')
const pony = norm(readFileSync(PONYTAIL, 'utf8'))
const inj = norm(readFileSync(INJECTOR, 'utf8'))
for (const phrase of INVARIANTS) {
  const p = norm(phrase)
  const inPony = pony.includes(p), inInj = inj.includes(p)
  if (inPony && inInj) console.log(`  ok "${phrase}"`)
  else fail(`"${phrase}" missing in ${!inPony ? 'ponytail SKILL.md' : ''}${!inPony && !inInj ? ' and ' : ''}${!inInj ? 'injector' : ''}`)
}

// --- job 2: skill conformance ---
console.log('\nskill conformance (name==dir, invocation⇔disable, desc<=1024):')
function* skillDirs(root) {
  for (const e of readdirSync(root)) {
    const p = join(root, e)
    if (!statSync(p).isDirectory()) continue
    let hasSkill = false
    try { hasSkill = statSync(join(p, 'SKILL.md')).isFile() } catch { /* none */ }
    if (hasSkill) yield p
    yield* skillDirs(p)
  }
}
let n = 0
for (const dir of skillDirs('skills')) {
  n++
  const name = dir.split('/').pop()
  const raw = readFileSync(join(dir, 'SKILL.md'), 'utf8')
  const fm = raw.split('---')[1] || ''
  const declared = (fm.match(/^name:\s*(\S+)/m) || [])[1]
  const disabled = /disable-model-invocation:\s*true/.test(fm)
  const inv = (fm.match(/^\s+invocation:\s*(\S+)/m) || [])[1] || ''
  const dm = fm.match(/^description:\s*([\s\S]*?)(?=^\w[\w-]*:|\s+\w+:|$)/m)
  const dlen = dm ? dm[1].replace(/\s+/g, ' ').trim().length : 0
  if (declared !== name) fail(`${name}: frontmatter name "${declared}" != dir`)
  if (disabled !== (inv === 'user-invoked')) fail(`${name}: disable flag (${disabled}) inconsistent with invocation "${inv}"`)
  if (dlen > 1024) fail(`${name}: description ${dlen} > 1024 chars`)
  if (declared === name && disabled === (inv === 'user-invoked') && dlen <= 1024) console.log(`  ok ${name}`)
}

console.log(`\n${n} skills checked, ${failures} failure(s)`)
process.exit(failures ? 1 : 0)
