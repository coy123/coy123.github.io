// Shared rendering for every email BandiNCC sends.
//
// Two senders, one set of markup:
//
//   scripts/send-newsletter.mjs   the daily campaign, via MailerLite, run from
//                                 .github/workflows/newsletter.yml
//   stripe-worker/src/welcome.ts  the welcome email, sent by the Worker the
//                                 moment a checkout completes
//
// Both put the same table of bandi in front of a subscriber, so the row markup,
// the slug and the date format live here rather than in two places that drift.
// It is plain ESM (`.mjs`) on purpose: `send-newsletter.mjs` is run by bare
// `node` in Actions and cannot import TypeScript, while the Worker's bundler
// takes `.mjs` without complaint.
//
// What is NOT here: the seven-day rule itself. That is `lib/embargo.ts`, which
// the Worker imports directly — one definition of "hidden" shared by the site,
// the Cypress suite and the email.

/**
 * Mirrors lib/trim.ts. data.json values regularly carry a copy-pasted leading
 * or trailing space, and here it costs twice over: in the campaign a padded
 * location or deadline makes an already-mailed row look brand new, and in both
 * emails the space is rendered into the body and into the bando URL.
 */
export const trimStrings = (entry) =>
  Object.fromEntries(
    Object.entries(entry).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
  )

/**
 * Mirrors lib/slug.ts, and must keep mirroring it: the static export serves
 * "Comune di Forlì (FC)" at /bandi/Comune-di-Forli-(FC)/, so a link built any
 * other way 404s.
 *
 * This used to be a shortened copy that only folded diacritics, which meant
 * every comune with a typographic apostrophe or a comma — "Colle di Val
 * d’Elsa", "Calto (RO, Veneto)" — was mailed a link to a page that does not
 * exist. Keep the two in step.
 */
export const slug = (location) =>
  location
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/,/g, ' ')
    .trim()
    .replace(/\s+/g, '-')

export const itDate = (d) =>
  new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

export const bidUrl = (location) => `https://www.bandincc.it/bandi/${slug(location)}/`

