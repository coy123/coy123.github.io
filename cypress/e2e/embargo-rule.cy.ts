import {
  RELEASE_DELAY_DAYS,
  currentDay,
  daysUntilRelease,
  detectionDay,
  hasExpired,
  isPublished,
  releaseCutoff,
} from '../../lib/embargo'

/**
 * The release delay against fixed instants, with no dataset and no browser.
 *
 * `embargo.cy.ts` is the other half of this and cannot replace it: every one of
 * its meaningful assertions is written `if (!embargoedBids.length) return`,
 * because it checks the real `data/data.json`. Whenever nothing happens to be
 * inside its window — which is the case most weeks, and was the case when this
 * file was written — the paywall's entire guard reduces to three vacuous
 * assertions and a green run means nothing.
 *
 * So this spec feeds the rule dates instead of rows. It runs in the same suite
 * only because the suite is what gates the deploys; nothing here needs Cypress
 * beyond `expect`.
 *
 * It exists because of a real leak. `releaseCutoff` used to subtract
 * `RELEASE_DELAY_DAYS * DAY_MS` from the instant and read the Rome day off the
 * result, which is not seven calendar days when the interval spans a DST
 * change — the October week is 169 hours long. A build in the 23:00 hour during
 * the week after that change published a six-day-old bando. The dataset had
 * nothing embargoed at the time, so the suite was green throughout.
 */

const rome = (iso: string) => new Date(iso).getTime()

// Italy moved to CEST on 2026-03-29 and back to CET on 2026-10-25.
const DST_SPRING = '2026-03-29'
const DST_AUTUMN = '2026-10-25'

describe('the release rule', () => {
  describe('releaseCutoff', () => {
    it('is exactly RELEASE_DELAY_DAYS calendar days behind, every half hour of a year', () => {
      const DAY_MS = 24 * 60 * 60 * 1000
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
      expect(wrong, `cutoff drifted at:\n${wrong.slice(0, 5).join('\n')}`).to.be.empty
    })

    it('does not slip a day across either DST transition', () => {
      // 23:30 Rome is the hour the old implementation leaked in: late enough
      // that subtracting 168 absolute hours lands in the previous day.
      expect(releaseCutoff(rome('2026-10-30T22:30:00Z')), 'autumn').to.equal('2026-10-23')
      expect(releaseCutoff(rome('2026-04-03T22:30:00Z')), 'spring').to.equal('2026-03-28')
    })
  })

  describe('isPublished', () => {
    const open = '2099-12-31'

    it('publishes on day seven and not on day six', () => {
      const at = rome('2026-10-30T22:30:00Z') // 23:30 Rome, the leaking instant
      const cutoff = releaseCutoff(at)
      const today = currentDay(at)

      expect(isPublished({ detectedAt: '2026-10-23', deadline: open }, cutoff, today), 'day 7').to
        .be.true
      expect(isPublished({ detectedAt: '2026-10-24', deadline: open }, cutoff, today), 'day 6').to
        .be.false
    })

    it('holds a row back for the whole window and releases it the day after', () => {
      const at = rome('2026-06-15T10:00:00Z')
      const cutoff = releaseCutoff(at)
      const today = currentDay(at)

      for (let ago = 0; ago < RELEASE_DELAY_DAYS; ago++) {
        const detected = currentDay(at - ago * 24 * 60 * 60 * 1000)
        expect(isPublished({ detectedAt: detected, deadline: open }, cutoff, today), `${ago}d old`)
          .to.be.false
      }
      const seven = currentDay(at - RELEASE_DELAY_DAYS * 24 * 60 * 60 * 1000)
      expect(isPublished({ detectedAt: seven, deadline: open }, cutoff, today), '7d old').to.be.true
    })

    it('exempts an expired bando whatever its detection date says', () => {
      const at = rome('2026-06-15T10:00:00Z')
      // Detected today, but its scadenza is behind us: an archive backfill.
      expect(
        isPublished(
          { detectedAt: currentDay(at), deadline: '2026-06-14' },
          releaseCutoff(at),
          currentDay(at)
        )
      ).to.be.true
    })

    it('fails open on an unusable detectedAt, which data-integrity.cy.ts is what catches', () => {
      const at = rome('2026-06-15T10:00:00Z')
      expect(isPublished({ deadline: '2099-12-31' }, releaseCutoff(at), currentDay(at))).to.be.true
    })
  })

  describe('daysUntilRelease', () => {
    it('is never below 1 for a row detected today, on any day of the year', () => {
      const wrong: string[] = []
      for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 30 * 60 * 1000) {
        // The promise LockedRows depends on: it must never render "in 0 days".
        if (daysUntilRelease(currentDay(t), t) < 1) wrong.push(new Date(t).toISOString())
      }
      expect(wrong, `fell below 1 at:\n${wrong.slice(0, 5).join('\n')}`).to.be.empty
    })

    it('counts down one day at a time', () => {
      const at = rome('2026-06-15T10:00:00Z')
      expect(daysUntilRelease('2026-06-15', at), 'detected today').to.equal(RELEASE_DELAY_DAYS)
      expect(daysUntilRelease('2026-06-14', at), 'detected yesterday').to.equal(
        RELEASE_DELAY_DAYS - 1
      )
      expect(daysUntilRelease('2026-06-09', at), 'detected six days ago').to.equal(1)
    })

    it('is unaffected by the hour the build runs, including across a DST change', () => {
      for (const day of [DST_SPRING, DST_AUTUMN]) {
        const midnight = new Date(`${day}T00:00:00Z`).getTime()
        const answers = new Set<number>()
        for (let h = 0; h < 24; h++) {
          const at = midnight + h * 60 * 60 * 1000
          answers.add(daysUntilRelease(currentDay(at), at))
        }
        expect([...answers], `${day} varied by hour`).to.deep.equal([RELEASE_DELAY_DAYS])
      }
    })
  })

  describe('hasExpired', () => {
    const today = '2026-06-15'

    it('treats the scadenza itself as still open, and the day before as closed', () => {
      expect(hasExpired('2026-06-15', today), 'expires today').to.be.false
      expect(hasExpired('2026-06-16', today), 'expires tomorrow').to.be.false
      expect(hasExpired('2026-06-14', today), 'expired yesterday').to.be.true
    })

    it('does not call an unreadable deadline expired', () => {
      // Deliberate: expiry is what publishes a row early and what suppresses a
      // send, so an unparseable value must trigger neither.
      expect(hasExpired(undefined, today), 'missing').to.be.false
      expect(hasExpired('not a date', today), 'garbage').to.be.false
      expect(hasExpired('2026-02-31', today), 'not a real day').to.be.false
    })
  })

  describe('detectionDay', () => {
    it('reads both stored shapes as the same Italian day', () => {
      // data.json has held both: an ISO instant (midnight Rome, serialised UTC)
      // and, since commit 6ca1ec5, a bare day. Slicing the string would date
      // the first one to 31 July and release it early.
      expect(detectionDay('2026-07-31T22:00:00.000Z')).to.equal('2026-08-01')
      expect(detectionDay('2026-08-01')).to.equal('2026-08-01')
    })

    it('returns undefined rather than throwing on junk', () => {
      expect(detectionDay(undefined)).to.be.undefined
      expect(detectionDay('')).to.be.undefined
      expect(detectionDay('31/07/2026')).to.be.undefined
    })
  })
})
