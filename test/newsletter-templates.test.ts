import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  composeWelcome,
  itDate,
  renderEmail,
  renderTable,
} from '../newsletter/render.mjs'

import { RELEASE_DELAY_DAYS } from '../lib/embargo.ts'

/**
 * Both email shells, rendered end to end against a fixture.
 *
 * `newsletter/render.mjs` → `fill()` already refuses to return a half-filled
 * document: it throws on any `{{SLOT}}` nobody filled, precisely so a renamed
 * placeholder cannot arrive in a subscriber's inbox reading "{{NOTE}}". That
 * guard is right, but it fires when an email is being *built* — which is to say
 * in production, on the one path that matters. Nothing typechecks or exercises
 * `newsletter/`, `scripts/` or `stripe-worker/` otherwise: `tsconfig.json`
 * excludes all three and no workflow ran the Worker's own `typecheck` when this
 * file was written.
 *
 * The two shells fail very differently, which is why both are covered here:
 *
 * - `email_template.html` is the daily campaign. A throw there exits the send
 *   step non-zero, the `newsletter-sent` marker correctly stays put, and the
 *   batch goes out on the next run. Loud and self-healing.
 * - `welcome_template.html` is rendered by the Worker, whose `sendWelcomeEmail`
 *   swallows every error by design — a throw would 500 the webhook and make
 *   Stripe retry, re-granting and re-sending. So the same break means a paying
 *   subscriber silently receives nothing, `welcome_sent_at` is never set to
 *   trigger a retry, and the only trace is one line in a Worker log. It also
 *   carries six slots to the campaign's three.
 *
 * Fixtures, not `data/data.json`, on purpose. Driving this from live data would
 * make it another test that passes by doing nothing on the weeks the dataset
 * happens to be empty — the failure mode `test/embargo.test.ts` was written to
 * escape. Two rows and one deliberately-empty case run on every commit whatever
 * the file holds that day.
 */

const template = (name: string) =>
  readFileSync(new URL(`../newsletter/${name}`, import.meta.url), 'utf8')

const shell = {
  campaign: template('email_template.html'),
  welcome: template('welcome_template.html'),
  table: template('email_table.html'),
}

/** Two rows, shaped exactly as `data/data.json` holds them after `trimStrings`. */
const FIXTURE = [
  {
    location: 'Comune di Milano (MI)',
    deadline: '2099-06-30',
    url: 'https://example.invalid/bando-milano',
    amount: 12,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/x/xx/Milano-Stemma.png',
    detectedat: '2099-06-01',
  },
  // Diacritics and an apostrophe: the slug and the row markup both have to
  // survive them, and `bidUrl` is what the email links to.
  {
    location: "Comune di Forlì (FC)",
    deadline: '2099-07-15',
    url: 'https://example.invalid/bando-forli',
    amount: 3,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/y/yy/Forli-Stemma.png',
    detectedat: '2099-06-02',
  },
]

/** What `fill()` would have let through: an unfilled slot in the output. */
const UNFILLED = /{{[A-Z_]+}}/g

const assertNoUnfilledSlots = (html: string, what: string) => {
  const leftover = html.match(UNFILLED)
  assert.equal(
    leftover,
    null,
    `${what} still carries unfilled placeholder(s): ${[...new Set(leftover ?? [])].join(', ')}`
  )
}

