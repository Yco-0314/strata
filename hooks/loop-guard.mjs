#!/usr/bin/env node
// Architect PostToolUse hook — the debugging circuit breaker, mechanized.
// Fires after Bash. Tracks failing check commands (test/build/lint) per session, normalizes the
// error into a signature (timestamps/paths/line-numbers/counts stripped), and injects a warning
// as additionalContext when the loop stalls: same signature ≥3 times ("stop retrying variations
// — re-classify"), or ≥5 consecutive failures with no green run. A success resets everything.
// Warn-only, fast, model-free; the ledger lives in tmpdir per session — never in the project.
//
// Borrow: loop-context circuit breaker (cobusgreyling/loop-engineering — signature + stall
// triggers + "Already tried" injection); reset-on-success (humanlayer/12-factor-agents);
// warn-only stance (Kanevry/session-orchestrator). Mechanizes debugging's "3+ failed fixes →
// question the architecture" prose rule. See lessons.md 2026-07-06.
// Test:  node hooks/loop-guard.mjs --selftest

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: is this a check command worth tracking? (imperfect list — warn-only, so cheap misses are fine)
export const isCheckCommand = (cmd = '') =>
  /(^|[\s&|;(])(npm (test|run (test|build|lint|check|typecheck)\S*)|npx (jest|vitest|tsc|eslint|playwright)|yarn (test|build|lint)|pnpm (test|build|lint)|jest|vitest|pytest|tsc|eslint|cargo (test|build|check|clippy)|go (test|build|vet)|make|mvn|gradle|rspec|phpunit|mix test|dotnet (test|build)|node --test)\b/.test(cmd)

// Pure: flatten whatever shape tool_response takes into text.
export const textOf = (resp) => typeof resp === 'string' ? resp
  : [resp?.stdout, resp?.stderr, resp?.output, resp?.error].filter(s => typeof s === 'string').join('\n')

// Pure: did the check fail? Prefer explicit exit/error fields; fall back to output markers.
export function failed(resp) {
  if (resp == null) return false
  for (const k of ['exitCode', 'exit_code']) if (typeof resp[k] === 'number') return resp[k] !== 0
  for (const k of ['is_error', 'isError']) if (typeof resp[k] === 'boolean') return resp[k]
  return /(^|\s)(FAILED|FAILURES?|Error:|error TS\d+|Traceback|AssertionError|npm ERR!|ELIFECYCLE|Command failed|exit code [1-9])/m.test(textOf(resp))
}

// Pure: normalize an error tail so the "same" error hashes identically across attempts —
// strip timestamps, hex addresses, absolute paths, line:col, counts and durations.
export function signature(text) {
  const tail = text.split('\n').slice(-40).join('\n')
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g, '<ts>')
    .replace(/\b\d{2}:\d{2}:\d{2}\b/g, '<ts>')
    .replace(/0x[0-9a-fA-F]+/g, '<hex>')
    .replace(/(^|[\s('"`])(?:\/[\w.@+-]+){2,}/g, '$1<path>')
    .replace(/:\d+(:\d+)?\b/g, ':<n>')
    .replace(/\b\d+(\.\d+)?(ms|s)?\b/g, '<n>')
    .trim()
  const excerpt = tail.split('\n').filter(l => l.trim()).slice(-8).join('\n').slice(0, 600)
  let h = 5381
  for (let i = 0; i < tail.length; i++) h = ((h * 33) ^ tail.charCodeAt(i)) >>> 0
  return { hash: h.toString(16), excerpt }
}

// Pure: fold one check-command event into the ledger → { ledger, context|null }.
// Success resets the whole ledger (a green run breaks the stall — 12-factor semantics).
export function update(ledger, ev) {
  if (!ev.isFail) return { ledger: { fails: 0, sigs: {} }, context: null }
  const l = { fails: (ledger?.fails || 0) + 1, sigs: { ...(ledger?.sigs || {}) } }
  const s = l.sigs[ev.hash] = { count: 0, excerpt: ev.excerpt, commands: [], ...(l.sigs[ev.hash] || {}) }
  s.count += 1
  if (!s.commands.includes(ev.command)) s.commands = [...s.commands, ev.command].slice(-5)
  const keys = Object.keys(l.sigs)
  if (keys.length > 20) delete l.sigs[keys[0]] // ledger prune: oldest signature drops first
  let context = null
  if (s.count >= 3) {
    context = `loop-guard: the SAME failure signature has now occurred ${s.count}× (commands: ${s.commands.join(' | ')}). `
      + 'Same-error stall — stop retrying variations of one fix. Re-classify via the debugging skill '
      + '(contract-gap / verification-gap / implementation-bug / environment) and question the approach. '
      + `Already tried — do NOT repeat:\n${s.excerpt}`
  } else if (l.fails >= 5) {
    context = `loop-guard: ${l.fails} consecutive failing check commands with no green run. Step back — `
      + 'state a hypothesis before the next edit (debugging skill), or question whether the approach is wrong.'
  }
  return { ledger: l, context }
}

function selftest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  ok(isCheckCommand('npm test'), 'npm test tracked')
  ok(isCheckCommand('cd api && cargo test --all'), 'compound cargo test tracked')
  ok(isCheckCommand('node --test'), 'node --test tracked')
  ok(!isCheckCommand('git status'), 'git status ignored')
  ok(!isCheckCommand('echo test results'), 'echo mentioning test ignored')
  ok(failed({ exitCode: 1 }), 'exitCode 1 → failed')
  ok(!failed({ exitCode: 0, stdout: 'Error: none' }), 'exitCode 0 wins over marker text')
  ok(failed({ stdout: 'Traceback (most recent call last):' }), 'traceback marker → failed')
  ok(!failed({ stdout: 'all 12 passed' }), 'clean output → not failed')
  const a = signature('at /Users/x/app/src/a.ts:14:3\n2026-07-06T10:00:00Z FAIL expected 3 got 5 (12ms)')
  const b = signature('at /home/ci/proj/src/a.ts:99:1\n2026-07-06T11:22:33Z FAIL expected 3 got 5 (340ms)')
  ok(a.hash === b.hash, 'same error, different paths/lines/timestamps → same signature')
  ok(a.hash !== signature('TypeError: x is not a function').hash, 'different error → different signature')
  let st = { fails: 0, sigs: {} }, ctx = null
  for (let i = 0; i < 3; i++) ({ ledger: st, context: ctx } = update(st, { command: 'npm test', isFail: true, ...a }))
  ok(ctx !== null && ctx.includes('Already tried'), '3× same signature → stall warning with excerpt')
  ok(update(st, { command: 'npm test', isFail: false }).ledger.fails === 0, 'success resets the ledger')
  st = { fails: 0, sigs: {} }; ctx = null
  for (let i = 0; i < 5; i++) ({ ledger: st, context: ctx } = update(st, { command: 'npm test', isFail: true, hash: 'h' + i, excerpt: 'e' }))
  ok(ctx !== null && ctx.includes('consecutive'), '5 distinct consecutive failures → no-progress warning')
  st = { fails: 0, sigs: {} }
  for (let i = 0; i < 25; i++) ({ ledger: st } = update(st, { command: 'c', isFail: true, hash: 'x' + i, excerpt: 'e' }))
  ok(Object.keys(st.sigs).length <= 20, 'signature ledger pruned at 20')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0) // --selftest is CI/manual only, never the live hook path
}

if (invokedDirectly && process.argv[2] === '--selftest') selftest()
else if (invokedDirectly) {
  try {
    const payload = JSON.parse(readFileSync(0, 'utf8'))
    if (payload.tool_name !== 'Bash') process.exit(0)
    const cmd = payload.tool_input?.command || ''
    if (!isCheckCommand(cmd)) process.exit(0)
    const isFail = failed(payload.tool_response)
    const sig = isFail ? signature(textOf(payload.tool_response) || '(no output)') : {}
    const dir = join(tmpdir(), 'strata-loop-guard')
    const file = join(dir, `${(payload.session_id || 'unknown').replace(/[^\w-]/g, '_')}.json`)
    let prev = {}
    try { prev = JSON.parse(readFileSync(file, 'utf8')) } catch { /* fresh session */ }
    const { ledger, context } = update(prev, { command: cmd.slice(0, 200), isFail, ...sig })
    mkdirSync(dir, { recursive: true })
    writeFileSync(file, JSON.stringify(ledger))
    if (context) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: context } }))
  } catch { /* a guard must never break the session */ }
  process.exit(0)
}
