import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  RELEASE_DELAY_DAYS,
  currentDay,
  daysUntilRelease,
  detectionDay,
  hasExpired,
  isPublished,
  releaseCutoff,
} from '../lib/embargo.ts'

/**
 * The release delay against fixed instants, with no dataset and no browser.
 *
 * The rule is checked in three places and none of them can replace the others:
 * `cypress/e2e/embargo.cy.ts` proves that no held-back row reaches the exported
 * HTML, `test/data-integrity.test.ts` states the invariants over the real
 * `data/data.json`, and this file pins the arithmetic itself.
 *
 * The dataset can only say so much. Every assertion in `embargo.cy.ts` that
 * needs a held-back bando is written `if (!embargoedBids.length) this.skip()`,
 * and most weeks nothing is inside the window — the case when this file was
 * written — so the paywall's export-side guard skips itself and a green run
 * means very little. This file feeds the rule dates instead of rows, and so
 * never depends on what happens to be in the file that day.
 *
 * It exists because of a real leak. `releaseCutoff` used to subtract
 * `RELEASE_DELAY_DAYS * DAY_MS` from the instant and read the Rome day off the
 * result, which is not seven calendar days when the interval spans a DST
 * change — the October week is 169 hours long. A build in the 23:00 hour during
 * the week after that change published a six-day-old bando. The dataset had
 * nothing embargoed at the time, so the suite was green throughout.
 *
 * ## Why this is not a Cypress spec
 *
 * It was one, as `cypress/e2e/embargo-rule.cy.ts`, purely because the Cypress
 * suite is what gates the deploys. Nothing here ever needed a browser: no
 * `cy.visit`, no DOM, no page — every test is a synchronous call into
 * `lib/embargo.ts` and an assertion on what came back.
 *
 * Running it in Electron anyway cost about four seconds a deploy and, worse,
 * made it *flaky*. Cypress runs its global `beforeEach` from
 * `cypress/support/e2e.ts` — four `cy.intercept` calls — ahead of every one of
 * these tests, so each was carrying the only piece of machinery in it that
 * could hang, in service of stubbing network requests that a test with no page
 * can never make. On 2026-09-02 that produced a red staging deploy on "does not
 * call an unreadable deadline expired", three deterministic assertions on
 * `hasExpired(undefined)` and `hasExpired('not a date')`, at the identical
 * commit master had just gone green on (3cbf550).
 *
 * Under `node --test` there is no browser, no hook and no proxy — just the
 * function under test. `.github/workflows/e2e.yml` runs `npm run test:unit`
 * before it builds, so the rule is still gated ahead of both deploys, earlier
 * than before, and without an Electron download standing between a mistake and
 * the message about it.
 *
 * `cypress/README.md` -> "What does not live here" is the full account, and
 * lists what deliberately stayed in the browser.
 */

const rome = (iso: string) => new Date(iso).getTime()

// Italy moved to CEST on 2026-03-29 and back to CET on 2026-10-25.
const DST_SPRING = '2026-03-29'
const DST_AUTUMN = '2026-10-25'

const DAY_MS = 24 * 60 * 60 * 1000

