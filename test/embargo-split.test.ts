import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { RELEASE_DELAY_DAYS, splitByRelease } from '../lib/embargo.ts'

/**
 * The paywall's split, against a fixture instead of the live dataset.
 *
 * `cypress/e2e/embargo.cy.ts` is the only thing that checks the real exported
 * HTML for a leak, and it is the right place for that — but eleven of its
 * thirteen tests open with `if (!embargoedBids.length) this.skip()`, because
 * they derive their expectations from whatever `data/data.json` holds when the
 * suite runs. Most weeks nothing is inside the seven-day window, so those
 * eleven quietly do nothing and the run still reports green. "The paywall was
 * checked and it works" and "there was nothing to check" print the same tick.
 *
 * That is not hypothetical: a DST bug in `releaseCutoff()` released an
 * embargoed bando to the public site a day early and shipped green through the
 * whole file. A person found it, not the suite.
 *
 * So this file feeds `splitByRelease` rows it constructs, and therefore runs
 * identically on every commit whatever the dataset contains that day. It tests
 * the exact function `lib/data.ts` uses to build `publishedBids` and
 * `embargoedBids` — not a copy — so the two cannot drift.
 *
 * `test/embargo.test.ts` pins the rule (`isPublished`, `releaseCutoff`,
 * `hasExpired`) against fixed instants. This pins the partition built on top of
 * it: that a withheld row never appears on the published side.
 */

/** A fixed frame of reference, so nothing here depends on the day it runs. */
const TODAY = '2026-09-15'
const CUTOFF = '2026-09-08' // TODAY minus RELEASE_DELAY_DAYS

const bid = (over: Partial<{ location: string; detectedAt: string; deadline: string }> = {}) => ({
  location: 'Comune di Prova (XX)',
  detectedAt: '2026-09-14',
  deadline: '2099-12-31',
  ...over,
})

const split = (rows: ReturnType<typeof bid>[]) => splitByRelease(rows, CUTOFF, TODAY)

describe('The release-delay split', () => {
  it('agrees with RELEASE_DELAY_DAYS about where the cutoff sits', () => {
    // If the constant is ever changed, the fixture dates above stop meaning
    // what their names say and every assertion below quietly tests the wrong
    // boundary. Fail loudly here instead.
    const days = (Date.parse(`${TODAY}T00:00:00Z`) - Date.parse(`${CUTOFF}T00:00:00Z`)) / 86_400_000
    assert.equal(days, RELEASE_DELAY_DAYS, 'the fixture cutoff must be TODAY - RELEASE_DELAY_DAYS')
  })

  describe('what it holds back', () => {
    it('withholds a bando detected today', () => {
      const { published, embargoed } = split([bid({ detectedAt: TODAY })])
      assert.equal(published.length, 0)
      assert.equal(embargoed.length, 1)
    })

    it('withholds a bando detected one day inside the window', () => {
      // The boundary in the direction that fails OPEN — the DST bug's direction.
      const { published, embargoed } = split([bid({ detectedAt: '2026-09-09' })])
      assert.equal(published.length, 0, 'a row one day inside the window must stay hidden')
      assert.equal(embargoed.length, 1)
    })

    it('releases a bando detected exactly on the cutoff', () => {
      const { published, embargoed } = split([bid({ detectedAt: CUTOFF })])
      assert.equal(published.length, 1, 'the cutoff day itself is published')
      assert.equal(embargoed.length, 0)
    })

    it('releases a bando detected before the cutoff', () => {
      const { published } = split([bid({ detectedAt: '2026-01-01' })])
      assert.equal(published.length, 1)
    })
  })

  describe('the expiry exemption', () => {
    it('publishes a freshly detected bando whose scadenza has already passed', () => {
      // The archive is backfilled with bandi that closed months ago. Holding
      // one back would be absurd twice over: it is public record, and there is
      // no head start left to sell.
      const { published, embargoed } = split([
        bid({ detectedAt: TODAY, deadline: '2020-01-01' }),
      ])
      assert.equal(published.length, 1)
      assert.equal(embargoed.length, 0)
    })

    it('still withholds one whose scadenza is today', () => {
      // A bando expiring today is open all day — it goes grey at midnight in
      // Rome, not before — so it is still worth a subscriber's head start.
      const { published, embargoed } = split([bid({ detectedAt: TODAY, deadline: TODAY })])
      assert.equal(published.length, 0)
      assert.equal(embargoed.length, 1)
    })
  })

  describe('the fail-open direction', () => {
    it('publishes a row with no detection date at all', () => {
      // Deliberate: a build must never silently empty the table. It fails OPEN
      // for a paywall, which is why test/data-integrity.test.ts rejects any real
      // row missing `detectedat`. Pinned here so the fallback cannot be
      // "tidied" into withholding, which would hide the whole archive.
      const { published } = split([bid({ detectedAt: undefined })])
      assert.equal(published.length, 1)
    })
  })

  describe('the partition itself', () => {
    const rows = [
      bid({ location: 'A', detectedAt: TODAY }),
      bid({ location: 'B', detectedAt: '2026-09-09' }),
      bid({ location: 'C', detectedAt: CUTOFF }),
      bid({ location: 'D', detectedAt: '2026-01-01' }),
      bid({ location: 'E', detectedAt: TODAY, deadline: '2020-01-01' }),
      bid({ location: 'F', detectedAt: undefined }),
    ]

    it('puts every row on exactly one side', () => {
      const { published, embargoed } = split(rows)
      assert.equal(published.length + embargoed.length, rows.length, 'no row lost or duplicated')

      const names = (set: typeof rows) => set.map((r) => r.location).sort()
      assert.deepEqual(names(published), ['C', 'D', 'E', 'F'])
      assert.deepEqual(names(embargoed), ['A', 'B'])
    })

    it('never leaks a withheld row onto the published side', () => {
      // The assertion the whole paywall reduces to.
      const { published, embargoed } = split(rows)
      for (const held of embargoed) {
        assert.ok(
          !published.includes(held),
          `${held.location} is embargoed but also present in publishedBids`
        )
      }
    })

    it('handles an empty dataset without inventing rows', () => {
      const { published, embargoed } = split([])
      assert.deepEqual(published, [])
      assert.deepEqual(embargoed, [])
    })
  })
})
