// `allBids`, not `bids`: these are source-hygiene checks and they have to cover
// the rows the release delay is currently hiding too — a bad slug or a pasted
// crest must fail now, not seven days from now when the row goes public.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  RELEASE_DELAY_DAYS,
  allBids as bids,
  bids as publishedBids,
  detectionDay,
  embargoedBids,
  faqs,
  glossaryTerms,
  hasExpired,
  laws,
  rawBids,
  releaseCutoff,
  toSlug,
} from '../cypress/support/site.ts'
import {
  CREST_SIZE_DETAIL,
  CREST_SIZE_TABLE,
  CREST_WIDTHS,
  crestUrl,
} from '../lib/crest.ts'

/**
 * The bid list is hand-curated (and fed by the crawler), so a typo in
 * data.json is the most likely way to break the site. These checks never open a
 * page — they read the JSON and the real `lib/` helpers — so they run under
 * `node --test`, before `next build`, and a bad row is named in about a second.
 *
 * They were `cypress/e2e/data-integrity.cy.ts` until 2026-09-03. Nothing here
 * ever needed a browser; see `test/embargo.test.ts` for what running that kind
 * of test in Electron anyway eventually cost.
 *
 * `cypress/support/site.ts` is imported directly, exactly as the specs import
 * it. It is deliberately framework-free — it names neither `cy` nor `Cypress`,
 * only the app's own `lib/` modules and the real JSON — so both test layers can
 * share one derivation of the dataset and cannot drift apart. It lives under
 * `cypress/` because that is where it was born and where most of its consumers
 * still are.
 */

// Generous bounding box around Italy, including the islands and Lampedusa.
const ITALY_BOUNDS = { minLat: 35.0, maxLat: 47.5, minLng: 6.0, maxLng: 19.0 }

/**
 * Crest filename rules, shared by data.json and laws.json — both files are
 * edited by hand and both render their images through the same `crestUrl()`.
 *
 * A recurring copy-paste slip appends a stray character to the pasted URL, and
 * on a normal keyboard layout that character is usually a 7 sitting next to the
 * paste key: ".../Stemma.png7". The URL still parses and still looks right at a
 * glance, but Wikimedia answers 404 and the row renders a broken crest.
 *
 * The extension whitelist is deliberately generous: a comune hosting its own
 * crest as .webp or .jpeg is legitimate, and a false failure here blocks a
 * deploy.
 */
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp|avif)$/i

/**
 * The path alone, without the query. Seven crests carry Wikipedia's own `utm_*`
 * parameters, so ".../Stemma.png7?utm_source=…" ends in a letter and a test
 * against the whole URL would wave the typo through. `crestUrl()` rewrites the
 * path and drops the query too, so this is also the part that has to be right.
 */
const crestPath = (image: string) => new URL(image).pathname

/**
 * Groups entries by the crest they will actually request, and returns only the
 * groups with more than one owner.
 *
 * Keyed on `crestUrl()` output rather than the raw string on purpose: a paste
 * that grabbed a neighbouring comune's crest often arrives at a different width
 * than the row it was copied from, so ".../250px-Moniga_del_Garda-Stemma.png"
 * and ".../Moniga_del_Garda-Stemma.png" look like two distinct values while
 * resolving to one file. Normalising first is what makes the check bite.
 *
 * Deliberately per-file: a bid and a law for the same city legitimately share a
 * crest (Milano and Bologna both do), so the two datasets are never compared
 * against each other.
 */
const sharedCrests = (rows: { location: string; image: string }[]) => {
  const owners = new Map<string, string[]>()
  rows.forEach((row) => {
    const key = crestUrl(row.image, CREST_SIZE_TABLE)
    owners.set(key, [...(owners.get(key) ?? []), row.location])
  })
  return [...owners.entries()].filter(([, locations]) => locations.length > 1)
}

/** Renders `sharedCrests` output into a failure message that names the culprits. */
const describeShared = (shared: [string, string[]][]) =>
  shared.map(([image, locations]) => `${locations.join(' + ')} all use ${image}`).join('; ')

/** chai's `.to.be.a('string').and.not.be.empty`, which node:assert has no shorthand for. */
const nonEmptyString = (value: unknown, what: string) => {
  assert.equal(typeof value, 'string', `${what} is a string, got ${typeof value}`)
  assert.ok((value as string).length > 0, `${what} is not empty`)
}

