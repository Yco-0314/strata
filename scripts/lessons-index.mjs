#!/usr/bin/env node
// lessons-index — the consumer for lessons.md's [[tag]] markers.
// Groups dated entries (## sections) by tag so an author finds prior attempts before re-trying one.
//   node scripts/lessons-index.mjs             # every tag → its entries
//   node scripts/lessons-index.mjs ponytail    # entries mentioning [[ponytail]]
//   node scripts/lessons-index.mjs --self-test # prove the parser (no file I/O)

import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..') // cwd-independent
const invokedDirectly = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

// Pure: markdown text → { tag: [section-heading, …] }. A section is a '## ' block; a [[tag]]
// anywhere inside attributes the whole entry. Duplicates within one section collapse.
export function index(text) {
  const out = {}
  let heading = '(preamble)'
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) { heading = line.slice(3).trim(); continue }
    for (const m of line.matchAll(/\[\[([\w-]+)\]\]/g)) {
      const tag = m[1]
      out[tag] ??= []
      if (out[tag][out[tag].length - 1] !== heading) out[tag].push(heading)
    }
  }
  return out
}

function selfTest() {
  let bad = 0
  const ok = (c, m) => { console.log(`${c ? 'ok' : 'XX'} ${m}`); if (!c) bad++ }
  const md = 'intro [[early]]\n## 2026-01-01 — first\nx [[ponytail]] y\nmore [[ponytail]] [[complexity-router]]\n## 2026-01-02 — second\nz [[ponytail]]\n'
  const i = index(md)
  ok(i.ponytail.length === 2, 'same tag twice in one section collapses to one entry')
  ok(i.ponytail[1] === '2026-01-02 — second', 'entry attributed to its section heading')
  ok(i['complexity-router'].length === 1, 'hyphenated tag parsed')
  ok(i.early[0] === '(preamble)', 'tag before any heading lands in preamble')
  ok(index('no tags here').ponytail === undefined, 'absent tag stays absent')
  console.log(bad ? '\nself-test FAIL' : '\nself-test PASS')
  process.exit(bad ? 1 : 0)
}

if (invokedDirectly && process.argv[2] === '--self-test') selfTest()
else if (invokedDirectly) {
  const idx = index(readFileSync(resolve(ROOT, 'lessons.md'), 'utf8'))
  const want = process.argv[2]
  const tags = want ? [want] : Object.keys(idx).sort()
  for (const t of tags) {
    const entries = idx[t] || []
    console.log(`[[${t}]] — ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`)
    for (const e of entries) console.log(`  - ${e}`)
  }
  if (want && !idx[want]) console.log('  (none — check the tag, or this ground is unbroken)')
}
