# data/

The hand-curated data behind the site. `data.json` is the one that changes
often — the NCC bandi. `laws.json` and `faq.json` change rarely.

This file is the working reference for adding a bando and checking it before it
goes public. The full reasoning behind the seven-day delay lives in the root
`CLAUDE.md` ("The seven-day release delay") and in `lib/embargo.ts`.

## Adding a bando

Append an object to `data.json`:

```json
{
  "location": "Comune di NomeCittà (XX)",
  "deadline": "2026-08-28",
  "url": "https://official-bid-url.it/...",
  "amount": 5,
  "image": "https://upload.wikimedia.org/.../Stemma.png",
  "latitude": "41.1234",
  "longitude": "12.5678",
  "detectedat": "2026-08-28"
}
```

Four things that are easy to get wrong:

- **The province code in `location` decides the region.** `(MI)` puts the bando
  under Lombardia in the *Regioni* tab. Get it wrong and the bando shows up
  under the wrong region — `test/regions.test.ts` catches the ones the
  coordinates contradict, but only if the row has coordinates. If a bando has
  neither a province code nor coordinates, it belongs to no region at all and
  the suite fails: add one or the other.
- **`latitude` and `longitude` are strings**, not numbers. `lib/data.ts`
  converts them on read. Without them the bando gets no map marker, which is
  allowed — the table row and the detail page still work (but see the region
  note above).
- **`detectedat` is all lowercase.** It is the key that drives the embargo, and
  a capital `A` fails *open*: the bando would go public immediately instead of
  waiting its week, and nothing on the page would look wrong.
- **Don't leave trailing spaces**, especially in `location`. The site trims on
  read (`lib/trim.ts`), so a stray space will not break anything, but the
  Cypress suite flags it and it is a sign the row was pasted rather than typed.

Field-by-field notes are in `CLAUDE.md` → "Adding a new NCC bid".

## What happens after you push

The bando is **subscriber-only for seven days**:

| | day 0 | day 7 |
|---|---|---|
| Newsletter | mailed to subscribers | — |
| Home table and map | hidden | visible |
| Detail page `/bandi/<slug>/` | built and reachable, but unlinked and `noindex` | linked normally |

That head start is what the subscription sells, so the delay is deliberate.

The **build** is what releases a bando, not the clock — so `deploy.yml` runs on a
daily schedule at 05:00 UTC. A bando detected eight days ago goes public on that
run without anyone pushing.

**Expired bandi are exempt.** A bando whose `deadline` has already passed is
published immediately, whatever `detectedat` says, and the newsletter never
mails it. That is for backfilling the archive: an old bando is public record
already and has no head start left to sell. The convention when adding one is to
set `detectedat` to its own `deadline`, which puts it outside the window anyway.

## Checking a bando before it goes public

The detail page exists from day 0 — it is just unlinked. There are three ways to
reach it, easiest first.

### 1. From the Actions run (recommended)

Push to `staging`, then open the run under the repo's **Actions** tab →
**Deploy to Netlify**. Once it is green, the run summary lists every bando
currently being held back, each one a link straight to its live staging page.

Nothing to install, no slug to work out. Wait for the whole run to finish — the
links point at the deploy that run produced, so they only work once it has
published.

If nothing is being held back, the summary says so in one line.

### 2. From the terminal

```sh
node scripts/preview-embargoed.mjs
```

Prints every bando currently being held back, with its slug, its staging URL,
its future production URL, and the date it goes public. `--all` lists every
bando with its status. Read-only — it writes nothing.

This reads whatever is in your working copy, so it answers "what will be hidden
when I push this?" before you push. The Actions summary answers "what is hidden
right now?" after you have.

### 3. By hand

```
https://spiffy-semifreddo-87751b.netlify.app/bandi/<slug>/
```

### Building the slug by hand

`lib/slug.ts` derives it from `location`: strip accents, fold typographic quotes
and dashes to ASCII, drop anything still non-ASCII, turn commas into separators,
then hyphenate the spaces.

| `location` | slug |
|---|---|
| `Comune di Milano (MI)` | `Comune-di-Milano-(MI)` |
| `Comune di Forlì (FC)` | `Comune-di-Forli-(FC)` |
| `Comune di Colle di Val d’Elsa (Toscana)` | `Comune-di-Colle-di-Val-d'Elsa-(Toscana)` |

Parentheses and apostrophes survive as-is and are safe to paste into an address
bar. Note the trailing slash on the URL — the export sets `trailingSlash: true`.

## What you will *not* see, and why that is correct

An embargoed bando is **absent from the home table and the map**, on staging and
production alike. The home page shows a blurred placeholder row with a count and
a subscribe link in its place.

That is the paywall working, not a bug. Do not report it as one. The only way to
see the bando in the table is to wait for its release date, and the only page
that shows it before then is its own detail page at the URL above.

Staging is publicly reachable, so it deliberately gets no preview mode — an
override there would publish the bandi it was meant to protect.

## When the deploy goes red

Two different guards, with two different symptoms:

**A bad `deadline` fails the build**, in its first second, naming the row:

```
data/data.json: unreadable deadline on row 42 (Comune di Milano (MI)):
"2026-02-31" — that day does not exist in that month (it would mean 2026-03-03).
Deadlines must be a bare Italian calendar day in YYYY-MM-DD form, e.g. "2026-08-28".
```

Four things are checked: present, `YYYY-MM-DD` shape, parses, and round-trips.
The last one is why `2026-02-31` is caught — it parses happily, to the 3rd of
March. Fix the date and push again.

**A bad `detectedat` does *not* fail the build** — it fails the Cypress suite,
which gates the deploy just as firmly but only after a full build and a
five-minute run. Look for:

```
Comune di Milano (MI) detectedat "01/08/2026" is an ISO date
```

Only two shapes are accepted: a bare `2026-08-01` and the ISO instant
`2026-07-31T22:00:00.000Z`. A European `d/m/Y` date is rejected on purpose —
`new Date('01/08/2026')` parses as the 8th of January, which would mis-date the
bando by seven months and hold it back or release it early with nothing to show
for it. A date in the future is rejected too.

The split is deliberate: the failure mode of a build has to stay "an old bando
keeps showing", never "the site will not build".

## Running the checks locally

```sh
node scripts/preview-embargoed.mjs   # what is held back, and where to see it
npm run test:e2e                     # the full suite, including data integrity
```

`test/data-integrity.test.ts` is the spec that checks this file.

## A note on privacy

The repo is public, so `data/data.json` is world-readable on GitHub whether or
not a bando is showing on the site, and the Actions run summary that lists the
held-back bandi is public too. The seven-day delay is a head start for
subscribers, not a secret — it keeps new bandi off the site and out of search
results, which is what makes the subscription worth paying for. Treat it that
way, and do not put anything in this file you would mind a stranger reading.
