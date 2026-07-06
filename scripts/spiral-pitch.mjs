#!/usr/bin/env node
// spiral-pitch — the second-order self-improvement instrument.
// A first-order loop edits the TASK; a spiral edits the SYSTEM (its own skills/gates/hooks).
// Pitch = the rate of VERIFIED second-order self-change per unit time. It reads strata's own
// change ledger (backlog.json resolved items — the atomic, machine-checkable self-changes) and
// classifies each by its EVIDENCE, not by churn:
//   SHIP — moved a measured Δ>0 (or removed a documented failure mode)
//   GATE — structural addition verified by review / self-test / a gate (no single-shot Δ)
//   NULL — an honest convergence / revert / correction (a candidate closed = knowledge gained)
// The NULL class is what makes pitch un-game-able: you cannot inflate it with additions, because
// proving something should NOT ship (or should be removed) counts too. A spiral whose null-pitch
// is zero is not measuring — it never rejects anything.
//
// Why the ledger, not git: strata's git history is squashed (~5 commits); the real cycle history
// lives in the dated resolutions. runs/log.jsonl (automated eval evidence) is still empty
// (evals are auth-blocked), so classification currently reads human-written resolution prose —
// a weak, self-reported signal, flagged as such. See docs/spiral-engineering (research).
//   node scripts/spiral-pitch.mjs             # strata's pitch curve, per-item classification
//   node scripts/spiral-pitch.mjs --self-test # prove the classifier + math (no I/O)

import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..') // cwd-independent
const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: first YYYY-MM-DD in a string, or null.
export const firstDate = (s = '') => (s.match(/\b(20\d\d-\d{2}-\d{2})\b/) || [])[1] || null

// Pure: classify a resolution's EVIDENCE → ship | gate | null | unknown.
// Order matters: a recorded correction/convergence (null) can also contain a Δ number, so the
// null signals are tested first — the honest "don't chase this" verdict wins over the raw number.
export function classify(text = '') {
  const t = text.toLowerCase()
  if (/revert|superseded|converge|no movement|do not chase|do-not-chase|corrected|true Δ 0|true delta 0|stays pending|out of scope/i.test(text)) return 'null'
  if (/Δ\s*[+-]?\s*[1-9]\d*\s*%|delta\s*\+?\s*[1-9]\d*\s*%|ships\b|moves the number|no regression/i.test(text)) return 'ship'
  if (/gate-type|gate,|a gate|no single-shot|no Δ|no delta|built |added |shipped/i.test(t) || /shipped/i.test(text)) return 'gate'
  return 'unknown'
}

// Pure: ISO-week key (YYYY-Www) for bucketing, from a YYYY-MM-DD string.
export function isoWeek(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const day = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7)
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// Pure: resolved items → pitch stats. Each resolved item is one verified self-change; unresolved
// items are the worklist (pitch's future fuel, not counted). Days span = last-first resolution date.
export function computePitch(items) {
  const resolved = items.filter(i => i.status === 'resolved')
  const events = resolved.map(i => {
    const d = firstDate(i.resolution || '')
    // Prefer the human-recorded evidence class; fall back to prose-mining only when an author
    // forgot to tag it (the fallback is fragile — adversarial prose defeats regex, which is
    // exactly why the structured field exists).
    const klass = ['ship', 'gate', 'null'].includes(i.spiralClass) ? i.spiralClass : classify(i.resolution || '')
    return { id: i.id, date: d, class: klass, tagged: !!i.spiralClass }
  }).filter(e => e.date).sort((a, b) => a.date.localeCompare(b.date))

  const byClass = { ship: 0, gate: 0, null: 0, unknown: 0 }
  const byWeek = {}
  for (const e of events) {
    byClass[e.class]++
    ;(byWeek[isoWeek(e.date)] ??= { ship: 0, gate: 0, null: 0, unknown: 0 }).total = 0
    byWeek[isoWeek(e.date)][e.class]++
  }
  for (const w of Object.values(byWeek)) w.total = w.ship + w.gate + w.null + w.unknown

  const dates = events.map(e => e.date)
  const first = dates[0], last = dates[dates.length - 1]
  const spanDays = first ? Math.max(1, Math.round((Date.parse(last) - Date.parse(first)) / 86400000)) : 0
  const spanWeeks = Math.max(spanDays / 7, 1 / 7) // floor at one day so a single-day burst isn't ÷0
  const verified = events.length - byClass.unknown

  return {
    events, byClass, byWeek, first, last, spanDays,
    verified,
    pending: items.filter(i => i.status === 'pending').length,
    pitchPerWeek: +(verified / spanWeeks).toFixed(1),
    nullRatio: verified ? +(byClass.null / verified).toFixed(2) : 0,
  }
}

