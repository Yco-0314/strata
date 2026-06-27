#!/usr/bin/env node
// Architect PostToolUse hook — edit-time skill self-correction.
// Fires after Write/Edit/MultiEdit. If the edited file is a SKILL.md, runs the FAST deterministic
// skill-validator checks (frontmatter conformance + token budget) on that one file, and — for
// invariant-bearing files (ponytail) — the drift gate. Violations are injected as additionalContext
// so the authoring agent fixes them in the same turn instead of waiting for CI. The expensive 6-axis
// LLM judge is NOT run here (a hook must be fast + model-free) — run `skill-validator` for that.
//
// Borrow: skill-tools PostToolUse self-correction pattern, wired to this framework's validator.
// Test:  node hooks/skill-postedit.mjs --selftest

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..') // framework root, cwd-independent
// True only when run as `node skill-postedit.mjs`, not when imported (so `analyze` is testable).
const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: analyze a SKILL.md's raw text given its directory name → list of issues.
export function analyze(raw, dir) {
  const issues = []
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) { issues.push('no YAML frontmatter (--- … ---)'); return issues }
  const fm = m[1], body = m[2].trim()
  const name = (fm.match(/^name:\s*(\S+)/m) || [])[1]
  if (name !== dir) issues.push(`name "${name}" != directory "${dir}" — agentskills.io requires name == dir`)
  const dm = fm.match(/description:\s*([\s\S]*?)(?=\n\w[\w-]*:|$)/)
  const desc = dm ? dm[1].replace(/\s+/g, ' ').trim() : ''
  if (!desc) issues.push('empty description')
  else if (desc.length > 1024) issues.push(`description ${desc.length} chars > 1024 (spec limit)`)
  const disabled = /disable-model-invocation:\s*true/.test(fm)
  const inv = (fm.match(/(?:^|\n)[ \t]*invocation:\s*([\w-]+)/) || [])[1] // line-anchored: avoid matching the tail of `disable-model-invocation:`
  if (inv === 'user-invoked' && !disabled) issues.push('invocation: user-invoked but missing disable-model-invocation: true')
  if (disabled && inv && inv !== 'user-invoked') issues.push(`disable-model-invocation: true but invocation: ${inv} (should be user-invoked)`)
  if (body.length > 6000) issues.push(`body ${body.length} chars > 6000 — trim (resident skills pay this every turn)`)
  else if (body.length > 4000) issues.push(`body ${body.length} chars > 4000 — consider trimming`)
  if (body.split('\n').length > 200) issues.push('body > 200 lines — sprawl')
  return issues
}

function driftGate() {
  try {
    const out = execFileSync('node', [resolve(ROOT, 'scripts/check-rule-copies.mjs')], { encoding: 'utf8', cwd: ROOT })
    return /0 failure/.test(out) ? null : out.trim().split('\n').slice(-1)[0]
  } catch (e) { return ('' + (e.stdout || e.message)).trim().split('\n').slice(-1)[0] }
}

function selftest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  const good = '---\nname: foo\ndescription: Use when bar.\n---\n\nbody'
  ok(analyze(good, 'foo').length === 0, 'clean skill → no issues')
  ok(analyze(good, 'mismatch').some(i => i.includes('!= directory')), 'name != dir flagged')
  ok(analyze('---\nname: x\ndescription:\n---\nb', 'x').some(i => i.includes('empty description')), 'empty desc flagged')
  ok(analyze('---\nname: x\ndescription: ' + 'a'.repeat(1100) + '\n---\nb', 'x').some(i => i.includes('> 1024')), 'long desc flagged')
  ok(analyze('---\nname: x\ndescription: d\ndisable-model-invocation: true\nmetadata:\n  invocation: model-invoked-primitive\n---\nb', 'x').some(i => i.includes('should be user-invoked')), 'disable + non-user-invoked invocation flagged')
  ok(analyze('---\nname: x\ndescription: d\nmetadata:\n  invocation: user-invoked\n---\nb', 'x').some(i => i.includes('missing disable')), 'user-invoked without disable flagged')
  ok(analyze('---\nname: x\ndescription: d\ndisable-model-invocation: true\nmetadata:\n  invocation: user-invoked\n---\nb', 'x').length === 0, 'proper user-invoked (disable + metadata invocation) → clean')
  ok(analyze('---\nname: x\ndescription: d\n---\n' + 'x'.repeat(6500), 'x').some(i => i.includes('> 6000')), 'body>6k flagged')
  ok(analyze('no frontmatter here', 'x').some(i => i.includes('no YAML')), 'missing frontmatter flagged')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 0 : 0) // never fail the hook process on selftest
}

if (invokedDirectly && process.argv[2] === '--selftest') selftest()
else if (invokedDirectly) {
  let payload
  try { payload = JSON.parse(readFileSync(0, 'utf8')) } catch { process.exit(0) }
  const tool = payload.tool_name
  const fp = payload.tool_input?.file_path
  if (!['Write', 'Edit', 'MultiEdit'].includes(tool) || !fp || !fp.endsWith('/SKILL.md')) process.exit(0)
  let issues = []
  try { issues = analyze(readFileSync(fp, 'utf8'), fp.split('/').slice(-2)[0]) } catch { process.exit(0) }
  if (/l0-constitution\/ponytail/.test(fp)) { const d = driftGate(); if (d) issues.push('drift gate: ' + d) }
  if (!issues.length) process.exit(0)
  const ctx = `skill-validator (edit-time) flagged ${fp.split('/').slice(-2).join('/')}:\n`
    + issues.map(i => '  - ' + i).join('\n')
    + '\nFix before continuing. For a deeper pass, run the 6-axis judge via skill-validator.'
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: ctx } }))
}
