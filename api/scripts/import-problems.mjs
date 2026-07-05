// One-off importer: load the LeetCode-style problem JSON files into the
// `problems` table. Maps problemName → title, keeps description (HTML) and the
// reference solution, and derives a slug from the filename. Difficulty isn't in
// the source data, so it's distributed deterministically by problem number.
//
// Usage: node scripts/import-problems.mjs [/path/to/problems]
import 'dotenv/config'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

const DIR = process.argv[2] ?? '/Users/nitinankad/Downloads/problems'
const DIFFICULTIES = ['easy', 'medium', 'hard']

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

function parseFile(name) {
  // "125. valid-palindrome.json" → { num: 125, slug: "valid-palindrome" }
  const base = name.replace(/\.json$/i, '')
  const m = base.match(/^(\d+)\.\s*(.+)$/)
  if (!m) return null
  return { num: Number(m[1]), slug: m[2].trim() }
}

const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.json'))
const rows = []
let skipped = 0

for (const file of files) {
  const meta = parseFile(file)
  if (!meta) { skipped++; continue }
  let data
  try {
    data = JSON.parse(readFileSync(join(DIR, file), 'utf8'))
  } catch {
    skipped++ // malformed JSON
    continue
  }
  const title = (data.problemName ?? '').trim()
  const description = data.description ?? ''
  if (!title || !description) { skipped++; continue }

  rows.push({
    slug: meta.slug,
    title,
    description,
    solution: data.solution ?? null,
    difficulty: DIFFICULTIES[meta.num % 3],
    is_published: true,
  })
}

// De-dupe by slug (keep first) so a batch insert can't collide with itself.
const bySlug = new Map()
for (const r of rows) if (!bySlug.has(r.slug)) bySlug.set(r.slug, r)
const unique = [...bySlug.values()]

console.log(`parsed ${rows.length} problems (${skipped} skipped), ${unique.length} unique slugs`)

let inserted = 0
const CHUNK = 500
for (let i = 0; i < unique.length; i += CHUNK) {
  const chunk = unique.slice(i, i + CHUNK)
  // Existing slugs are left untouched (rooms may already point at them).
  const res = await sql`
    insert into problems ${sql(chunk, 'slug', 'title', 'description', 'solution', 'difficulty', 'is_published')}
    on conflict (slug) do nothing
  `
  inserted += res.count
  process.stdout.write(`\rinserted ${inserted}…`)
}

const counts = await sql`
  select difficulty, count(*)::int as n from problems where is_published group by difficulty order by difficulty
`
console.log(`\ndone. total published by difficulty:`, Object.fromEntries(counts.map((c) => [c.difficulty, c.n])))

await sql.end()
