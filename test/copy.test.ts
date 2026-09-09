import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import faqJson from '../data/faq.json' with { type: 'json' }
import translations from '../locales/it.json' with { type: 'json' }
import { RELEASE_DAYS_TOKEN, withReleaseDays } from '../lib/copy.ts'
import { RELEASE_DELAY_DAYS } from '../lib/embargo.ts'

/**
 * The one place the site states how long a bando stays subscriber-only.
 *
 * The copy used to spell it "sette giorni" in fifteen strings across
 * `locales/it.json` and `data/faq.json` — home page, abbonamento pitch, locked
 * rows, Chi Siamo, two meta descriptions, the Dataset JSON-LD. Changing
 * `RELEASE_DELAY_DAYS` would have left every one of them lying, and none of
 * them is findable by grepping for a number.
 *
 * So they carry `{releaseDays}`, resolved by `lib/translations.ts` for the JSON
 * and by `app/faq/page.tsx` for the FAQ. These tests hold both ends: that the
 * substitution leaves nothing behind, and that the words never come back.
 */
const strings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(strings)
  return []
}

const SOURCES = [
  ['locales/it.json', translations as unknown],
  ['data/faq.json', faqJson as unknown],
] as const

describe('Release-delay copy', () => {
  it('resolves every {releaseDays} token', () => {
    for (const [name, source] of SOURCES) {
      const resolved = withReleaseDays(source, RELEASE_DELAY_DAYS)
      const leftover = strings(resolved).filter((s) => s.includes(RELEASE_DAYS_TOKEN))
      assert.deepEqual(leftover, [], `${name} still carries an unresolved token`)
    }
  })

  it('puts the real number in front of the reader', () => {
    // Not just "a substitution happened": the delay the copy promises has to be
    // the delay lib/embargo.ts actually enforces.
    const resolved = withReleaseDays(translations as unknown, RELEASE_DELAY_DAYS)
    assert.ok(
      strings(resolved).some((s) => s.includes(`${RELEASE_DELAY_DAYS} giorni`)),
      'the resolved copy states the delay in days'
    )
  })

  it('never spells the delay out in words', () => {
    // The regression this whole mechanism exists to prevent. "sette giorni" is
    // correct today and silently wrong the day RELEASE_DELAY_DAYS moves, and a
    // reviewer has no way to know which of these strings mean the release delay.
    for (const [name, source] of SOURCES) {
      const written = strings(source).filter((s) => /sette giorni/i.test(s))
      assert.deepEqual(written, [], `${name} spells the release delay out in words`)
    }
  })

  it('leaves the other placeholders alone', () => {
    // `{days}` is dashboard.locked.countdown's — "il prossimo si sblocca tra
    // {days} giorni", filled in the browser with how long until the NEXT
    // release, which is not the delay and is not known at build time. Filling it
    // here would freeze the countdown at seven. `{count}` and `{year}` are the
    // same kind of thing.
    const resolved = withReleaseDays(
      { a: 'tra {days} giorni', b: '{count} bandi', c: '© {year}', d: `${RELEASE_DAYS_TOKEN} giorni` },
      RELEASE_DELAY_DAYS
    )

    assert.equal(resolved.a, 'tra {days} giorni')
    assert.equal(resolved.b, '{count} bandi')
    assert.equal(resolved.c, '© {year}')
    assert.equal(resolved.d, `${RELEASE_DELAY_DAYS} giorni`)
  })

  it('walks arrays and nested objects, and fills every occurrence', () => {
    // pages.abbonamento.intro carries the token twice, and most of the copy that
    // states the delay is inside an array of sections several levels down.
    const resolved = withReleaseDays(
      {
        sections: [{ content: `dopo ${RELEASE_DAYS_TOKEN} giorni, quei ${RELEASE_DAYS_TOKEN} giorni` }],
        amount: 12,
        missing: null,
      },
      RELEASE_DELAY_DAYS
    )

    assert.equal(
      resolved.sections[0].content,
      `dopo ${RELEASE_DELAY_DAYS} giorni, quei ${RELEASE_DELAY_DAYS} giorni`
    )
    assert.equal(resolved.amount, 12, 'non-strings pass through untouched')
    assert.equal(resolved.missing, null)
  })
})