describe('data/data.json', () => {
  it('is not empty', () => {
    assert.ok(bids.length > 0, 'data.json has rows')
  })

  it('gives every bid the required fields', () => {
    bids.forEach((bid, index) => {
      const where = `bid #${index} (${bid.location ?? 'no location'})`
      nonEmptyString(bid.location, `${where} location`)
      nonEmptyString(bid.deadline, `${where} deadline`)
      nonEmptyString(bid.url, `${where} url`)
      nonEmptyString(bid.image, `${where} image`)
      assert.equal(typeof bid.amount, 'number', `${where} amount is a number`)
    })
  })

  it('uses ISO deadlines that parse to real dates', () => {
    bids.forEach((bid) => {
      assert.match(bid.deadline, /^\d{4}-\d{2}-\d{2}$/, `${bid.location} deadline format`)
      const parsed = new Date(bid.deadline)
      assert.ok(!Number.isNaN(parsed.getTime()), `${bid.location} deadline parses`)
      assert.equal(
        parsed.toISOString().slice(0, 10),
        bid.deadline,
        `${bid.location} deadline round-trips`
      )
    })
  })

  it('dates every detection readably, no later than today', () => {
    // `detectedat` drives the seven-day embargo (lib/embargo.ts). A row whose
    // date is missing or unreadable is treated as published — the right
    // fallback for a build, since the alternative is a table that silently
    // empties, but for a paywall it fails *open*: a brand-new bando would skip
    // its week and nothing on the page would look wrong. This is the guard,
    // and it runs before both deploys.
    //
    // releaseCutoff() subtracts the delay, so adding it back gives today's
    // Italian calendar day — the same arithmetic the app uses, not a second one.
    const today = releaseCutoff(Date.now() + RELEASE_DELAY_DAYS * 24 * 60 * 60 * 1000)
    bids.forEach((bid) => {
      nonEmptyString(bid.detectedat, `${bid.location} detectedat`)
      // Readable is not the same as right. `new Date('01/08/2026')` parses
      // happily — as the 8th of January, in whatever timezone the runner sits
      // in — so a European d/m/Y typo would sail past `detectionDay` and
      // mis-date the bando by seven months, holding it back or releasing it
      // early with nothing to show for it. Only the two shapes the file
      // actually uses are accepted: a bare "2026-08-01" and the ISO instant
      // the curation step writes, "2026-07-31T22:00:00.000Z".
      assert.match(
        bid.detectedat!,
        /^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/,
        `${bid.location} detectedat "${bid.detectedat}" is an ISO date`
      )
      const day = detectionDay(bid.detectedat)
      assert.equal(
        typeof day,
        'string',
        `${bid.location} detectedat "${bid.detectedat}" is readable`
      )
      assert.ok(day! <= today, `${bid.location} detectedat "${day}" is not in the future`)
    })
  })

  it('lists a positive whole number of licences', () => {
    bids.forEach((bid) => {
      assert.ok(Number.isInteger(bid.amount), `${bid.location} amount is an integer`)
      assert.ok(bid.amount > 0, `${bid.location} amount is positive, got ${bid.amount}`)
    })
  })

  it('points every bid at an absolute https URL', () => {
    bids.forEach((bid) => {
      assert.doesNotThrow(() => new URL(bid.url), `${bid.location} url parses`)
      assert.match(bid.url, /^https?:\/\//, `${bid.location} url scheme`)
    })
  })

  it('points every crest at an absolute image URL', () => {
    bids.forEach((bid) => {
      assert.doesNotThrow(() => new URL(bid.image), `${bid.location} image parses`)
      assert.match(bid.image, /^https?:\/\//, `${bid.location} image scheme`)
    })
  })

  it('never ends a crest filename in a digit', () => {
    bids.forEach((bid) => {
      const path = crestPath(bid.image)
      assert.doesNotMatch(path, /\d$/, `${bid.location} crest filename "${path}"`)
    })
  })

  it('ends every crest filename in a real image extension', () => {
    bids.forEach((bid) => {
      const path = crestPath(bid.image)
      assert.match(path, IMAGE_EXTENSIONS, `${bid.location} crest filename "${path}"`)
    })
  })

  it('gives every comune its own crest', () => {
    // Two comuni sharing a coat of arms means one of them was pasted from the
    // other's row — the image still loads, so nothing else in the suite can see
    // it. Only the wrong town is on the page.
    const shared = sharedCrests(bids)
    assert.deepEqual(shared, [], `crest copied between rows: ${describeShared(shared)}`)
  })

  it('places every set of coordinates inside Italy', () => {
    bids.forEach((bid) => {
      if (!bid.latitude || !bid.longitude) return
      const lat = Number(bid.latitude)
      const lng = Number(bid.longitude)
      assert.ok(!Number.isNaN(lat), `${bid.location} latitude is numeric`)
      assert.ok(!Number.isNaN(lng), `${bid.location} longitude is numeric`)
      assert.ok(
        lat >= ITALY_BOUNDS.minLat && lat <= ITALY_BOUNDS.maxLat,
        `${bid.location} latitude ${lat} is inside Italy`
      )
      assert.ok(
        lng >= ITALY_BOUNDS.minLng && lng <= ITALY_BOUNDS.maxLng,
        `${bid.location} longitude ${lng} is inside Italy`
      )
    })
  })

  it('produces a unique, non-empty slug for every bid', () => {
    const seen = new Map<string, string>()
    bids.forEach((bid) => {
      const slug = toSlug(bid.location)
      assert.ok(slug.length > 0, `${bid.location} slug is not empty`)
      assert.doesNotMatch(slug, /\s/, `${bid.location} slug has no whitespace`)
      assert.ok(!slug.includes('/'), `${bid.location} slug has no slashes`)
      assert.ok(
        !seen.has(slug),
        `slug "${slug}" is shared by "${seen.get(slug)}" and "${bid.location}"`
      )
      seen.set(slug, bid.location)
    })
  })

  it('keeps every slug inside printable ASCII', () => {
    // Static export writes one directory per slug; non-ASCII directory names
    // are a portability risk on GitHub Pages. See lib/slug.ts.
    bids.forEach((bid) => {
      const slug = toSlug(bid.location)
      assert.match(slug, /^[\x20-\x7e]+$/, `slug for "${bid.location}"`)
      assert.doesNotMatch(slug, /^-|-$/, `slug for "${bid.location}" has no dangling hyphen`)
      // Next's router will not match a dynamic segment containing a comma.
      assert.ok(!slug.includes(','), `slug for "${bid.location}" has no comma`)
    })
  })

  it('has no duplicate locations', () => {
    const locations = bids.map((bid) => bid.location)
    assert.equal(new Set(locations).size, locations.length, 'unique locations')
  })

  it('stores locations without stray whitespace', () => {
    // Asserted against the raw file, not `bids`: lib/trim.ts already strips a
    // leading or trailing space on read, so the site survives one — but the
    // source is still worth keeping clean, and an *internal* double space is
    // something trimming cannot fix.
    rawBids.forEach((bid) => {
      assert.equal(bid.location, bid.location.trim(), `"${bid.location}" is trimmed`)
      assert.doesNotMatch(bid.location, /\s{2,}/, `"${bid.location}" has no double spaces`)
    })
  })

  it('trims every string field before the app sees it', () => {
    // The guard behind that tolerance: whatever data.json holds, no consumer
    // ever receives a padded location, url, image, deadline or coordinate.
    bids.forEach((bid, index) => {
      Object.entries(bid).forEach(([field, value]) => {
        if (typeof value !== 'string') return
        assert.equal(value, value.trim(), `bid #${index} ${field} is trimmed`)
      })
    })
  })
})

/**
 * The release delay stated over the real dataset.
 *
 * `cypress/e2e/embargo.cy.ts` keeps the half that needs the export — that no
 * embargoed location, URL, slug or crest appears in the built HTML or the
 * sitemap. These three need only the JSON and `lib/embargo.ts`, so they moved
 * here with the rest of the dataset checks; `test/embargo.test.ts` is the
 * third piece, the rule itself against fixed instants and no data at all.
 */
describe('the release delay over data/data.json', () => {
  it('holds back nothing that is older than the window', () => {
    // The complement of the leak check: everything past its seven days must be
    // in the published set, or the delay is quietly hiding the whole archive.
    const stale = embargoedBids.filter((bid) => {
      const age = (Date.now() - new Date(bid.detectedAt!).getTime()) / 86_400_000
      return age > RELEASE_DELAY_DAYS + 1
    })
    assert.deepEqual(
      stale.map((bid) => `${bid.location} (${bid.detectedAt})`),
      [],
      'bandi held back past their release date'
    )
  })

  it('holds back nothing whose scadenza has already passed', () => {
    // The archive is filled in backwards: old bandi are added long after they
    // closed so the history is exhaustive, and the convention is to date those
    // rows with their own deadline, which puts them outside the window anyway.
    // The expiry clause in `isPublished` is what makes the outcome right when
    // that is forgotten — a closed bando has no head start left to sell, and
    // hiding one for a week only makes the free site look incomplete.
    const scaduti = embargoedBids.filter((bid) => hasExpired(bid.deadline))
    assert.deepEqual(
      scaduti.map((bid) => `${bid.location} (scadenza ${bid.deadline})`),
      [],
      'expired bandi held back from the public site'
    )
  })

  it('shows every expired bando, however recently it was detected', () => {
    // The complement, stated over the whole dataset rather than the held-back
    // slice: an expired row is in the published set whatever `detectedat` says.
    const missing = bids.filter((bid) => hasExpired(bid.deadline) && !publishedBids.includes(bid))
    assert.deepEqual(
      missing.map((bid) => `${bid.location} (scadenza ${bid.deadline})`),
      [],
      'expired bandi missing from the published set'
    )
  })
})

describe('data/laws.json', () => {
  it('gives every law the required fields', () => {
    laws.forEach((law, index) => {
      const where = `law #${index} (${law.location ?? 'no location'})`
      nonEmptyString(law.location, `${where} location`)
      nonEmptyString(law.image, `${where} image`)
      nonEmptyString(law.url, `${where} url`)
    })
  })

  it('points every law at an absolute URL', () => {
    laws.forEach((law) => {
      assert.doesNotThrow(() => new URL(law.url), `${law.location} url parses`)
      assert.match(law.url, /^https?:\/\//, `${law.location} url scheme`)
      assert.match(law.image, /^https?:\/\//, `${law.location} image scheme`)
    })
  })

  it('never ends a crest filename in a digit', () => {
    laws.forEach((law) => {
      const path = crestPath(law.image)
      assert.doesNotMatch(path, /\d$/, `${law.location} crest filename "${path}"`)
    })
  })

  it('ends every crest filename in a real image extension', () => {
    laws.forEach((law) => {
      const path = crestPath(law.image)
      assert.match(path, IMAGE_EXTENSIONS, `${law.location} crest filename "${path}"`)
    })
  })

  it('gives every region its own crest', () => {
    const shared = sharedCrests(laws)
    assert.deepEqual(shared, [], `crest copied between rows: ${describeShared(shared)}`)
  })

  it('has no duplicate locations', () => {
    const locations = laws.map((law) => law.location)
    assert.equal(new Set(locations).size, locations.length, 'unique law locations')
  })
})

describe('data/faq.json', () => {
  it('gives every entry a question and an answer', () => {
    faqs.forEach((faq, index) => {
      nonEmptyString(faq.question, `FAQ #${index} question`)
      nonEmptyString(faq.answer, `FAQ #${index} answer`)
      assert.ok(faq.question.trim().endsWith('?'), `FAQ #${index} is phrased as a question`)
    })
  })

  it('has no duplicate questions', () => {
    const questions = faqs.map((faq) => faq.question)
    assert.equal(new Set(questions).size, questions.length, 'unique questions')
  })
})

describe('locales/it.json glossary', () => {
  it('gives every term a definition', () => {
    glossaryTerms.forEach((term, index) => {
      nonEmptyString(term.term, `glossary #${index} term`)
      nonEmptyString(term.definition, `glossary #${index} definition`)
    })
  })

  it('has no duplicate terms', () => {
    const terms = glossaryTerms.map((term) => term.term)
    assert.equal(new Set(terms).size, terms.length, 'unique glossary terms')
  })
})

describe('crest thumbnails (lib/crest.ts)', () => {
  const allCrests = [...bids.map((bid) => bid.image), ...laws.map((law) => law.image)]

  it('only ever asks Wikimedia for a width it will serve', () => {
    // Wikimedia refuses to render arbitrary thumbnail widths on demand and
    // answers 400 for anything outside its bucket list, so a stray size here
    // means broken crests on every page. 64px and 160px both fail — the
    // constants in lib/crest.ts look odd for a 32px/80px box on purpose.
    ;[CREST_SIZE_TABLE, CREST_SIZE_DETAIL].forEach((width) => {
      assert.ok(
        (CREST_WIDTHS as readonly number[]).includes(width),
        `${width}px is a supported bucket`
      )
    })
  })

  it('rewrites every Wikimedia crest to a thumbnail of the requested width', () => {
    allCrests.forEach((image) => {
      const rendered = crestUrl(image, CREST_SIZE_TABLE)
      if (!image.includes('upload.wikimedia.org')) {
        assert.equal(rendered, image, `${image} is left alone`)
        return
      }

      assert.ok(rendered.includes('/thumb/'), `${image} becomes a thumbnail`)
      assert.match(
        rendered,
        new RegExp(`/${CREST_SIZE_TABLE}px-[^/]+$`),
        `${image} carries the requested width`
      )
    })
  })

  it('keeps percent-encoding intact while rewriting', () => {
    const encoded = allCrests.filter((image) => /%[0-9A-F]{2}/i.test(image))
    assert.ok(encoded.length > 0, 'some crest names are percent-encoded')

    encoded.forEach((image) => {
      const rendered = crestUrl(image, CREST_SIZE_TABLE)
      // A double-encoded %2527 or a decoded literal apostrophe would 404.
      assert.doesNotMatch(rendered, /%25[0-9A-F]{2}/i, `${image} is not double-encoded`)
      assert.equal(
        typeof decodeURIComponent(new URL(rendered).pathname),
        'string',
        `${image} still decodes`
      )
    })
  })
})
