// Lists the bandi that are currently held back by the seven-day release delay,
// with the URL each one can already be viewed at.
//
// A newly added bando is subscriber-only for its first week: it is absent from
// the home table and the map until the delay expires (see "The seven-day
// release delay" in CLAUDE.md). Its detail page, however, is built and served
// from day 0 — the newsletter links to it — it is simply unlinked, kept out of
// the sitemap (app/sitemap.ts builds that from the published rows only) and
// marked `noindex`.
//
// So the page can be checked before it goes public; the only missing piece is
// knowing its address, because the slug is computed rather than stored. That is
// what this script prints.
//
// Usage, from the repo root:
//
//   node scripts/preview-embargoed.mjs             -> the bandi being held back
//   node scripts/preview-embargoed.mjs --all       -> every bando, with its status
//   node scripts/preview-embargoed.mjs --markdown  -> a GitHub job-summary table
//   node scripts/preview-embargoed.mjs --file X    -> read X instead of data/data.json
//
// `--markdown` is what .github/workflows/netlify-deploy.yml appends to
// $GITHUB_STEP_SUMMARY after a staging deploy, so the colleague gets a clickable
// list without opening a terminal. Same data, second rendering — deliberately
// one script rather than two that can disagree.
//
// Read-only: it opens data/data.json and writes nothing, anywhere.

import { readFileSync } from 'node:fs'

// The real implementations, not copies. Node >= 22.18 strips the types on the
// fly, which is what lets a bare-node script import them — the same thing
// scripts/preview-welcome.mjs relies on, and fine here for the same reason:
// neither script is ever run in CI.
//
// All three modules import nothing themselves, so there is no `@/` alias for
// Node to fail to resolve. Using them directly is the point: newsletter/
// render.mjs has to carry hand-written mirrors of `hasExpired`, `trimStrings`
// and `slug` because the Actions campaign cannot import TypeScript, and every
// mirror is one more thing that can silently drift. This script needs no such
// excuse, so it gets none.
import {
  RELEASE_DELAY_DAYS,
  currentDay,
  daysUntilRelease,
  detectionDay,
  isPublished,
  releaseCutoff,
} from '../lib/embargo.ts'
import { toSlug } from '../lib/slug.ts'
import { trimStrings } from '../lib/trim.ts'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}

const STAGING = 'https://staging--bandincc.netlify.app'
const PRODUCTION = 'https://www.bandincc.it'

const file = value('--file') ?? 'data/data.json'

// The same normalisation lib/data.ts applies on read: trim first (a padded
// location would produce a slug with a leading hyphen, i.e. the wrong URL),
// then fold `detectedat` into the `detectedAt` day every helper here expects.
const rows = JSON.parse(readFileSync(file, 'utf8'))
  .map(trimStrings)
  .map((row) => ({ ...row, detectedAt: detectionDay(row.detectedat) }))

// Both halves resolved once, exactly as lib/data.ts does it, so no row can land
// in neither list or in both by straddling midnight in Rome.
const cutoff = releaseCutoff()
const today = currentDay()

const embargoed = rows.filter((row) => !isPublished(row, cutoff, today))
const published = rows.filter((row) => isPublished(row, cutoff, today))

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The calendar day a held bando becomes public, derived from `daysUntilRelease`
 * rather than recomputed — the release date is whatever that function says it
 * is, and adding `RELEASE_DELAY_DAYS` here independently would be a second
 * opinion about the rule.
 */
