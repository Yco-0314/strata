#!/usr/bin/env node
// L5 skill-eval — with-skill vs baseline harness (zero deps). Run from the Architect/ root.
//   node skills/l5-meta/skill-eval/run.mjs <eval-set.json>   measure a skill
//   node skills/l5-meta/skill-eval/run.mjs --self-test       prove the scorer (no API)
// Env: EVAL_MODEL (default set.model or 'haiku'); EVAL_N runs per case for a majority
//      vote (default 1, absorbs LLM non-determinism); EVAL_JUDGE_MODEL for `judge`
//      assertions (default 'sonnet').
// Runner: ANTHROPIC_API_KEY set -> direct Anthropic API (curl); else the local `claude` CLI.
// Artifacts: per-case transcripts -> runs/<stamp>-<set>/, one JSONL record -> runs/log.jsonl
// (always appended, even on all-errored runs) — improve-loop's transcript-feedback reads these.
// Borrowed: anthropics/skills skill-creator's with-skill-vs-baseline loop. See ADR 0001 / CONTEXT-MAP L5.

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const RUNS_DIR = 'skills/l5-meta/skill-eval/runs'

const ERR = '__RUNNER_ERROR__'

// Pure: strip a secret from an error message before it lands in transcripts/records.
// (execFileSync failures embed the full curl command line — key included — in e.message.)
export const sanitize = (msg, secret) => secret ? String(msg).split(secret).join('<redacted>') : String(msg)

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

// Real token usage, summed across API calls this run; stays null on the CLI path (which
// reports no usage) — record null rather than invent a number.
let TOKENS = null