describe('Newsletter email templates', () => {
  describe('the daily campaign shell', () => {
    it('renders with every slot filled', () => {
      const html = renderEmail(shell.campaign, {
        summary: '2 nuovi bandi NCC',
        date: itDate(new Date()),
        table: renderTable(shell.table, FIXTURE),
      })

      assertNoUnfilledSlots(html, 'email_template.html')
      assert.ok(html.includes('Comune di Milano (MI)'), 'the table is actually in the shell')
      assert.ok(html.includes('2 nuovi bandi NCC'), 'the summary reached the document')
    })

    it('keeps MailerLite’s own unsubscribe token untouched', () => {
      // `{$unsubscribe}` uses a different shape from `{{SLOT}}` so that `fill()`
      // passes it through — MailerLite substitutes it as it sends. If a future
      // edit brings it into the `{{...}}` family, `fill()` would throw on it and
      // every campaign would stop.
      const html = renderEmail(shell.campaign, {
        summary: '1 nuovo bando NCC',
        date: itDate(new Date()),
        table: renderTable(shell.table, FIXTURE.slice(0, 1)),
      })

      assert.ok(html.includes('{$unsubscribe}'), 'the unsubscribe token survived rendering')
    })
  })

  describe('the welcome shell', () => {
    // Exactly how stripe-worker/src/welcome.ts and scripts/preview-welcome.mjs
    // call it, so a signature change here fails the same way it would there.
    const compose = (bandi: typeof FIXTURE) =>
      composeWelcome(bandi, {
        portalUrl: 'https://billing.stripe.com/p/login/test_example',
        tableTemplate: shell.table,
        releaseDays: RELEASE_DELAY_DAYS,
      })

    it('renders with every slot filled', () => {
      const html = renderEmail(shell.welcome, compose(FIXTURE))

      assertNoUnfilledSlots(html, 'welcome_template.html')
      assert.ok(html.includes('Comune di Milano (MI)'), 'the table is actually in the shell')
    })

    it('renders the no-bandi variant with every slot filled', () => {
      // Rare but not never: seven days is a long window, and a subscriber who
      // arrives in a quiet one is the first person to see this branch. A
      // headline promising bandi over an absent table reads as a broken send.
      const composed = compose([])
      const html = renderEmail(shell.welcome, composed)

      assertNoUnfilledSlots(html, 'welcome_template.html (empty variant)')
      assert.equal(composed.table, '', 'the table is dropped entirely, not left as a header row')
    })

    it('gives the sender a subject and a plain-text body in both variants', () => {
      // `renderEmail` ignores these two, so nothing above would notice them
      // going missing — but mailerlite.mjs sends them.
      for (const [label, bandi] of [['with bandi', FIXTURE], ['empty', []]] as const) {
        const composed = compose(bandi as typeof FIXTURE)
        assert.ok(composed.subject?.length, `${label}: subject is present`)
        assert.ok(composed.text?.length, `${label}: plain-text body is present`)
      }
    })

    it('carries the portal link when one is configured, and omits it when not', () => {
      // The live and test Workers point at different portals, and a build that
      // has neither must still send — an empty portalUrl drops the link rather
      // than rendering a dead one.
      const withPortal = renderEmail(shell.welcome, compose(FIXTURE))
      assert.ok(withPortal.includes('billing.stripe.com'), 'portal link rendered')

      const withoutPortal = renderEmail(
        shell.welcome,
        composeWelcome(FIXTURE, { tableTemplate: shell.table, releaseDays: RELEASE_DELAY_DAYS })
      )
      assertNoUnfilledSlots(withoutPortal, 'welcome_template.html (no portal)')
      assert.ok(
        !withoutPortal.includes('billing.stripe.com'),
        'no portal link when none is configured'
      )
    })
  })

  describe('the shared table', () => {
    it('links every row at the trailing-slash detail URL', () => {
      // `trailingSlash: true` makes the slashless form a 301, and these links go
      // out in an email where a redirect is a deliverability signal, not just a
      // wasted hop.
      const html = renderTable(shell.table, FIXTURE)

      assert.ok(html.includes('/bandi/Comune-di-Milano-(MI)/'), 'plain slug')
      // The slug folds `ì` to `i`; the email must link what the export built.
      assert.ok(html.includes('/bandi/Comune-di-Forli-(FC)/'), 'diacritics folded in the slug')
    })

    it('renders one row per bando', () => {
      const html = renderTable(shell.table, FIXTURE)
      assert.equal(
        (html.match(/https:\/\/www\.bandincc\.it\/bandi\//g) ?? []).length,
        FIXTURE.length
      )
    })
  })
})