function selfTest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  ok(firstDate('2026-07-06: shipped') === '2026-07-06', 'firstDate extracts stamp')
  ok(firstDate('no date here') === null, 'firstDate null when absent')
  ok(classify('2026-06-27: ponytail SHIPS: +25% at (haiku × hard)') === 'ship', 'Δ+% → ship')
  ok(classify('shipped — debugging Phase 0 arbiter. Δ +75%. NO REGRESSION') === 'ship', 'ship+regression phrase → ship')
  ok(classify('shipped — review coverage pass. Gate-type addition (no single-shot Δ)') === 'gate', 'gate-type → gate')
  ok(classify('built skills/l5-meta/skill-validator (budget.mjs scan)') === 'gate', 'built tool → gate')
  ok(classify('added 4 borderline cases... Still Δ 0%. Closed: do not chase a Δ.') === 'null', 'do-not-chase → null (beats the Δ number)')
  ok(classify('Corrected → true Δ 0: Claude already verifies by default') === 'null', 'correction → null')
  ok(classify('reverted: no movement on the eval set') === 'null', 'revert → null')
  ok(classify('some prose with no evidence marker') === 'unknown', 'no marker → unknown')
  ok(isoWeek('2026-07-06') === isoWeek('2026-07-08'), 'same ISO week groups')
  const items = [
    { status: 'resolved', id: 'a', resolution: '2026-06-27: ponytail SHIPS +25%' },
    { status: 'resolved', id: 'b', resolution: '2026-06-27: built a gate (no Δ)' },
    { status: 'resolved', id: 'c', resolution: '2026-07-06: converged, do not chase' },
    { status: 'pending', id: 'd', hypothesis: 'x' },
    { status: 'resolved', id: 'e', resolution: 'no date, ignored' },
  ]
  const p = computePitch(items)
  ok(p.verified === 3, 'three dated resolved items verified')
  ok(p.byClass.ship === 1 && p.byClass.gate === 1 && p.byClass.null === 1, 'one of each class (from prose)')
  ok(p.pending === 1, 'pending counted separately')
  ok(p.spanDays === 9, '06-27 → 07-06 span is 9 days')
  ok(p.nullRatio === 0.33, 'null ratio = 1/3')
  // spiralClass overrides prose — the resolution says SHIP (+25%) but the tag says null, tag wins
  const tagged = [{ status: 'resolved', id: 't', spiralClass: 'null', resolution: '2026-06-27: SHIPS +25%' }]
  ok(computePitch(tagged).byClass.null === 1, 'spiralClass tag overrides prose classification')
  ok(computePitch([{ status: 'resolved', id: 'u', spiralClass: 'bogus', resolution: '2026-06-27: built x' }]).byClass.gate === 1, 'invalid tag falls back to prose')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0)
}

function report() {
  const backlog = JSON.parse(readFileSync(resolve(ROOT, 'skills/l5-meta/improve-loop/backlog.json'), 'utf8'))
  const p = computePitch(backlog.items || [])
  console.log('spiral-pitch — strata second-order self-improvement (source: backlog.json resolutions)\n')
  for (const e of p.events) console.log(`  ${e.date}  ${e.class.toUpperCase().padEnd(7)} ${e.id}`)
  if (p.byClass.unknown) console.log(`\n  ⚠ ${p.byClass.unknown} unclassified (resolution prose lacks an evidence marker — audit these)`)
  console.log(`\n  window        ${p.first} → ${p.last}  (${p.spanDays} days)`)
  console.log(`  verified      ${p.verified}   ship ${p.byClass.ship} · gate ${p.byClass.gate} · null ${p.byClass.null}`)
  console.log(`  PITCH         ${p.pitchPerWeek} verified self-changes / week`)
  console.log(`  null-ratio    ${p.nullRatio}   (0 = never rejects anything — suspicious; the spiral isn't measuring)`)
  console.log(`  worklist      ${p.pending} pending (future pitch, not yet counted)`)
  console.log('\n  by ISO week:')
  for (const [w, c] of Object.entries(p.byWeek).sort()) console.log(`    ${w}  total ${c.total}  (ship ${c.ship} · gate ${c.gate} · null ${c.null})`)
  const untagged = p.events.filter(e => !e.tagged).length
  console.log('\n  Honest limits: class is human-tagged (spiralClass) — auditable but self-reported'
    + (untagged ? `; ${untagged} item(s) fell back to fragile prose-mining` : '') + ';')
  console.log('  runs/log.jsonl is empty (evals auth-blocked) so no automated Δ evidence yet; N is small')
  console.log('  (SOC / avalanche-distribution analysis needs many more cycles — premature here).')
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) report()