// Send both auth headers so any Anthropic-compatible endpoint works:
// Anthropic uses x-api-key; some compat providers (e.g. DeepSeek /anthropic) use Bearer.
function curlMessages(base, key, payload) {
  return execFileSync('curl', ['-s', `${base}/v1/messages`,
    '-H', `x-api-key: ${key}`,
    '-H', `authorization: Bearer ${key}`,
    '-H', 'anthropic-version: 2023-06-01',
    '-H', 'content-type: application/json',
    '-d', JSON.stringify(payload)], { encoding: 'utf8', timeout: 180000, maxBuffer: 10 * 1024 * 1024 })
}
function runApi(prompt, system, model) {
  const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')
  const key = API_KEY()
  const payload = { model: mapModel(model), max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }
  if (system) payload.system = system
  let out
  // One retry on TRANSPORT failure only (curl throws: reset/timeout/DNS) — a transient network
  // window killed 40/40 calls of one set on 2026-07-06. API-level errors are never retried.
  try {
    out = curlMessages(base, key, payload)
  } catch {
    try { out = curlMessages(base, key, payload) } catch (e) { return `${ERR} ${sanitize(e.message, key)}` }
  }
  let j
  try { j = JSON.parse(out) } catch { return `${ERR} non-JSON API reply: ${out.slice(0, 160)}` }
  if (j.error || j.type === 'error') return `${ERR} API ${j.error?.type || ''}: ${(j.error?.message || '').slice(0, 160)}`
  if (j.usage) {
    TOKENS ??= { input: 0, output: 0 }
    TOKENS.input += j.usage.input_tokens || 0
    TOKENS.output += j.usage.output_tokens || 0
  }
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

// grade one run of a case → { ok: true|false|null(error), out: transcript }
function gradeOnce(c, system, model, judgeModel) {
  const out = runModel(c.prompt, system, model)
  if (out.startsWith(ERR)) return { ok: null, out }
  for (const a of c.assert) {
    const ok = a.kind === 'judge' ? judge(out, a.rubric, judgeModel) : check(out, a)
    if (ok === null) return { ok: null, out }
    if (!ok) return { ok: false, out }
  }
  return { ok: true, out }
}

// grade N runs → { verdict: majority|null(all errored), outs: transcripts }
function gradeCase(c, system, model, judgeModel, n) {
  const results = [], outs = []
  for (let i = 0; i < n; i++) {
    const r = gradeOnce(c, system, model, judgeModel)
    outs.push(r.out)
    if (r.ok !== null) results.push(r.ok)
  }
  return { verdict: results.length ? majority(results) : null, outs }
}

// Pure: assemble the runs/log.jsonl record for one eval run (kind:'eval';
// loop.mjs appends its own kind:'measure-run' lines to the same file).
function buildRecord({ ts, set, skill, model, judgeModel, n, cases, dir, tokens = null }) {
  const graded = cases.filter(c => c.baseline !== null && c.skill !== null)
  const baselinePass = graded.filter(c => c.baseline).length
  const skillPass = graded.filter(c => c.skill).length
  const delta = graded.length ? Math.round((skillPass - baselinePass) / graded.length * 100) : null
  const gate = !graded.length ? 'ERROR' : skillPass > baselinePass ? 'PASS' : 'NO MOVEMENT'
  return { kind: 'eval', ts, set, skill, model, judgeModel, n, cases, graded: graded.length, errors: cases.length - graded.length, baselinePass, skillPass, delta, gate, tokens, dir }
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
  const mk = (cases) => buildRecord({ ts: 't', set: 's', skill: null, model: 'haiku', judgeModel: 'sonnet', n: 1, cases, dir: 'd' })
  const r1 = mk([{ id: 'a', baseline: false, skill: true }, { id: 'b', baseline: true, skill: true }, { id: 'c', baseline: null, skill: true }])
  eq('record delta skips errored', r1.delta, 50)
  eq('record gate PASS', r1.gate, 'PASS')
  eq('record errors counted', r1.errors, 1)
  const r2 = mk([{ id: 'a', baseline: null, skill: null }])
  eq('record all-errored gate', r2.gate, 'ERROR')
  eq('record all-errored delta', r2.delta, null)
  eq('record no-movement gate', mk([{ id: 'a', baseline: true, skill: true }]).gate, 'NO MOVEMENT')
  eq('record tokens default null', mk([{ id: 'a', baseline: true, skill: true }]).tokens, null)
  eq('sanitize redacts secret', sanitize('curl -H x-api-key: sk-abc123 failed', 'sk-abc123'), 'curl -H x-api-key: <redacted> failed')
  eq('sanitize no secret passthrough', sanitize('plain error', ''), 'plain error')
  eq('record tokens passthrough', buildRecord({ ts: 't', set: 's', skill: null, model: 'm', judgeModel: 'j', n: 1, cases: [], dir: 'd', tokens: { input: 5, output: 7 } }).tokens.output, 7)
  console.log(ok ? '\nself-test PASS' : '\nself-test FAIL')
  process.exit(ok ? 0 : 1)
}

function main(setPath) {
  const set = JSON.parse(readFileSync(setPath, 'utf8'))
  const model = process.env.EVAL_MODEL || set.model || 'haiku'
  const judgeModel = process.env.EVAL_JUDGE_MODEL || 'sonnet'
  const n = Math.max(1, parseInt(process.env.EVAL_N || '1', 10))
  const system = set.skill ? skillBody(set.skill) : null
  const setName = setPath.split('/').pop().replace(/\.json$/, '')
  const ts = new Date().toISOString()
  const dir = `${RUNS_DIR}/${ts.replace(/[:.]/g, '-')}-${setName}`
  mkdirSync(dir, { recursive: true })
  console.log(`skill: ${set.skill || '(none)'}   model: ${model}   N: ${n}   cases: ${set.cases.length}\n`)
  // judge==model is a confound: a judge no stronger than the model under test can fail a correct
  // answer and manufacture a false Δ0 (seen for real 2026-07-06 — debugging Δ0→+75% once the judge
  // was upgraded). Warn; `judge`-graded cases are unreliable when this fires.
  if (mapModel(model) === mapModel(judgeModel)) process.stderr.write(`  ⚠ judge (${judgeModel}) is not stronger than the model under test — judge-graded cases may be unreliable; use a stronger EVAL_JUDGE_MODEL.\n`)
  const sep = '\n\n===== next run =====\n\n'
  const cases = []
  for (const c of set.cases) {
    const b = gradeCase(c, null, model, judgeModel, n)
    const s = gradeCase(c, system, model, judgeModel, n)
    const safeId = c.id.replace(/[^\w.-]/g, '_')
    writeFileSync(`${dir}/${safeId}.baseline.txt`, b.outs.join(sep))
    writeFileSync(`${dir}/${safeId}.skill.txt`, s.outs.join(sep))
    cases.push({ id: c.id, baseline: b.verdict, skill: s.verdict })
    if (b.verdict === null || s.verdict === null) console.log(`  ${c.id.padEnd(18)} runner error (auth / undecidable)`)
    else console.log(`  ${c.id.padEnd(18)} baseline ${b.verdict ? 'PASS' : 'FAIL'}   with-skill ${s.verdict ? 'PASS' : 'FAIL'}`)
  }
  const rec = buildRecord({ ts, set: setName, skill: set.skill || null, model, judgeModel, n, cases, dir, tokens: TOKENS })
  appendFileSync(`${RUNS_DIR}/log.jsonl`, JSON.stringify(rec) + '\n')
  if (rec.gate === 'ERROR') {
    console.log('\nAll runs errored. Is `claude` authenticated and on PATH? Try: claude -p "hi" --model haiku')
    process.exit(2)
  }
  const tot = rec.graded
  console.log(`\n  pass rate   baseline ${rec.baselinePass}/${tot} (${Math.round(rec.baselinePass / tot * 100)}%)   with-skill ${rec.skillPass}/${tot} (${Math.round(rec.skillPass / tot * 100)}%)   Δ ${rec.delta >= 0 ? '+' : ''}${rec.delta}%`)
  console.log(`  ship gate: ${rec.gate === 'PASS' ? 'PASS — skill moves the number' : 'NO MOVEMENT — does this skill earn its context budget?'}`)
  console.log(`  transcripts: ${dir}/   record: ${RUNS_DIR}/log.jsonl`)
}

const arg = process.argv[2]
if (!arg || arg === '--self-test') selfTest()
else main(arg)