const releaseDate = (detectedAt) => {
  const days = daysUntilRelease(detectedAt)
  return new Date(Date.parse(`${today}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

// encodeURI leaves "(", ")" and "'" alone — they are all in its unreserved set
// — so for every slug this dataset produces the readable form and the encoded
// form are identical, and what is printed can be pasted straight into an
// address bar. Checked rather than assumed: if a future location ever does need
// escaping, the encoded form is printed underneath instead of silently handing
// over a URL that 404s.
const urls = (location) => {
  const slug = toSlug(location)
  const encoded = encodeURI(slug)
  return { slug, encoded, differs: encoded !== slug }
}

const describe = (row, { held }) => {
  const { slug, encoded, differs } = urls(row.location)
  const lines = [
    `  ${row.location}`,
    `    slug        ${slug}`,
    ...(differs ? [`    encoded     ${encoded}   <- paste THIS one`] : []),
    `    staging     ${STAGING}/bandi/${encoded}/`,
    `    production  ${PRODUCTION}/bandi/${encoded}/`,
    `    scadenza    ${row.deadline}`,
  ]

  if (held) {
    const days = daysUntilRelease(row.detectedAt)
    lines.push(
      `    rilevato    ${row.detectedAt}`,
      `    public in   ${days} ${days === 1 ? 'day' : 'days'} (on ${releaseDate(row.detectedAt)})`
    )
  } else {
    lines.push(`    status      public${row.detectedAt ? ` (rilevato ${row.detectedAt})` : ''}`)
  }

  return lines.join('\n')
}

/**
 * The GitHub job-summary rendering, appended to $GITHUB_STEP_SUMMARY by
 * .github/workflows/netlify-deploy.yml after a staging deploy.
 *
 * Link destinations are wrapped in <angle brackets>. CommonMark does balance
 * parentheses inside a bare destination, so "(MI)" would survive on its own,
 * but the bracketed form takes the question off the table for every slug this
 * dataset can produce — and costs one character either side.
 */
const markdown = () => {
  const out = []

  if (!embargoed.length) {
    out.push('### Bandi preview — nothing held back')
    out.push('')
    out.push(
      `Nothing is being held back — all ${published.length} bandi in \`data/data.json\` ` +
        'are already public on the site.'
    )
    return out.join('\n')
  }

  out.push(`### 🔒 ${embargoed.length} bando/i not yet public`)
  out.push('')
  out.push(
    'These pages are **live on staging right now**, but deliberately absent from the ' +
      'home table and the map — that is the seven-day release delay working, not a bug. ' +
      'Open a link to check the page before it goes public.'
  )
  out.push('')
  out.push('| Comune | Licences | Scadenza | Public in | Preview |')
  out.push('| --- | ---: | --- | ---: | --- |')

  for (const row of embargoed) {
    const { encoded } = urls(row.location)
    const days = daysUntilRelease(row.detectedAt)
    out.push(
      `| ${row.location} | ${row.amount} | ${row.deadline} | ` +
        `${days} ${days === 1 ? 'day' : 'days'} (${releaseDate(row.detectedAt)}) | ` +
        `[Open on staging](<${STAGING}/bandi/${encoded}/>) |`
    )
  }

  out.push('')
  out.push(
    `<sub>${published.length} other bandi are public. ` +
      `Cutoff ${cutoff} · delay ${RELEASE_DELAY_DAYS} days · ` +
      'details in <code>data/README.md</code>.</sub>'
  )

  return out.join('\n')
}

if (flag('--markdown')) {
  console.log(markdown())
  process.exit(0)
}

console.log(`${file} — ${rows.length} bandi`)
console.log(`today ${today} · release cutoff ${cutoff} · delay ${RELEASE_DELAY_DAYS} days`)
console.log()

if (flag('--all')) {
  console.log(`Held back (${embargoed.length}):`)
  console.log(embargoed.length ? embargoed.map((r) => describe(r, { held: true })).join('\n\n') : '  none')
  console.log()
  console.log(`Public (${published.length}):`)
  console.log(published.map((r) => describe(r, { held: false })).join('\n\n'))
} else if (embargoed.length) {
  console.log(`Held back by the ${RELEASE_DELAY_DAYS}-day delay (${embargoed.length}):`)
  console.log()
  console.log(embargoed.map((r) => describe(r, { held: true })).join('\n\n'))
  console.log()
  console.log('These pages are already live on staging once the branch deploys.')
  console.log('They are absent from the home table and map by design — see data/README.md.')
  console.log()
  console.log(`${published.length} other bandi are public.`)
} else {
  console.log('Nothing is being held back — every bando in this file is public.')
  console.log()
  console.log(`${published.length} bandi are public. Run with --all to list them.`)
}
