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
// the Cypress suite and the email. The one piece of it this file does carry is
// `hasExpired`, mirrored rather than imported because the daily campaign runs
// under bare `node`; see the comment on it.

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
 * Mirrors `RELEASE_DELAY_DAYS` in lib/embargo.ts — the number of days a newly
 * detected bando stays subscriber-only.
 *
 * A mirror for the same reason `hasExpired`, `trimStrings` and `slug` are
 * mirrors: `scripts/send-newsletter.mjs` runs under bare `node` in Actions and
 * does not import TypeScript. Unlike those three, this one cannot drift
 * silently — `test/newsletter-templates.test.ts` imports the real constant and
 * asserts the two are equal, so a change to `lib/embargo.ts` alone fails the
 * unit suite, which gates both deploys and therefore the newsletter that chains
 * off one.
 *
 * Every number of days an email states comes from here or from the real
 * constant: the Worker passes `RELEASE_DELAY_DAYS` into `composeWelcome`, and
 * `send-newsletter.mjs` fills the campaign shell's {{RELEASE_DAYS}} with this.
 */
export const RELEASE_DELAY_DAYS = 7

/**
 * Mirrors `hasExpired` in lib/embargo.ts, and must keep mirroring it — the
 * same relationship `trimStrings` and `slug` have with their `lib/` originals,
 * and for the same reason: `scripts/send-newsletter.mjs` is run by bare `node`
 * in Actions, which cannot import TypeScript. The Worker, whose bundler can,
 * imports the real one instead of this copy.
 *
 * Days are Italian calendar days, and strictly before today: a bando expiring
 * today has not expired. `en-CA` is the ISO-ordered locale, so two of these
 * compare as plain strings and still compare as dates.
 *
 * An unreadable deadline is not expired — the campaign would rather mail a
 * questionable row than silently drop one.
 */
export const hasExpired = (deadline, at = Date.now()) => {
  const day = new Date(deadline).getTime()
  if (Number.isNaN(day)) return false
  const rome = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' })
  return rome(day) < rome(at)
}

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
 *
 * Open or closed is `hasExpired` — the same Italian-calendar-day comparison
 * the site and the embargo use, so a bando whose scadenza is *today* is
 * mailed and painted as open on the same day. Comparing instants would call it
 * closed from 01:00 Rome onwards, which is how the campaign used to send a row
 * that looked already dead.
 */