/** Same order as the home page table (components/Table.tsx): latest scadenza first. */
const byDeadlineDesc = (a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime()

/**
 * The `<tr>`s for a set of bandi. Row colours match the site's, flattened to
 * opaque hex because email clients are unreliable with rgba.
 */
export const bandoRows = (bids, now = new Date()) =>
  [...bids]
    .sort(byDeadlineDesc)
    .map((b) => {
      const background = new Date(b.deadline) >= now ? '#294843' : '#2F3949'
      return `<tr style="background:${background};border-bottom:1px solid #4B5563;">
<td style="padding:10px 12px;text-align:center;"><img src="${b.image}" width="28" height="28" style="border-radius:50%;" alt=""></td>
<td style="padding:10px 12px;font:400 14px Arial,Helvetica,sans-serif;color:#E5E7EB;">${b.location}</td>
<td style="padding:10px 12px;text-align:right;font:600 14px Arial,Helvetica,sans-serif;color:#4ADE80;">${b.amount}</td>
<td style="padding:10px 12px;text-align:center;font:400 12px Arial,Helvetica,sans-serif;color:#D1D5DB;">${itDate(b.deadline)}</td>
<td style="padding:10px 12px;text-align:center;"><a href="${bidUrl(b.location)}" style="display:inline-block;background:#2563EB;color:#FFFFFF;padding:6px 12px;border-radius:4px;font:500 14px Arial,Helvetica,sans-serif;text-decoration:none;"><span class="emo" style="display:none;">🔍</span><span class="lbl">Visualizza</span></a></td>
</tr>`
    })
    .join('\n')

/** The plain-text alternative, for senders that take one and for the preview script. */
export const bandoLines = (bids) =>
  [...bids]
    .sort(byDeadlineDesc)
    .map(
      (b) =>
        `- ${b.location} — ${b.amount} licenz${b.amount === 1 ? 'a' : 'e'}, scadenza ${itDate(
          b.deadline
        )}\n  ${bidUrl(b.location)}`
    )
    .join('\n')

/**
 * Fills `{{PLACEHOLDER}}` slots and refuses to return a half-filled document.
 *
 * `replaceAll`, not `replace`: a placeholder must never be filled at only its
 * first occurrence. And the leftover check is not paranoia — these strings go
 * straight out to paying subscribers, so a renamed slot has to fail here rather
 * than arrive in an inbox reading "{{NOTE}}".
 *
 * `{$unsubscribe}` is MailerLite's own token and uses a different shape, so it
 * passes through untouched.
 */
export const fill = (template, values) => {
  let out = template
  for (const [key, value] of Object.entries(values)) out = out.replaceAll(`{{${key}}}`, value)

  const leftover = out.match(/{{[A-Z_]+}}/g)
  if (leftover) {
    throw new Error(`Unfilled template placeholder(s): ${[...new Set(leftover)].join(', ')}`)
  }
  return out
}

/**
 * The bandi table, or an empty string when there is nothing to show.
 *
 * The empty case is the whole reason the table lives in its own file: a table
 * with headers and no rows is worse than no table, and no amount of
 * placeholder-filling can remove markup that is baked into the shell.
 */
export const renderTable = (tableTemplate, bids, now = new Date()) =>
  bids.length ? fill(tableTemplate, { ROWS: bandoRows(bids, now) }) : ''

/**
 * Every slot a shell may declare, as `option name -> {{PLACEHOLDER}}`.
 *
 * The two shells declare different subsets — the campaign hardcodes its note
 * and its {$unsubscribe} footer, the welcome email hardcodes its footer note
 * and varies the portal link — so this is a superset, not a contract. Which
 * slots a template actually has is the template's business.
 */
const SLOTS = {
  summary: 'SUMMARY',
  date: 'DATE',
  note: 'NOTE',
  intro: 'INTRO',
  table: 'TABLE',
  footerLinks: 'FOOTER_LINKS',
}

/**
 * The finished HTML for a shell.
 *
 * Values for slots the shell does not declare are simply unused, so a composer
 * may hand over more than a given template wants — `composeWelcome` also
 * returns `subject` and `text`, which are for the sender, not the page. The
 * reverse is the dangerous direction, and `fill` throws on it: a shell whose
 * placeholder nobody filled must never reach an inbox.
 */
export const renderEmail = (shellTemplate, values) =>
  fill(
    shellTemplate,
    Object.fromEntries(
      Object.entries(values)
        .filter(([key]) => key in SLOTS)
        .map(([key, value]) => [SLOTS[key], value])
    )
  )

/** An `<tr>` carrying a block of copy above the table. Empty string if unused. */
export const introBlock = (heading, paragraphs) => `<tr><td style="padding:20px 24px 4px 24px;">
<div style="font:700 18px Arial,Helvetica,sans-serif;color:#E5E7EB;padding-bottom:10px;">${heading}</div>
${paragraphs
  .map(
    (p) =>
      `<div style="font:400 14px Arial,Helvetica,sans-serif;color:#D1D5DB;line-height:21px;padding-bottom:10px;">${p}</div>`
  )
  .join('\n')}
</td></tr>`

/* ------------------------------------------------------------------------- */
/* The welcome email                                                          */
/* ------------------------------------------------------------------------- */

const plural = (n, one, many) => (n === 1 ? one : many)

const link = (href, text) =>
  `<a href="${href}" style="color:#4b5563;text-decoration:underline;font:400 10px Arial,Helvetica,sans-serif;">${text}</a>`

/**
 * Subject, header and copy for the email a new subscriber gets the moment
 * their checkout completes (stripe-worker/src/welcome.ts).
 *
 * `bandi` is what is CURRENTLY embargoed — the set they paid for and cannot see
 * on the site — not what was detected today. The rule that decides that is
 * lib/embargo.ts; `releaseDays` is its RELEASE_DELAY_DAYS, passed in rather
 * than imported so this file keeps importing nothing (it is run by bare `node`
 * in Actions, where TypeScript is not available).
 *
 * The empty case is written out separately rather than patched with an "if":
 * a headline promising bandi above an absent table reads as a broken send, and
 * this is the first thing a new subscriber ever sees from us. It should be rare
 * — seven days is a long window — but rare is not never.
 *
 * Returns everything `renderEmail` needs, plus `subject` and `text` for the
 * sender to use.
 */
export const composeWelcome = (bandi, { portalUrl = '', tableTemplate, releaseDays = 7 }) => {
  const n = bandi.length

  const manage = portalUrl ? `${link(portalUrl, "Gestisci l'abbonamento")} · ` : ''

  const common = {
    date: itDate(new Date()),
    // The footer prose is baked into welcome_template.html; only these links
    // vary — the live and test Workers point at different portals.
    //
    // {$unsubscribe} is MailerLite's token, substituted as it sends. The welcome
    // email is a MailerLite campaign like the daily one, so the token works here
    // and belongs here: a campaign must carry an unsubscribe link, and MailerLite
    // injects its own if we leave it out. Clicking it reaches the Worker's
    // /mailerlite route, which cancels the Stripe subscription — the portal link
    // beside it is the gentler door to the same room.
    footerLinks: `${manage}${link('{$unsubscribe}', 'Disiscriviti')} · ${link(
      'mailto:info@bandincc.it',
      'info@bandincc.it'
    )}`,
  }

  if (n === 0) {
    return {
      ...common,
      subject: 'Grazie per l\u2019abbonamento a BandiNCC',
      summary: 'Benvenuto tra gli abbonati',
      note: 'Appena rileviamo un nuovo bando, lo ricevi subito per email.',
      intro: introBlock('Grazie per l\u2019abbonamento', [
        `In questo momento non ci sono bandi rilevati negli ultimi ${releaseDays} giorni da mostrarti: sul sito trovi gi\u00e0 tutto quello che abbiamo.`,
        'Da adesso non devi pi\u00f9 aspettare: appena rileviamo un nuovo bando lo ricevi subito per email, ' +
          `${releaseDays} giorni prima che compaia sul sito pubblico.`,
      ]),
      table: '',
      text:
        'Grazie per l\u2019abbonamento a BandiNCC.\n\n' +
        `In questo momento non ci sono bandi rilevati negli ultimi ${releaseDays} giorni da mostrarti. ` +
        'Appena ne rileviamo uno lo ricevi subito per email, prima che compaia sul sito.\n',
    }
  }

  const count = `${n} ${plural(n, 'bando', 'bandi')}`

  return {
    ...common,
    subject: `Grazie! Ecco ${plural(n, 'il bando', `i ${n} bandi`)} NCC degli ultimi ${releaseDays} giorni`,
    summary: `Benvenuto tra gli abbonati \u2014 ${count} in anteprima`,
    note: `In anteprima per te: ${plural(n, 'questo bando non \u00e8 ancora visibile', 'questi bandi non sono ancora visibili')} sul sito pubblico.`,
    intro: introBlock(`Ecco i bandi rilevati negli ultimi ${releaseDays} giorni`, [
      `Grazie per l\u2019abbonamento. Qui sotto trovi ${count} che abbiamo rilevato negli ultimi ${releaseDays} giorni: ` +
        `${plural(n, '\u00e8 riservato', 'sono riservati')} agli abbonati e sul sito pubblico ${plural(n, 'comparir\u00e0', 'compariranno')} solo nei prossimi giorni.`,
      'Da adesso non devi pi\u00f9 aspettare: appena rileviamo un nuovo bando lo ricevi subito per email.',
    ]),
    table: renderTable(tableTemplate, bandi),
    text:
      'Grazie per l\u2019abbonamento a BandiNCC.\n\n' +
      `Ecco ${count} rilevat${plural(n, 'o', 'i')} negli ultimi ${releaseDays} giorni, ` +
      `${plural(n, 'non ancora visibile', 'non ancora visibili')} sul sito pubblico:\n\n` +
      bandoLines(bandi) +
      '\n\nAppena rileviamo un nuovo bando lo ricevi subito per email.\n',
  }
}
