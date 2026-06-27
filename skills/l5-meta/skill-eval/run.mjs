#!/usr/bin/env node
// L5 skill-eval — with-skill vs baseline harness (zero deps). Run from the Architect/ root.
//   node skills/l5-meta/skill-eval/run.mjs <eval-set.json>   measure a skill
//   node skills/l5-meta/skill-eval/run.mjs --self-test       prove the scorer (no API)
// Env: EVAL_MODEL (default set.model or 'haiku'); EVAL_N runs per case for a majority
//      vote (default 1, absorbs LLM non-determinism); EVAL_JUDGE_MODEL for `judge`
//      assertions (default 'sonnet').
// Runner: ANTHROPIC_API_KEY set -> direct Anthropic API (curl); else the local `claude` CLI.
// Borrowed: anthropics/skills skill-creator's with-skill-vs-baseline loop. See ADR 0001 / CONTEXT-MAP L5.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const ERR = '__RUNNER_ERROR__'

function skillBody(path) {
  const raw = readFileSync(path, 'utf8')
  const m = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  return (m ? m[1] : raw).trim()
}

const MODEL_IDS = { haiku: 'claude-haiku-4-5-20251001', sonnet: 'claude-sonnet-4-6', opus: 'claude-opus-4-8' }
const mapModel = (m) => MODEL_IDS[m] || m

// Direct Anthropic API via curl (sync) — used when ANTHROPIC_API_KEY is set. Bypasses the
// `claude -p` subscription/headless policy (the 403 "Request not allowed" some accounts hit).
const API_KEY = () => process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || ''
function runApi(prompt, system, model) {
  const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')
  const key = API_KEY()
  const payload = { model: mapModel(model), max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }
  if (system) payload.system = system
  let out
  try {
    // Send both auth headers so any Anthropic-compatible endpoint works:
    // Anthropic uses x-api-key; some compat providers (e.g. DeepSeek /anthropic) use Bearer.
    out = execFileSync('curl', ['-s', `${base}/v1/messages`,
      '-H', `x-api-key: ${key}`,
      '-H', `authorization: Bearer ${key}`,
      '-H', 'anthropic-version: 2023-06-01',
      '-H', 'content-type: application/json',
      '-d', JSON.stringify(payload)], { encoding: 'utf8', timeout: 180000, maxBuffer: 10 * 1024 * 1024 })
  } catch (e) { return `${ERR} ${e.message}` }
  let j
  try { j = JSON.parse(out) } catch { return `${ERR} non-JSON API reply: ${out.slice(0, 160)}` }
  if (j.error || j.type === 'error') return `${ERR} API ${j.error?.type || ''}: ${(j.error?.message || '').slice(0, 160)}`
  const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('')
  return text.trim() ? text : `${ERR} empty API response`
}

// `claude -p` path (subscription login) — used when no ANTHROPIC_API_KEY is set.
function runCli(prompt, system, model) {
  const args = ['-p', prompt, '--model', model]
  if (system) args.push('--append-system-prompt', system)
  let out
  try {
    out = execFileSync('claude', args, { encoding: 'utf8', timeout: 180000, maxBuffer: 10 * 1024 * 1024 })
  } catch (e) {
    return `${ERR} ${e.stderr || e.message}`
  }
  // `claude -p` exits 0 even on auth failure, so a 401/403 would silently score as a FAIL.
  if (/Invalid bearer token|Failed to authenticate|API Error: 4\d\d|Request not allowed/i.test(out) || !out.trim()) {
    return `${ERR} ${out.trim().slice(0, 160) || 'empty output'}`
  }
  return out
}

// Dispatch: direct API if a key is present (preferred — works where `claude -p` is policy-blocked),
// otherwise the claude CLI.
const runModel = (prompt, system, model) =>
  API_KEY() ? runApi(prompt, system, model) : runCli(prompt, system, model)

// --- scoring (pure) ---
function check(out, a) {
  const re = new RegExp(a.pattern, a.flags || 'i')
  if (a.kind === 'excludes') return !re.test(out)
  if (a.kind === 'includes') return re.test(out)
  if (a.kind === 'verdict') return re.test(out.split('\n')[0] || '')
  throw new Error('unknown deterministic assertion kind: ' + a.kind)
}

function parseJudge(text) {
  const m = text.match(/"pass"\s*:\s*(true|false)/i)
  if (m) return /true/i.test(m[1])
  if (/\bFAIL\b/i.test(text)) return false
  if (/\bPASS\b/i.test(text)) return true
  return null // undecidable → caller treats as error, never a silent pass/fail
}

const majority = (bools) => bools.filter(Boolean).length > bools.length / 2