describe('the release rule', () => {
  describe('releaseCutoff', () => {
    it('is exactly RELEASE_DELAY_DAYS calendar days behind, every half hour of a year', () => {
      const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS)

      const wrong: string[] = []
      for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 30 * 60 * 1000) {
        const expected = dayNumber(currentDay(t)) - RELEASE_DELAY_DAYS
        if (dayNumber(releaseCutoff(t)) !== expected) {
          wrong.push(`${new Date(t).toISOString()} -> ${releaseCutoff(t)}`)
        }
      }
      // Named rather than counted: a regression here is a DST bug, and the
      // instants tell you which transition broke.
      assert.deepEqual(wrong, [], `cutoff drifted at:\n${wrong.slice(0, 5).join('\n')}`)
    })

    it('does not slip a day across either DST transition', () => {
      // 23:30 Rome is the hour the old implementation leaked in: late enough
      // that subtracting 168 absolute hours lands in the previous day.
      assert.equal(releaseCutoff(rome('2026-10-30T22:30:00Z')), '2026-10-23', 'autumn')
      assert.equal(releaseCutoff(rome('2026-04-03T22:30:00Z')), '2026-03-28', 'spring')
    })
  })

  describe('isPublished', () => {
    const open = '2099-12-31'

    it('publishes on day seven and not on day six', () => {
      const at = rome('2026-10-30T22:30:00Z') // 23:30 Rome, the leaking instant
      const cutoff = releaseCutoff(at)
      const today = currentDay(at)

      assert.equal(
        isPublished({ detectedAt: '2026-10-23', deadline: open }, cutoff, today),
        true,
        'day 7'
      )
      assert.equal(
        isPublished({ detectedAt: '2026-10-24', deadline: open }, cutoff, today),
        false,
        'day 6'
      )
    })

    it('holds a row back for the whole window and releases it the day after', () => {
      const at = rome('2026-06-15T10:00:00Z')
      const cutoff = releaseCutoff(at)
      const today = currentDay(at)

      for (let ago = 0; ago < RELEASE_DELAY_DAYS; ago++) {
        const detected = currentDay(at - ago * DAY_MS)
        assert.equal(
          isPublished({ detectedAt: detected, deadline: open }, cutoff, today),
          false,
          `${ago}d old`
        )
      }
      const seven = currentDay(at - RELEASE_DELAY_DAYS * DAY_MS)
      assert.equal(isPublished({ detectedAt: seven, deadline: open }, cutoff, today), true, '7d old')
    })

    it('exempts an expired bando whatever its detection date says', () => {
      const at = rome('2026-06-15T10:00:00Z')
      // Detected today, but its scadenza is behind us: an archive backfill.
      assert.equal(
        isPublished(
          { detectedAt: currentDay(at), deadline: '2026-06-14' },
          releaseCutoff(at),
          currentDay(at)
        ),
        true
      )
    })

    it('fails open on an unusable detectedAt, which test/data-integrity.test.ts is what catches', () => {
      const at = rome('2026-06-15T10:00:00Z')
      assert.equal(isPublished({ deadline: '2099-12-31' }, releaseCutoff(at), currentDay(at)), true)
    })
  })

  describe('daysUntilRelease', () => {
    it('is never below 1 for a row detected today, on any day of the year', () => {
      const wrong: string[] = []
      for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 30 * 60 * 1000) {
        // The promise LockedRows depends on: it must never render "in 0 days".
        if (daysUntilRelease(currentDay(t), t) < 1) wrong.push(new Date(t).toISOString())
      }
      assert.deepEqual(wrong, [], `fell below 1 at:\n${wrong.slice(0, 5).join('\n')}`)
    })

    it('counts down one day at a time', () => {
      const at = rome('2026-06-15T10:00:00Z')
      assert.equal(daysUntilRelease('2026-06-15', at), RELEASE_DELAY_DAYS, 'detected today')
      assert.equal(daysUntilRelease('2026-06-14', at), RELEASE_DELAY_DAYS - 1, 'detected yesterday')
      assert.equal(daysUntilRelease('2026-06-09', at), 1, 'detected six days ago')
    })

    it('is unaffected by the hour the build runs, including across a DST change', () => {
      for (const day of [DST_SPRING, DST_AUTUMN]) {
        const midnight = new Date(`${day}T00:00:00Z`).getTime()
        const answers = new Set<number>()
        for (let h = 0; h < 24; h++) {
          const at = midnight + h * 60 * 60 * 1000
          answers.add(daysUntilRelease(currentDay(at), at))
        }
        assert.deepEqual([...answers], [RELEASE_DELAY_DAYS], `${day} varied by hour`)
      }
    })
  })

  describe('hasExpired', () => {
    const today = '2026-06-15'

    it('treats the scadenza itself as still open, and the day before as closed', () => {
      assert.equal(hasExpired('2026-06-15', today), false, 'expires today')
      assert.equal(hasExpired('2026-06-16', today), false, 'expires tomorrow')
      assert.equal(hasExpired('2026-06-14', today), true, 'expired yesterday')
    })

    it('does not call an unreadable deadline expired', () => {
      // Deliberate: expiry is what publishes a row early and what suppresses a
      // send, so an unparseable value must trigger neither.
      assert.equal(hasExpired(undefined, today), false, 'missing')
      assert.equal(hasExpired('not a date', today), false, 'garbage')
    })

    it('silently rolls a real-looking but impossible day over, which is why lib/data.ts round-trips', () => {
      // `new Date('2026-02-31')` is NOT invalid — it rolls to the 3rd of March.
      // So a February typo reaches `hasExpired` as a perfectly readable date a
      // few days later, and this function has no way to object.
      assert.equal(detectionDay('2026-02-31'), '2026-03-03')
      assert.equal(hasExpired('2026-02-31', today), true, 'read as 2026-03-03, which is past')

      // Nothing above is a defence, and it is not meant to be. The round-trip
      // check in `lib/data.ts` -> assertReadableDeadline is what rejects the
      // row, while `next build` is reading the file, and
      // `test/data-integrity.test.ts` asserts the same four rules over the dataset.
      // This test exists so that a future "simplification" of either one knows
      // what it is removing.
    })
  })

  describe('detectionDay', () => {
    it('reads both stored shapes as the same Italian day', () => {
      // data.json has held both: an ISO instant (midnight Rome, serialised UTC)
      // and, since commit 6ca1ec5, a bare day. Slicing the string would date
      // the first one to 31 July and release it early.
      assert.equal(detectionDay('2026-07-31T22:00:00.000Z'), '2026-08-01')
      assert.equal(detectionDay('2026-08-01'), '2026-08-01')
    })

    it('returns undefined rather than throwing on junk', () => {
      assert.equal(detectionDay(undefined), undefined)
      assert.equal(detectionDay(''), undefined)
      assert.equal(detectionDay('31/07/2026'), undefined)
    })
  })
})
