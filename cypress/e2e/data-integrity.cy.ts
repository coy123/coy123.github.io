import { bids, faqs, glossaryTerms, laws, rawBids, toSlug } from '../support/site'
import { CREST_SIZE_DETAIL, CREST_SIZE_TABLE, CREST_WIDTHS, crestUrl } from '../../lib/crest'

/**
 * The bid list is hand-curated (and fed by the crawler), so a typo in
 * data.json is the most likely way to break the site. These checks run without
 * a browser page and fail fast, before the slower UI specs.
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

describe('data/data.json', () => {
  it('is not empty', () => {
    expect(bids).to.have.length.greaterThan(0)
  })

  it('gives every bid the required fields', () => {
    bids.forEach((bid, index) => {
      const where = `bid #${index} (${bid.location ?? 'no location'})`
      expect(bid.location, `${where} location`).to.be.a('string').and.not.be.empty
      expect(bid.deadline, `${where} deadline`).to.be.a('string').and.not.be.empty
      expect(bid.url, `${where} url`).to.be.a('string').and.not.be.empty
      expect(bid.image, `${where} image`).to.be.a('string').and.not.be.empty
      expect(bid.amount, `${where} amount`).to.be.a('number')
    })
  })

  it('uses ISO deadlines that parse to real dates', () => {
    bids.forEach((bid) => {
      expect(bid.deadline, `${bid.location} deadline format`).to.match(/^\d{4}-\d{2}-\d{2}$/)
      const parsed = new Date(bid.deadline)
      expect(Number.isNaN(parsed.getTime()), `${bid.location} deadline parses`).to.be.false
      expect(parsed.toISOString().slice(0, 10), `${bid.location} deadline round-trips`).to.eq(
        bid.deadline
      )
    })
  })

  it('lists a positive whole number of licences', () => {
    bids.forEach((bid) => {
      expect(Number.isInteger(bid.amount), `${bid.location} amount is an integer`).to.be.true
      expect(bid.amount, `${bid.location} amount`).to.be.greaterThan(0)
    })
  })

  it('points every bid at an absolute https URL', () => {
    bids.forEach((bid) => {
      expect(() => new URL(bid.url), `${bid.location} url parses`).to.not.throw()
      expect(bid.url, `${bid.location} url scheme`).to.match(/^https?:\/\//)
    })
  })

  it('points every crest at an absolute image URL', () => {
    bids.forEach((bid) => {
      expect(() => new URL(bid.image), `${bid.location} image parses`).to.not.throw()
      expect(bid.image, `${bid.location} image scheme`).to.match(/^https?:\/\//)
    })
  })

  it('never ends a crest filename in a digit', () => {
    bids.forEach((bid) => {
      const path = crestPath(bid.image)
      expect(path, `${bid.location} crest filename "${path}"`).to.not.match(/\d$/)
    })
  })

  it('ends every crest filename in a real image extension', () => {
    bids.forEach((bid) => {
      const path = crestPath(bid.image)
      expect(path, `${bid.location} crest filename "${path}"`).to.match(IMAGE_EXTENSIONS)
    })
  })

  it('gives every comune its own crest', () => {
    // Two comuni sharing a coat of arms means one of them was pasted from the
    // other's row — the image still loads, so nothing else in the suite can see
    // it. Only the wrong town is on the page.
    const shared = sharedCrests(bids)
    expect(shared, `crest copied between rows: ${describeShared(shared)}`).to.be.empty
  })

  it('places every set of coordinates inside Italy', () => {
    bids.forEach((bid) => {
      if (!bid.latitude || !bid.longitude) return
      const lat = Number(bid.latitude)
      const lng = Number(bid.longitude)
      expect(Number.isNaN(lat), `${bid.location} latitude is numeric`).to.be.false
      expect(Number.isNaN(lng), `${bid.location} longitude is numeric`).to.be.false
      expect(lat, `${bid.location} latitude`).to.be.within(
        ITALY_BOUNDS.minLat,
        ITALY_BOUNDS.maxLat
      )
      expect(lng, `${bid.location} longitude`).to.be.within(
        ITALY_BOUNDS.minLng,
        ITALY_BOUNDS.maxLng
      )
    })
  })

  it('produces a unique, non-empty slug for every bid', () => {
    const seen = new Map<string, string>()
    bids.forEach((bid) => {
      const slug = toSlug(bid.location)
      expect(slug, `${bid.location} slug`).to.not.be.empty
      expect(slug, `${bid.location} slug has no whitespace`).to.not.match(/\s/)
      expect(slug, `${bid.location} slug has no slashes`).to.not.contain('/')
      expect(
        seen.has(slug),
        `slug "${slug}" is shared by "${seen.get(slug)}" and "${bid.location}"`
      ).to.be.false
      seen.set(slug, bid.location)
    })
  })

  it('keeps every slug inside printable ASCII', () => {
    // Static export writes one directory per slug; non-ASCII directory names
    // are a portability risk on GitHub Pages. See lib/slug.ts.
    bids.forEach((bid) => {
      const slug = toSlug(bid.location)
      expect(slug, `slug for "${bid.location}"`).to.match(/^[\x20-\x7e]+$/)
      expect(slug, `slug for "${bid.location}" has no dangling hyphen`).to.not.match(/^-|-$/)
      // Next's router will not match a dynamic segment containing a comma.
      expect(slug, `slug for "${bid.location}" has no comma`).to.not.contain(',')
    })
  })

  it('has no duplicate locations', () => {
    const locations = bids.map((bid) => bid.location)
    expect(new Set(locations).size, 'unique locations').to.eq(locations.length)
  })

  it('stores locations without stray whitespace', () => {
    // Asserted against the raw file, not `bids`: lib/trim.ts already strips a
    // leading or trailing space on read, so the site survives one — but the
    // source is still worth keeping clean, and an *internal* double space is
    // something trimming cannot fix.
    rawBids.forEach((bid) => {
      expect(bid.location, `"${bid.location}" is trimmed`).to.eq(bid.location.trim())
      expect(bid.location, `"${bid.location}" has no double spaces`).to.not.match(/\s{2,}/)
    })
  })

  it('trims every string field before the app sees it', () => {
    // The guard behind that tolerance: whatever data.json holds, no consumer
    // ever receives a padded location, url, image, deadline or coordinate.
    bids.forEach((bid, index) => {
      Object.entries(bid).forEach(([field, value]) => {
        if (typeof value !== 'string') return
        expect(value, `bid #${index} ${field} is trimmed`).to.eq(value.trim())
      })
    })
  })
})

describe('data/laws.json', () => {
  it('gives every law the required fields', () => {
    laws.forEach((law, index) => {
      const where = `law #${index} (${law.location ?? 'no location'})`
      expect(law.location, `${where} location`).to.be.a('string').and.not.be.empty
      expect(law.image, `${where} image`).to.be.a('string').and.not.be.empty
      expect(law.url, `${where} url`).to.be.a('string').and.not.be.empty
    })
  })

  it('points every law at an absolute URL', () => {
    laws.forEach((law) => {
      expect(() => new URL(law.url), `${law.location} url parses`).to.not.throw()
      expect(law.url, `${law.location} url scheme`).to.match(/^https?:\/\//)
      expect(law.image, `${law.location} image scheme`).to.match(/^https?:\/\//)
    })
  })

  it('never ends a crest filename in a digit', () => {
    laws.forEach((law) => {
      const path = crestPath(law.image)
      expect(path, `${law.location} crest filename "${path}"`).to.not.match(/\d$/)
    })
  })

  it('ends every crest filename in a real image extension', () => {
    laws.forEach((law) => {
      const path = crestPath(law.image)
      expect(path, `${law.location} crest filename "${path}"`).to.match(IMAGE_EXTENSIONS)
    })
  })

  it('gives every region its own crest', () => {
    const shared = sharedCrests(laws)
    expect(shared, `crest copied between rows: ${describeShared(shared)}`).to.be.empty
  })

  it('has no duplicate locations', () => {
    const locations = laws.map((law) => law.location)
    expect(new Set(locations).size, 'unique law locations').to.eq(locations.length)
  })
})

describe('data/faq.json', () => {
  it('gives every entry a question and an answer', () => {
    faqs.forEach((faq, index) => {
      expect(faq.question, `FAQ #${index} question`).to.be.a('string').and.not.be.empty
      expect(faq.answer, `FAQ #${index} answer`).to.be.a('string').and.not.be.empty
      expect(faq.question.trim().endsWith('?'), `FAQ #${index} is phrased as a question`).to.be
        .true
    })
  })

  it('has no duplicate questions', () => {
    const questions = faqs.map((faq) => faq.question)
    expect(new Set(questions).size, 'unique questions').to.eq(questions.length)
  })
})

describe('locales/it.json glossary', () => {
  it('gives every term a definition', () => {
    glossaryTerms.forEach((term, index) => {
      expect(term.term, `glossary #${index} term`).to.be.a('string').and.not.be.empty
      expect(term.definition, `glossary #${index} definition`).to.be.a('string').and.not.be.empty
    })
  })

  it('has no duplicate terms', () => {
    const terms = glossaryTerms.map((term) => term.term)
    expect(new Set(terms).size, 'unique glossary terms').to.eq(terms.length)
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
      expect(CREST_WIDTHS as readonly number[], `${width}px is a supported bucket`).to.include(
        width
      )
    })
  })

  it('rewrites every Wikimedia crest to a thumbnail of the requested width', () => {
    allCrests.forEach((image) => {
      const rendered = crestUrl(image, CREST_SIZE_TABLE)
      if (!image.includes('upload.wikimedia.org')) {
        expect(rendered, `${image} is left alone`).to.eq(image)
        return
      }

      expect(rendered, `${image} becomes a thumbnail`).to.include('/thumb/')
      expect(rendered, `${image} carries the requested width`).to.match(
        new RegExp(`/${CREST_SIZE_TABLE}px-[^/]+$`)
      )
    })
  })

  it('keeps percent-encoding intact while rewriting', () => {
    const encoded = allCrests.filter((image) => /%[0-9A-F]{2}/i.test(image))
    expect(encoded.length, 'some crest names are percent-encoded').to.be.greaterThan(0)

    encoded.forEach((image) => {
      const rendered = crestUrl(image, CREST_SIZE_TABLE)
      // A double-encoded %2527 or a decoded literal apostrophe would 404.
      expect(rendered, `${image} is not double-encoded`).to.not.match(/%25[0-9A-F]{2}/i)
      expect(decodeURIComponent(new URL(rendered).pathname), `${image} still decodes`).to.be.a(
        'string'
      )
    })
  })
})