// --- judge (impure: one model call) ---
function judge(output, rubric, model) {
  const prompt = `You are grading an AI assistant's answer. It PASSES only if this is true:\n"${rubric}"\n\n--- ANSWER ---\n${output}\n--- END ANSWER ---\n\nReply with ONLY {"pass": true} or {"pass": false}.`
  const out = runModel(prompt, null, model)
  if (out.startsWith(ERR)) return null
  return parseJudge(out)
}

// grade one run of a case → true | false | null(error)
function gradeOnce(c, system, model, judgeModel) {
  const out = runModel(c.prompt, system, model)
  if (out.startsWith(ERR)) return null
  for (const a of c.assert) {
    const ok = a.kind === 'judge' ? judge(out, a.rubric, judgeModel) : check(out, a)
    if (ok === null) return null
    if (!ok) return false
  }
  return true
}

// grade N runs → majority verdict, or null if every run errored
function gradeCase(c, system, model, judgeModel, n) {
  const results = []
  for (let i = 0; i < n; i++) {
    const r = gradeOnce(c, system, model, judgeModel)
    if (r !== null) results.push(r)
  }
  return results.length ? majority(results) : null
}

// The one runnable check: the pure scorer (deterministic checks, judge parsing, vote).
function selfTest() {
  let ok = true
  const eq = (label, got, want) => { const good = got === want; ok &&= good; console.log(`${good ? 'ok' : 'XX'}  ${label}: got=${got} want=${want}`) }
  eq('excludes lodash import', check("import x from 'lodash'", { kind: 'excludes', pattern: "from ['\"]lodash" }), false)
  eq('includes deferral marker', check('Skipped: lodash, add when needed', { kind: 'includes', pattern: 'skipped|add when' }), true)
  eq('verdict ESCALATE line 1', check('VERDICT: ESCALATE\nx', { kind: 'verdict', pattern: 'ESCALATE' }), true)
  eq('mapModel haiku alias', mapModel('haiku'), 'claude-haiku-4-5-20251001')
  eq('mapModel passthrough', mapModel('claude-sonnet-4-6'), 'claude-sonnet-4-6')
  eq('verdict ESCALATE absent', check('VERDICT: TRIVIAL', { kind: 'verdict', pattern: 'ESCALATE' }), false)
  eq('parseJudge json true', parseJudge('{"pass": true}'), true)
  eq('parseJudge json false', parseJudge('result: {"pass":false}'), false)
  eq('parseJudge keyword FAIL', parseJudge('Verdict: FAIL — added a dep'), false)
  eq('parseJudge undecidable', parseJudge('hmm, unclear'), null)
  eq('majority 2of3', majority([true, true, false]), true)
  eq('majority 1of3', majority([true, false, false]), false)
  eq('majority tie 1of2', majority([true, false]), false)
  console.log(ok ? '\nself-test PASS' : '\nself-test FAIL')
  process.exit(ok ? 0 : 1)
}

function main(setPath) {
  const set = JSON.parse(readFileSync(setPath, 'utf8'))
  const model = process.env.EVAL_MODEL || set.model || 'haiku'
  const judgeModel = process.env.EVAL_JUDGE_MODEL || 'sonnet'
  const n = Math.max(1, parseInt(process.env.EVAL_N || '1', 10))
  const system = set.skill ? skillBody(set.skill) : null
  console.log(`skill: ${set.skill || '(none)'}   model: ${model}   N: ${n}   cases: ${set.cases.length}\n`)
  let base = 0, skill = 0, errors = 0
  for (const c of set.cases) {
    const b = gradeCase(c, null, model, judgeModel, n)
    const s = gradeCase(c, system, model, judgeModel, n)
    if (b === null || s === null) {
      errors++
      console.log(`  ${c.id.padEnd(18)} runner error (auth / undecidable)`)
      continue
    }
    base += b ? 1 : 0; skill += s ? 1 : 0
    console.log(`  ${c.id.padEnd(18)} baseline ${b ? 'PASS' : 'FAIL'}   with-skill ${s ? 'PASS' : 'FAIL'}`)
  }
  if (errors === set.cases.length) {
    console.log('\nAll runs errored. Is `claude` authenticated and on PATH? Try: claude -p "hi" --model haiku')
    process.exit(2)
  }
  const tot = set.cases.length - errors
  const bRate = base / tot, sRate = skill / tot, d = sRate - bRate
  console.log(`\n  pass rate   baseline ${base}/${tot} (${Math.round(bRate * 100)}%)   with-skill ${skill}/${tot} (${Math.round(sRate * 100)}%)   Δ ${d >= 0 ? '+' : ''}${Math.round(d * 100)}%`)
  console.log(`  ship gate: ${sRate > bRate ? 'PASS — skill moves the number' : 'NO MOVEMENT — does this skill earn its context budget?'}`)
}

const arg = process.argv[2]
if (!arg || arg === '--self-test') selfTest()
else main(arg)