export const bandoRows = (bids, at = Date.now()) =>
  [...bids]
    .sort(byDeadlineDesc)
    .map((b) => {
      const background = hasExpired(b.deadline, at) ? '#2F3949' : '#294843'
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
export const renderTable = (tableTemplate, bids, at = Date.now()) =>
  bids.length ? fill(tableTemplate, { ROWS: bandoRows(bids, at) }) : ''

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
  outro: 'OUTRO',
  releaseDays: 'RELEASE_DAYS',
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

/** An `<tr>` carrying a heading and a run of paragraphs. */
const copyBlock = (heading, paragraphs, { padding, rule = false }) =>
  `<tr><td style="padding:${padding};${rule ? 'border-top:1px solid #374151;' : ''}">
<div style="font:700 18px Arial,Helvetica,sans-serif;color:#E5E7EB;padding-bottom:10px;">${heading}</div>
${paragraphs
  .map(
    (p) =>
      `<div style="font:400 14px Arial,Helvetica,sans-serif;color:#D1D5DB;line-height:21px;padding-bottom:10px;">${p}</div>`
  )
  .join('\n')}
</td></tr>`

/** A block of copy above the table. Empty string if unused. */
export const introBlock = (heading, paragraphs) =>
  copyBlock(heading, paragraphs, { padding: '20px 24px 4px 24px' })

/**
 * A block of copy below the table, ruled off from it.
 *
 * The split is not decoration: what a reader needs *before* the table is why
 * these bandi are in front of them, and what they need after it is how the
 * thing they just bought behaves from here on. Stacking both above the table
 * would push the bandi — the reason the email exists — under a screenful of
 * explanation.
 */
export const outroBlock = (heading, paragraphs) =>
  copyBlock(heading, paragraphs, { padding: '18px 24px 6px 24px', rule: true })

/* ------------------------------------------------------------------------- */
/* The welcome email                                                          */
/* ------------------------------------------------------------------------- */

const plural = (n, one, many) => (n === 1 ? one : many)

const link = (href, text) =>
  `<a href="${href}" style="color:#4b5563;text-decoration:underline;font:400 10px Arial,Helvetica,sans-serif;">${text}</a>`

/**
 * The block that closes every welcome email, in both variants.
 *
 * It exists because the support inbox kept getting the same three questions
 * from people who had just paid: when does the next email come, why is the
 * site showing less than the email, and where did the email go. All three are
 * answerable in four sentences, so the email answers them itself rather than
 * waiting to be asked.
 *
 * The spam paragraph is the load-bearing one: MailerLite sends from
 * info@bandincc.it, a subscriber who never whitelists it can miss every
 * subsequent campaign, and a missed campaign is the whole product not being
 * delivered. It is worded for someone reading this message in their junk
 * folder, because that is exactly who needs it.
 */
const HOW_IT_WORKS_HEADING = 'Come funziona da qui in avanti'

const howItWorks = (releaseDays) => [
  `Ogni volta che rileviamo e verifichiamo un nuovo bando NCC ti arriva una email con l\u2019elenco: comune, numero di licenze, scadenza e link al bando ufficiale. Sul sito pubblico gli stessi bandi compaiono ${releaseDays} giorni dopo \u2014 quella settimana di vantaggio \u00e8 l\u2019abbonamento.`,
  'Non c\u2019\u00e8 un giorno fisso di invio: ti scriviamo quando i comuni pubblicano, non a calendario. Se per qualche giorno non ricevi nulla non \u00e8 un problema tecnico, vuol dire che non ci sono bandi nuovi.',
  'Aggiungi info@bandincc.it ai tuoi contatti: \u00e8 l\u2019indirizzo da cui partono tutti i nostri invii, ed \u00e8 quello che evita che finiscano nello spam. Se hai trovato questa email nella posta indesiderata, segnala \u00abNon \u00e8 spam\u00bb: le prossime arriveranno in posta in arrivo.',
  'Per qualsiasi dubbio rispondi a questa email o scrivi a info@bandincc.it. Ti risponde una persona.',
]

/** The same four paragraphs, with the address emphasised for the HTML shell. */
const howItWorksHtml = (releaseDays) =>
  howItWorks(releaseDays).map((p) =>
    p.replaceAll('info@bandincc.it', '<strong style="color:#E5E7EB;">info@bandincc.it</strong>')
  )

const howItWorksText = (releaseDays) =>
  `${HOW_IT_WORKS_HEADING.toUpperCase()}\n\n${howItWorks(releaseDays).join('\n\n')}\n`

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
export const composeWelcome = (
  bandi,
  { portalUrl = '', tableTemplate, releaseDays = RELEASE_DELAY_DAYS }
) => {
  const n = bandi.length
  const one = n === 1

  const manage = portalUrl ? `${link(portalUrl, "Gestisci l'abbonamento")} · ` : ''

  const common = {
    date: itDate(new Date()),
    outro: outroBlock(HOW_IT_WORKS_HEADING, howItWorksHtml(releaseDays)),
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
        `In questo momento non c\u2019\u00e8 nessun bando riservato da mostrarti: non ne abbiamo rilevati negli ultimi ${releaseDays} giorni, quindi tutto quello che abbiamo \u00e8 gi\u00e0 pubblico e lo trovi sul sito.`,
        '\u00c8 normale e non \u00e8 un problema tecnico: i comuni non pubblicano ogni settimana. Da adesso per\u00f2 non devi pi\u00f9 controllare tu \u2014 appena rileviamo un bando nuovo te lo mandiamo.',
      ]),
      table: '',
      text:
        'Grazie per l\u2019abbonamento a BandiNCC.\n\n' +
        `In questo momento non c\u2019\u00e8 nessun bando riservato da mostrarti: non ne abbiamo rilevati negli ultimi ${releaseDays} giorni, quindi tutto quello che abbiamo \u00e8 gi\u00e0 pubblico sul sito. ` +
        '\u00c8 normale: i comuni non pubblicano ogni settimana.\n\n' +
        howItWorksText(releaseDays),
    }
  }

  const count = `${n} ${plural(n, 'bando', 'bandi')}`

  return {
    ...common,
    subject: one
      ? 'Grazie! Ecco il bando NCC non ancora pubblico sul sito'
      : `Grazie! Ecco i ${n} bandi NCC non ancora pubblici sul sito`,
    summary: `Benvenuto tra gli abbonati \u2014 ${count} in anteprima`,
    note: `In anteprima per te: ${one ? 'questo bando non \u00e8 ancora visibile' : 'questi bandi non sono ancora visibili'} sul sito pubblico.`,
    intro: introBlock(
      one
        ? 'Il bando che sul sito non \u00e8 ancora visibile'
        : `I ${n} bandi che sul sito non sono ancora visibili`,
      [
        `Grazie per l\u2019abbonamento. Qui sotto trovi ${
          one
            ? 'l\u2019unico bando che in questo momento \u00e8 riservato agli abbonati'
            : `tutti i ${n} bandi che in questo momento sono riservati agli abbonati`
        }: ${one ? 'l\u2019abbiamo rilevato' : 'li abbiamo rilevati'} negli ultimi ${releaseDays} giorni e sul sito pubblico ${
          one ? 'comparir\u00e0' : 'compariranno'
        } solo nei prossimi. Tutto il resto \u00e8 gi\u00e0 pubblico e lo trovi sul sito.`,
        `Per ogni bando trovi il comune, il numero di licenze, la scadenza e il link alla pagina ufficiale: il pulsante <strong style="color:#E5E7EB;">Visualizza</strong> apre la scheda su bandincc.it.`,
      ]
    ),
    table: renderTable(tableTemplate, bandi),
    text:
      'Grazie per l\u2019abbonamento a BandiNCC.\n\n' +
      `Qui sotto ${one ? 'trovi l\u2019unico bando' : `trovi tutti i ${n} bandi`} che in questo momento ${
        one ? '\u00e8 riservato' : 'sono riservati'
      } agli abbonati: ${one ? 'rilevato' : 'rilevati'} negli ultimi ${releaseDays} giorni e non ancora ${
        one ? 'visibile' : 'visibili'
      } sul sito pubblico.\n\n` +
      bandoLines(bandi) +
      '\n\n' +
      howItWorksText(releaseDays),
  }
}
