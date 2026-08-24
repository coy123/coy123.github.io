// Sends the subscriber newsletter via MailerLite when data/data.json gains rows.
//
// Driven by .github/workflows/newsletter.yml on a push to master. The "new rows"
// are the diff between the pushed data.json and the one at BEFORE_SHA, so
// data.json stays the single source of truth and only reviewed bandi are mailed.
//
// A bando's identity here is location + deadline: the same comune re-posting with
// a new scadenza is a new bando, while a correction to url/amount/image on an
// already-sent row is not and will not re-send.

import { appendFileSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

// Row markup, slugs, date formatting and the placeholder fill are shared with
// the welcome email the Stripe Worker sends (stripe-worker/src/welcome.ts), so
// the two cannot drift apart.
import { renderEmail, renderTable, itDate, trimStrings } from '../newsletter/render.mjs'
// The sender identity is shared with the welcome email — one place to change
// it, and it must stay an address MailerLite has verified.
import { FROM, FROM_NAME } from '../newsletter/mailerlite.mjs'

const API = 'https://connect.mailerlite.com/api'
const KEY = process.env.MAILERLITE_API_KEY
const GROUP = process.env.MAILERLITE_GROUP_ID
const BEFORE = process.env.BEFORE_SHA
const DRY = process.env.DRY_RUN === 'true'


// Tells the workflow that every row in this commit's data.json is accounted for
// — either mailed just now, or already mailed earlier — so it may advance the
// `newsletter-sent` marker to HEAD (.github/workflows/newsletter.yml).
//
// Exit code cannot carry this: we exit 0 on several paths that send nothing AND
// establish nothing (unknown base, unreadable base). Advancing the marker there
// would move it past rows nobody was ever told about, swallowing that batch
// permanently. So the signal is opt-in, set only where the diff succeeded.
//
// The DRY guard lives here rather than at the call sites because the "nothing
// new" exit happens BEFORE the dry-run check and would otherwise signal from a
// preview. That is the worst case, not a cosmetic one: previewing a stuck batch
// with some trial base_sha would advance the marker past the very rows being
// investigated. A dry run must not be able to move it, whatever the call site.
// Silently a no-op outside Actions, so local runs are unaffected either way.
const markAccountedFor = () => {
  if (DRY || !process.env.GITHUB_OUTPUT) return
  appendFileSync(process.env.GITHUB_OUTPUT, 'up_to_date=true\n')
}

// `trimStrings` (newsletter/render.mjs, mirroring lib/trim.ts) is applied to
// BOTH sides of the diff below, not just the rendered rows: a padded location
// or deadline would make an already-mailed row look brand new and re-send it to
// every subscriber.
const key = (b) => `${b.location}|${b.deadline}`

// A manual dispatch has no github.event.before. A dry run then previews the most
// recent change (HEAD^); a real send refuses rather than guess a base and risk
// re-sending an already-mailed batch — pass base_sha explicitly to replay one.
let base = BEFORE
if (!base) {
  if (!DRY) {
    console.log('No base commit to diff against — pass base_sha to replay a send. Exiting.')
    process.exit(0)
  }
  base = 'HEAD^'
}

// The previous data.json. If it can't be read (first run, unknown base commit,
// force-push) nothing counts as new, so we can never blast the whole backlog.
let previous
try {
  previous = JSON.parse(
    execFileSync('git', ['show', `${base}:data/data.json`], { encoding: 'utf8' })
  ).map(trimStrings)
} catch {
  console.log(`No readable data.json at ${base} — nothing to compare, exiting.`)
  process.exit(0)
}

const seen = new Set(previous.map(key))
const fresh = JSON.parse(readFileSync('data/data.json', 'utf8'))
  .map(trimStrings)
  .filter((b) => !seen.has(key(b)))

// Nothing new, but the diff itself succeeded — the marker may move up to here.
if (!fresh.length) {
  console.log('No new bandi.')
  markAccountedFor()
  process.exit(0)
}

const summary = fresh.length === 1 ? '1 nuovo bando NCC' : `${fresh.length} nuovi bandi NCC`

// Resolved against this file, not the working directory: the workflow runs
// `node scripts/send-newsletter.mjs` from the repo root today, and a future
// `cd` should not silently break the send.
const template = (name) =>
  readFileSync(new URL(`../newsletter/${name}`, import.meta.url), 'utf8')

// The campaign has its own shell: the header note, the footer prose and the
// {$unsubscribe} link are fixed for this sender and live in the template. Only
// the summary, the date and the table vary from send to send. The welcome email
// is welcome_template.html and shares nothing but the table.
const html = renderEmail(template('email_template.html'), {
  summary,
  date: itDate(new Date()),
  table: renderTable(template('email_table.html'), fresh),
})

if (DRY) {
  console.log(`[dry run] ${summary}:`)
  for (const b of fresh) console.log(`  - ${b.location} — scadenza ${b.deadline}`)
  console.log(html)
  process.exit(0)
}

const call = async (path, { method = 'POST', body } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body && JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`)
  return res.json()
}

// Resolved by shortcode rather than hardcoded, so the unsubscribe/preference
// pages are Italian even if MailerLite renumbers its language ids.
const languages = await call('/campaigns/languages', { method: 'GET' })
const italian = (languages.data ?? languages).find((l) => l.shortcode === 'it')
if (!italian) throw new Error('Italian not found in MailerLite campaign languages')

const { data: campaign } = await call('/campaigns', {
  body: {
    name: `BandiNCC — ${summary} — ${new Date().toISOString().slice(0, 10)}`,
    type: 'regular',
    language_id: Number(italian.id),
    groups: [GROUP],
    emails: [
      {
        subject: `${summary} su BandiNCC`,
        from_name: FROM_NAME,
        from: FROM,
        content: html,
      },
    ],
  },
})

await call(`/campaigns/${campaign.id}/schedule`, { body: { delivery: 'instant' } })
console.log(`Sent campaign ${campaign.id} — ${summary}.`)
markAccountedFor()
