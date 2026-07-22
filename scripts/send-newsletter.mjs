// Sends the subscriber newsletter via MailerLite when data/data.json gains rows.
//
// Driven by .github/workflows/newsletter.yml on a push to master. The "new rows"
// are the diff between the pushed data.json and the one at BEFORE_SHA, so
// data.json stays the single source of truth and only reviewed bandi are mailed.
//
// A bando's identity here is location + deadline: the same comune re-posting with
// a new scadenza is a new bando, while a correction to url/amount/image on an
// already-sent row is not and will not re-send.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const API = 'https://connect.mailerlite.com/api'
const KEY = process.env.MAILERLITE_API_KEY
const GROUP = process.env.MAILERLITE_GROUP_ID
const BEFORE = process.env.BEFORE_SHA
const DRY = process.env.DRY_RUN === 'true'

const FROM = 'info@bandincc.it'
const FROM_NAME = 'BandiNCC'

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
  )
} catch {
  console.log(`No readable data.json at ${base} — nothing to compare, exiting.`)
  process.exit(0)
}

const seen = new Set(previous.map(key))
const fresh = JSON.parse(readFileSync('data/data.json', 'utf8')).filter((b) => !seen.has(key(b)))

if (!fresh.length) {
  console.log('No new bandi.')
  process.exit(0)
}

const slug = (location) => location.replace(/\s+/g, '-')
const itDate = (d) =>
  new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

const rows = fresh
  .map((b) => {
    // Site row colours flattened to opaque hex — email clients are unreliable with rgba.
    const background = new Date(b.deadline) >= new Date() ? '#294843' : '#2F3949'
    const url = `https://www.bandincc.it/bandi/${slug(b.location)}/`
    return `<tr style="background:${background};border-bottom:1px solid #4B5563;">
<td style="padding:10px 12px;text-align:center;"><img src="${b.image}" width="28" height="28" style="border-radius:50%;" alt=""></td>
<td style="padding:10px 12px;font:400 14px Arial,Helvetica,sans-serif;"><a href="${url}" style="color:#60A5FA;text-decoration:none;">${b.location}</a></td>
<td style="padding:10px 12px;text-align:right;font:600 14px Arial,Helvetica,sans-serif;color:#4ADE80;">${b.amount}</td>
<td style="padding:10px 12px;text-align:center;font:400 12px Arial,Helvetica,sans-serif;color:#D1D5DB;">${itDate(b.deadline)}</td>
<td style="padding:10px 12px;text-align:center;"><a href="${url}" style="background:#2563EB;color:#FFFFFF;padding:6px 12px;border-radius:4px;font:600 12px Arial,Helvetica,sans-serif;text-decoration:none;">Apri</a></td>
</tr>`
  })
  .join('\n')

const summary = fresh.length === 1 ? '1 nuovo bando NCC' : `${fresh.length} nuovi bandi NCC`

// {{DEVINFO}} is the crawler's dev-only run panel — always empty in the newsletter.
const html = readFileSync('newsletter/email_template.html', 'utf8')
  .replace('{{ROWS}}', rows)
  .replace('{{SUMMARY}}', summary)
  .replace('{{DATE}}', itDate(new Date()))
  .replace('{{DEVINFO}}', '')

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
