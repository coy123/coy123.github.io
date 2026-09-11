# Roadmap

Decisions of the Can + Davide meeting of **2026-09-05**, merged with the
surviving items of `todo.md` on **2026-09-06**. `todo.md` is gone: everything
from it that was still open is below, everything that had shipped was dropped.
The stale `bandincc-crawler/coy123.github.io/todo.md` is history only — do not
edit it (see `CLAUDE.md` → Autonomy).

Subscriber and revenue figures are deliberately not written down here — they
drift daily. Read them from live Stripe (`stripe-worker/STATUS.md` → "Current
state" has the command). Growth came from the locked rows, shipped ~23 Aug;
monthly renewals began on 9 Sept.

---

## ⚠️ Next deadline — OSS VAT, 31 October 2026

Registered for non-Union OSS in **Ireland, with effect from 2026-08-09**. Decided
2026-09-10: the return is filed **by hand**, not through Stripe Tax, so
`automatic_tax` stays off on purpose and Stripe states no VAT. The VAT is carved
out of the tax-inclusive price once a quarter: `oss_report.py` computes it from
live Stripe on the crawler's server and mails it on the 1st of each quarter.
The first return, **2026-Q3, is due with its payment by 31 October 2026**.
Setup finished 2026-09-10 (cron, OSS number on invoices, reverse charge on B2B
customers) → `stripe-worker/STATUS.md` → "Current state".

---

## Decided

### Doing now

- **EU OSS VAT, by hand.** As above. Can. → `stripe-worker/STATUS.md` → "Current state"
- **Germany.** Go. German municipalities switch licence availability on and off,
  so the product is a **traffic-light** one: table green / yellow (waiting list)
  / red, plus a map with traffic lights, plus an alert when a city turns
  licences on. Order: Can automates discovery → Can builds the site → Davide +
  wife take marketing at launch. Davide does law/market research first — the
  premise currently rests on one person's suggestion.
- **banditaxi.it.** Separate site, white background (taxi are white, NCC black).
  *Note: the standing recommendation was to merge taxi into BandiNCC — same law
  (L. 21/1992), same buyer, and it would fix the thin-supply churn risk. A
  separate site was chosen instead; revisit if the two lists overlap in practice.*
- **Regional/provincial filter tab.** Per-province table + zoomed map. Can.
  *Built at the **region** level on 2026-09-06 (`components/RegionsContent.tsx`,
  `lib/regions.ts`, `CLAUDE.md` → "The Regioni tab"): a picker of all 20 regions
  with crests and open/closed counts, the ordinary table filtered to one, and
  the map framed on it. Per-**province** — 107 entries instead of 20 — was
  **deferred by decision on 2026-09-06**: not needed for now. If it ever comes
  back, it wants a province picker nested inside the chosen region rather than
  a flat list of 107.*

- **Map improvements.** ✅ *Done 2026-09-06 — `lib/mapMarkers.ts`,
  `components/MapView.tsx`, `CLAUDE.md` → "How the map draws itself". All eight
  items shipped: dot size by √licences clamped to 6–18px so Milano's 450 cannot
  cover Lombardia; open markers drawn over closed ones in a second layer group;
  grey instead of red for scaduto, matching the table and surviving a
  colour-vision deficiency; a legend; a "Solo bandi aperti" filter; region
  clustering below zoom 7 with a green ring where a region still has an open
  bando; hover tooltips on pointer devices; and a canvas-renderer threshold at
  500 markers. `spreadCoincident()` handles exactly-coincident points, which
  the dataset does not have yet.*

  *Two things to look at in review: the country map now **opens rolled up** into
  ~19 region bubbles rather than 102 dots — set `CLUSTER_BELOW_ZOOM = 0` in
  `lib/mapMarkers.ts` to go back to plain markers, nothing else changes — and
  `leaflet.markercluster` was deliberately not added, since the region rollup
  does the same job with no dependency.*

- **Paid tooling, €10–20/month.** Three problems, one budget: MailerLite's
  "sent by" banner (looks cheap to paying customers), the public GitHub repo,
  and free GitHub Pages. **Decided 2026-09-06: MailerLite paid, and everything
  else is option B — Cloudflare Pages, repo private, GitHub stays on Free.**
  Hosting is €0, so the whole budget goes to MailerLite. Plan and reasoning:
  "Going private on Cloudflare Pages" below.
  ✅ *MailerLite paid taken and the "sent by MailerLite" branding removed from
  outgoing mail, 2026-09-07.* Nothing in this repo changed and nothing should:
  the banner was injected by MailerLite at send time, not by
  `newsletter/*.html`. **`{$unsubscribe}` still has to stay in both shells** —
  it is a legal requirement and a MailerLite campaign requirement, not part of
  the branding that was just dropped. The hosting half of this budget line is
  still in flight (steps 4–7 below).
- **Subscriber questionnaire.** A mayor contacted us directly — ask him and all
  subscribers, plus everyone who has emailed us, what they need. Davide writes,
  Can sends.
- **Lead generation — affiliate links only.** Order of effort: move the Keliweb
  PEC link out of the homepage SEO section and into "come partecipare", bid
  detail pages and the alert email → an "assicurazione NCC" page → CAP/CQC
  course providers → leasing. Links need only disclosure; **lead forms**
  transfer personal data (consent + privacy policy + art. 28 processor) — build
  those only if link revenue proves demand. Davide researches monetisation and
  configures the Keliweb login.
- **Bandi predictor.** A year of data is enough to try predicting which comune
  announces when; sell monthly/yearly. Can researches the AI side.
- **Book.** Wait for Amazon until 21 Sept; if it stays delisted, publish as our
  own ebook — see "Sell the book as a PDF" below. No content improvements for now.
- **Research assignments (Davide):** company location for tax (Estonia /
  Romania / Georgia / Bulgaria vs Italy), company shape (Stiftung?) and the
  founder contract Can↔Davide, other bandi verticals, Germany market.

### Not doing

- **Paid ads.** Conversion is 0.5–1%, so ads pay if a paying customer costs
  under €5.90 — but a marketing push needs real capital. Improve other things
  first, revisit later.
- **Google AdSense.** Repeatedly rejected as "low value content", and the CPM on
  a small Italian niche site was never going to be worth it. The subscription is
  the monetisation path; the old AdSense checklist is closed.
- **Leading with the annual plan on `/abbonamento`.** Proposed as "€59 so you
  don't miss the one that matters", with monthly de-emphasised. Dropped
  2026-09-10: the page works as it is, monthly first. Do not re-propose it.
  Renewal and cancellation numbers are still worth watching — just not as
  evidence for this.

### Deferred, with a trigger

| Item | Revisit when |
|---|---|
| **Marketplace** — realistic now given a loyal paying base; still a must-do | after Germany |
| **Free mailing list** — 7-day-old bandi to harvest emails from 16k visitors. Captures everyone who clicks a lock but will not pay yet; infrastructure is mostly there (MailerLite + the Worker), and `/grazie/` already owes a re-subscribe form | when paid newsletter growth stalls |
| **Pratica assistita** (€49–99 per-bando document pack) | after we have applied ourselves and gained real experience |
| **Other bandi verticals** | after 3 months of renewal data |
| **Managing websites/deployment for comuni** — technical know-how yes, experience no; fake it till we make it | opportunistic: keep watching comuni with bad or missing sites |

---

## Going private on Cloudflare Pages (decision B, 2026-09-06)

> **→ Resume here.** Steps 1–4 are done: the nightly cron skips Cypress, the
> Worker reads `data.json` from KV, and since **2026-09-10 `bandincc.it` is on
> Cloudflare DNS and served by Cloudflare Pages**, every mail record carried
> over. **One piece of step 4 is left: remove the custom domain in GitHub →
> Settings → Pages, no earlier than the evening of 2026-09-12** — why is under
> step 4. Then step 5, the repo going private. Steps 5–7 follow in order and
> cannot be reordered — with one exception: **step 6's first half, moving
> staging from Netlify to a Cloudflare Pages preview, depends on nothing in
> step 5 and was done ahead of it on 2026-09-10.** It is in the working tree,
> not yet merged; it needs a first green `staging` run to verify, and only
> then is Netlify itself retired (the rest of step 6).

**Why.** The driver is not the embargo — `CLAUDE.md` already records that the
seven-day delay is a publishing convention, not access control, and guessable
`/bandi/` URLs were left alone on exactly that reasoning. The driver is that
**the dataset is the moat**: a year of curated bandi over ~7,900 comuni, sitting
in a public repo with its full history, is the one asset a competitor could
`git clone` — and it is also the training data for the bandi predictor.
Germany and banditaxi.it will be private from day one for the same reason.

**Why Cloudflare and not GitHub Pro.** Measured over the 30 days to 2026-09-06:
103 CI runs, ~412 min wall-clock, ≈650 billable min/month once the nightly cron
runs a full month. Three private repos land at 1,500–2,000 min/month against
GitHub Free's 2,000 — which is why the cron now skips Cypress (worth ~350
min/month across three sites). Hosting itself is the tiebreaker:

- Cloudflare Pages Free has unlimited bandwidth and requests, 100 projects,
  20,000 files per deployment (our export is ~1,000) and 100 custom domains per
  project. Nothing here binds at three sites, or at thirty.
- GitHub Pages has a 1 GB site cap, a 100 GB/month soft bandwidth cap, needs
  **Pro at $4/mo** for a private repo — and its terms exclude sites "primarily
  directed at facilitating commercial transactions". We sell a subscription and
  intend to sell a book. Arguable, but the failure mode is the site going dark.

If minutes ever do run out, GitHub says so before billing, and Pro's extra 1,000
minutes cost $4 against $6 to buy them à la carte — so Pro is the cheap fix at
that point, not a reason to stay on GitHub Pages.

### Order of work — the sequencing is load-bearing

The repo cannot go private until nothing depends on it being public, and DNS
cannot leave GitHub Pages until Cloudflare is serving the same export.

1. **[x] Trim the nightly run.** `e2e.yml` takes a `run-e2e` input; `deploy.yml`
   passes false on `schedule:` only. Done 2026-09-06.
2. **[x] Stand up Cloudflare Pages beside GitHub Pages.** A `bandincc` project
   on direct upload — no git integration, since CI already builds and the repo
   is about to be private. `deploy.yml` → `cloudflare` downloads the tested
   `out/` artifact and runs `wrangler pages deploy`. Both hosts serve in
   parallel; verify on `bandincc.pages.dev` before touching DNS.
   *Done. Project created 2026-09-06 (production branch `master`), token and
   variable set, and run #143 produced a Production deployment from `master`.
   `*.pages.dev` hung from the dev machine's ISP at the time (see Notes); by
   2026-09-10 it answered normally.*
3. **[x] Replace the Worker's `raw.githubusercontent` fetch with KV.** This is
   the hard dependency on a public repo, and it must land *before* step 5.
   `deploy.yml` → `publish-data` writes `data/data.json` into the namespace
   after a successful deploy; `welcome.ts` reads it from the binding. Both
   Worker environments bind it — named environments inherit nothing.
   `scripts/preview-welcome.mjs --remote` reads the same key.
   *Done. Namespace `BANDI` (`5281f3d3…`) created 2026-09-06; both Workers
   redeployed the same day with the binding attached. Run #143's `publish-data`
   wrote 103 rows — one more than the hand-seeded 102 — which is the proof CI
   is doing the writing, since the job is `continue-on-error` and would have
   gone green having written nothing.*
4. **[x] Cut DNS over.** *Done 2026-09-10, except dropping the custom domain
   from GitHub Pages — see "What was done" at the end of this step.* The plan
   as written beforehand: move `bandincc.it` from the IONOS nameservers to
   Cloudflare (free, and it gives apex CNAME flattening), then add both
   hostnames to the Pages project. Verify, then drop the custom domain from
   GitHub Pages settings.

   **This is the riskiest step in the migration, and the website is the least
   of it.** Moving nameservers moves *all* DNS, and `bandincc.it` carries the
   mail for info@bandincc.it plus MailerLite's whole sending setup — the
   address `/grazie/` tells previously-unsubscribed subscribers to write to, and
   the deliverability of every campaign we send. Cloudflare's import scan is
   good but not guaranteed complete, so **compare against this snapshot after
   the move, before changing the nameservers at IONOS if possible**. The first
   ten rows were read from public DNS on 2026-09-07; the last four were missing
   from that read and only turned up in the IONOS panel on 2026-09-10, which
   lists all 18:

   | Name | Type | Value |
   |---|---|---|
   | `bandincc.it` | A ×4 | `185.199.108–111.153` (GitHub Pages — these are what Pages replaces) |
   | `bandincc.it` | MX | `10 mx00.ionos.it`, `10 mx01.ionos.it` |
   | `bandincc.it` | TXT | `v=spf1 a mx include:_spf.mlsend.com include:_spf.perfora.net include:_spf.kundenserver.de ~all` |
   | `bandincc.it` | TXT | `mailerlite-domain-verification=659c7012fd142996b1dc274bbe8633e930b3d195` |
   | `www` | CNAME | `coy123.github.io` (the other record Pages replaces) |
   | `mail` | A | `34.91.249.129` |
   | `mail` | MX | `1 mail.litesrv.io` |
   | `mail` | TXT | `v=spf1 a mx include:_spf.mlsend.com ~all` |
   | `_dmarc` | TXT | `v=DMARC1; p=none; fo=1` |
   | `litesrv._domainkey` | CNAME | `litesrv._domainkey.mlsend.com` (MailerLite DKIM) |
   | `s1-ionos._domainkey` | CNAME | `s1.dkim.ionos.com` (IONOS DKIM — mail sent from info@) |
   | `s2-ionos._domainkey` | CNAME | `s2.dkim.ionos.com` (IONOS DKIM) |
   | `s42582890._domainkey` | CNAME | `s42582890.dkim.ionos.com` (IONOS DKIM) |
   | `dl3kfp3smfnz` | CNAME | `gv-m5y5v7ily377td.dv.googlehosted.com` (Google domain verification, likely Search Console) |

   Only the four apex A records and the `www` CNAME should change. Everything
   else must survive byte-for-byte; a dropped DKIM or SPF record does not break
   anything visibly, it just quietly sends the newsletter to spam.

   **What was done, 2026-09-10:**

   - Zone `bandincc.it` added (Free plan) to the Cloudflare account that holds
     the `bandincc` Pages project — an apex custom domain has to be a zone on
     the project's own account. Nameservers **`hunts.ns.cloudflare.com`** and
     **`megan.ns.cloudflare.com`**. IONOS had no DNSSEC (no DS record), so
     there was nothing to disable first.
   - **Cloudflare's scan missed four of the 18 records** — the three IONOS DKIM
     keys and the Google verification, exactly the rows public DNS had not
     shown either. Added by hand. The comparison has to be against the IONOS
     panel, never against the scan or a public lookup.
   - Every record went in as **DNS only**. The `mail` A record is MailerLite's
     and must stay that way.
   - After the nameserver switch, all 18 records were read back from `hunts`
     and `megan` directly — authoritative answers, no cache in between — and
     matched IONOS exactly.
   - **Apex:** `bandincc.it` added as a custom domain on the Pages project,
     which replaced the four GitHub A records. Served by Cloudflare,
     byte-identical to `bandincc.pages.dev`; a missing path gets a real 404
     (the export ships `404.html`, so Pages does not fall back to SPA mode) and
     a slashless path a 308 to the slashed one.
   - **www:** the `coy123.github.io` CNAME became `A www 192.0.2.1`,
     **proxied** — a placeholder that is never reached; it exists so Cloudflare
     sees the request — plus a Redirect Rule (Rules → Redirect Rules):
     `https://www.bandincc.it/*` → `https://bandincc.it/${1}`, 301, query
     string preserved. The wildcard field insists on a protocol, so the rule
     only matches https; **SSL/TLS → Edge Certificates → Always Use HTTPS** is
     on to get http there first. `www` is deliberately *not* a Pages custom
     domain: the canonical host is the apex (`metadataBase`), so `www` only ever
     redirects — the same thing GitHub did before.
   - Verified: `https://www.bandincc.it/faq/?a=1` → 301
     `https://bandincc.it/faq/?a=1`; `http://www…` → 301 to https `www`, then
     301 to the apex; `http://bandincc.it/…` → 301 to https.

   **Left: remove the custom domain in GitHub → Settings → Pages, not before
   the evening of 2026-09-12.** IONOS still answers authoritatively for the old
   zone, GitHub IPs included, and a resolver that cached the IONOS delegation
   keeps asking it for up to a day — Google's resolver was still handing out
   the GitHub A records after the apex had moved. Until then GitHub Pages is
   the live site for those visitors, which costs nothing: every deploy
   publishes the same artifact to both hosts. Leave the IONOS DNS records alone
   for the same reason.

   **Rollback**, should it ever be needed before step 5: put the four A records
   and the `www` CNAME back in Cloudflare, DNS only. Cloudflare warns that
   pointing DNS away from Pages and back causes prolonged errors, so decide
   once rather than flip-flopping.
5. **[ ] Flip the repo private**, and only then. On GitHub Free a private repo
   **unpublishes its Pages site**, so step 4 must be complete and verified
   first. Then delete the `package`/`deploy` jobs from `deploy.yml` — and
   repoint `publish-data` from `needs: deploy` to `needs: cloudflare`, or the
   KV write silently stops running with them.

   **Land that `deploy.yml` edit before the flip, not after.** Once the repo is
   private the `deploy` job fails, the run concludes `failure`, and
   `newsletter.yml` — gated on `conclusion == 'success'` — sends nothing; the
   KV write stops too. With the jobs already gone there is no such window, and
   GitHub Pages just keeps serving its last deployment on `coy123.github.io`
   until the flip unpublishes it. The order is: GitHub custom domain removed →
   `deploy.yml` edit merged and green → repo private.

   **Keep `name: Deploy to GitHub Pages`**, or change `newsletter.yml`'s
   `workflows: [...]` in the same commit. `newsletter.yml` matches the workflow
   by that exact string, so renaming it alone silently stops the newsletter.
6. **[ ] Move staging to Cloudflare Pages, then retire Netlify.** Two halves,
   in that order. Staging must keep `STRIPE_MODE=test` throughout. Keep the
   `preview-urls` job — its comment about the public run summary needs
   rewriting at step 5, not the job.

   **First half — move staging. Written 2026-09-10; not yet merged or run.**
   `netlify-deploy.yml` became `.github/workflows/staging-deploy.yml`
   ("Deploy staging to Cloudflare Pages"): the same `test` → `deploy` →
   `preview-urls` jobs and the same `stripe-mode: test`, but `deploy` runs
   `wrangler pages deploy out --project-name=bandincc --branch=staging`. That
   is a *preview* deployment of the production project — Pages decides by
   branch name, and the production branch is `master` — served at the branch
   alias `https://staging.bandincc.pages.dev`, which Cloudflare marks
   `X-Robots-Tag: noindex` by default. It reuses `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID`, so there is nothing to configure; unlike
   `deploy.yml`'s `cloudflare` job it fails loudly rather than skipping if
   either is missing, because it is staging's only host.
   `scripts/preview-embargoed.mjs`, `data/README.md`, `cypress/README.md`,
   `stripe-worker/README.md` and `CLAUDE.md` all point at the new URL.

   **The two test Payment Links still redirect to the Netlify site** —
   `https://spiffy-semifreddo-87751b.netlify.app/grazie/` on both
   (`plink_1U0JGeGZN5xaIveHulMQjs4r` monthly, `plink_1U0JHMGZN5xaIveHxHKxXfGu`
   annual; read from Stripe 2026-09-10). `stripe-worker/STATUS.md`'s 2026-08-04
   entry says they go to `www.bandincc.it/grazie/`; that was wrong, and is now
   marked as such. They were deliberately **not** repointed yet:
   `staging.bandincc.pages.dev` answers 404 until the first Cloudflare staging
   deploy, while the Netlify `/grazie/` still answers 200, so switching early
   would land every test checkout on a 404. The welcome email links the
   production site and needs nothing.

   **Verify on the first push to `staging`:**
   - the run is green, and its summary shows the "Staging deployed" link and
     the embargoed-bandi list;
   - `https://staging.bandincc.pages.dev/abbonamento/` shows the amber
     "ambiente di prova" banner — the proof that the `test` build shipped, not
     a production artifact;
   - `curl -sI https://staging.bandincc.pages.dev/` carries
     `x-robots-tag: noindex`;
   - `bandincc.it` is untouched: the Pages dashboard's Production deployment is
     still the last `master` one;
   - if the page asks for a Cloudflare login, an Access policy is on for the
     project's previews. Decide then whether the colleague needs an Access
     identity, or whether previews should be public, as Netlify staging was.

   **Then repoint the two test Payment Links** — Stripe Dashboard in test
   mode → Payment Links → each link → Edit → After payment → Redirect →
   `https://staging.bandincc.pages.dev/grazie/` (trailing slash). Run one test
   checkout from `https://staging.bandincc.pages.dev/abbonamento/` and confirm
   it lands on the staging `/grazie/`. Neither Stripe key reachable from the
   dev machine can write Payment Links (both lack `payment_links_write`), so
   this is a Dashboard job.

   **[ ] Second half — retire Netlify. Later, once the first half is
   verified.** Removing the workflow stops new deploys; it does not take the
   old site down. Until this is done `spiffy-semifreddo-87751b.netlify.app`
   stays public, serving the last build it received, and that build goes stale
   with the first Cloudflare staging deploy. In order:
   0. **Check the test Payment Links no longer point at Netlify** (above).
      Deleting the site first strands every test checkout on a dead host.
   1. Netlify → the site → Site configuration → Build & deploy: check whether
      it is linked to the repo. If it is, it has been building `staging` on its
      own — the only thing `netlify.toml` was ever for — and may still be.
      Deleting the site ends that too.
   2. Delete the site in Netlify. This is what takes the URL down.
   3. Delete `netlify.toml` from the repo — not before step 2, since a linked
      site would then build without it.
   4. Remove the `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` repository secrets,
      and revoke that personal access token in Netlify.
   5. Close the Netlify account if nothing else lives on it.
   6. Drop the remaining current-state Netlify mentions: the `netlify.toml`
      bullet and the two "Netlify site still up" notes in `CLAUDE.md`, the
      header comment in `staging-deploy.yml`, and the "old address" paragraph
      in `data/README.md`. Dated history in `stripe-worker/STATUS.md` stays as
      it is.
7. **[ ] Documentation sweep.** `CLAUDE.md` (CI/CD, "The welcome email",
   hosting), `stripe-worker/README.md`, `data/README.md`, and the
   public-repo caveats that will no longer be true. The staging half —
   every Netlify URL and `netlify-deploy.yml` reference — was already swept
   with step 6 on 2026-09-10.

### Notes

- **Two Cloudflare settings** are needed in the repo: `CLOUDFLARE_API_TOKEN`
  as a *secret* (scoped to Pages:Edit + Workers KV Storage:Edit, nothing more)
  and `CLOUDFLARE_ACCOUNT_ID` as a *variable* —
  `6575c0665b08ee893a387025144de696`, an identifier rather than a credential,
  and both the `cloudflare` and `publish-data` jobs are gated on it being set.
- **Actions minutes are account-wide**, not per repo. Watch the total once
  Germany and banditaxi.it exist, not this repo alone.
- **`retention-days: 1` was already set** on the `out/` artifact; only the
  failure-only Cypress screenshots keep 7 days, which is negligible.
- The Pages site stays publicly visible either way — going private hides the
  source and the history, never the deployed HTML. The build-time embargo split
  is still what keeps withheld rows out of the export.
- **`*.pages.dev` hung from the dev machine's ISP on 2026-09-06.** DNS
  resolved and the Cloudflare IPs were right, but 80 and 443 both hung — even
  with curl pinned straight to those IPs, so it was not a resolver problem.
  **On 2026-09-10 it answered normally** from the same machine (200 in about
  0.1s), and so does `bandincc.it` through the Cloudflare proxy. The cause was
  never found. If it recurs, verify in a browser or with
  `wrangler pages deployment list --project-name=bandincc`.
- **MailerLite paid is done (2026-09-07)** — the other half of this budget.
  Hosting came in at €0, so the whole €10–20 went to it, and the "sent by
  MailerLite" banner is gone from what paying subscribers receive. No repo
  change was needed or made; keep `{$unsubscribe}` in both email shells.

---

## Sell the book as a PDF, direct from the site

Amazon delisted the book as AI-generated after it had already sold copies.
Decision: **stop renting a shopfront and sell the PDF ourselves.** No commission,
no marketplace AI policy to be judged by, and it becomes a second product next
to the newsletter for an audience that is already exactly the buyer. Worth one
email to KDP first — their policy separates *AI-assisted* (allowed, disclosable)
from *AI-generated* (not) — but the appeal is not the plan, this is. Re-listing
on Kobo / Google Play / Apple would face the same policy, so those are out for
the same reason.

Most of the infrastructure exists: the Stripe account, the `bandincc-stripe`
Worker with a `checkout.session.completed` handler, and the OSS registration.
What is missing is file hosting and the delivery branch.

- [ ] **Settle VAT before taking a single euro.** We are already registered and
      collecting nothing (see the urgent section) — a second product makes that
      worse, not neutral. E-books get Italy's reduced rate, generally
      conditional on an ISBN; the PDF has none today. Question for the
      commercialista: reduced rate or standard 22%, and does selling direct
      change the answer.
- [ ] **One-time Stripe Payment Link** for the book, live + test, both URLs in
      `locales/it.json` alongside the subscription links so `stripeHref()` and
      the placeholder guard cover it the same way.
- [ ] **R2 bucket, private**, holding the PDF. Bind it to the Worker. No public
      URL — the Worker is the only thing that can hand out access.
- [ ] **Delivery branch in the Worker.** Branch on the price ID: subscription →
      existing MailerLite group; book → email a signed, time-limited download
      link (24h). Both modes, so `bandincc-stripe-test` needs the binding and
      the secrets too — named environments inherit nothing.
- [ ] **Stamp the buyer's email into the PDF footer** on generation. Stops
      casual resharing; nothing stronger is worth the effort.
- [ ] **A page to sell it from.** Own route (`/libro/`?) plus a CTA on
      `/how-to-become-driver/` — that page is the closest match to the book's
      subject and already takes 373 visitors a month.
- [ ] **`/grazie/` handles two purchase types.** It is the redirect target for
      both Payment Links and currently only talks about the newsletter. Static
      export cannot read the Stripe session, so either a second thank-you route
      or copy that covers both cases.
- [ ] **Cypress cover** for the new links, mirroring `subscription.cy.ts`:
      placeholder state now, live contract the moment real URLs land.

**Notes.** Payhip or Lemon Squeezy as a second shopfront costs nothing and
handles VAT as merchant of record — worth adding once the direct route works,
not instead of it. StreetLib / Youcanprint (both Italian) would put it on
laFeltrinelli, IBS and Mondadori Store: reach, not margin, so revisit if direct
sales are thin. The three `NewsletterAd` slots are the obvious cross-sell
surface; a book variant is a small change to a component that already exists.

---

## Reference — other bandi verticals

Pattern: a small operator needs a scarce, municipally-granted authorisation;
the comune publishes a bando with a short deadline on its own site; missing it
costs a year. Ranked by: does the comune publish it (does our crawler already
see it), how often, will the audience pay.

| Vertical | What it is | Publisher | Volume | Verdict |
|---|---|---|---|---|
| Taxi | Municipal taxi licences, same law as NCC | Comune ✅ | High | Doing it (as a separate site) |
| Posteggi ambulanti / mercati | Market and fair pitches, reassigned on multi-year cycles | Comune ✅ | High | Best standalone candidate |
| Concessioni balneari | Beach concessions, Bolkestein tendering | Comune ✅ | Low, unpredictable | High value, bad timing |
| Farmacie | Pharmacy licences (`sedi farmaceutiche`) | **Region** ❌ | Very low | Wrong publisher, wrong cadence |
| Edicole | Newsstand authorisations | Comune ✅ | Moderate | Dying trade, won't pay |
| Concorsi pubblici comunali | Municipal jobs | Comune + INPA ✅ | Enormous | Crowded, no differentiation |
| Alloggi ERP | Public housing | Comune ✅ | High | Audience cannot pay |

The crawler is not an NCC tool — it is an Italian municipal-notice monitor over
~7,900 homepages. NCC is one keyword file on top of it, so a second vertical is
a keyword set plus a copy of the site.

**Farmacie**: pharmacies are *numerus clausus* (capped by population quota), so a
sede is worth hundreds of thousands and a pharmacist would pay far more than
€5.90. But the concorsi are run by **regions**, not comuni — a new crawler, not a
new keyword — and happen every few years, so there is nothing to subscribe to in
between. High value, wrong shape.

---

## Shipped — locked rows (~23 Aug)

The whole plan is built and live; the checklist is deleted. What is worth
keeping is why it worked and what is still tunable.

Before it shipped, 91% of 16,600 monthly visitors hit the homepage and only 124
(0.75%) ever reached `/abbonamento` — but 1.6% of those who did subscribed. The
offer converted; almost nobody saw it. A locked row is a CTA at the exact moment
of demand, on the homepage, and it removes the substitute behaviour: checking
the site every 2-3 days used to be strictly better than paying, and now it
proves there is something you are missing.

Data behind the numbers (measured 2026-08, from `data/data.json` + git history):
new bandi ~11/month; **median runway 18 days** to deadline when a bando lands;
35% arrive with ≤14 days left, 10% with ≤7. The large expired archive stays
free — 10 months of history is what makes the site credible.

Still open, both one-line changes:

- **7 days is a starting number, not a fixed one.** On an 18-day median it
  removes ~39% of the free window, and for the 10% arriving with ≤7 days the
  free user sees them after the deadline. Watch for complaints; **5 days is the
  fallback**.
- **Embargoed detail pages carry `robots: noindex, nofollow`** and stay out of
  the sitemap, reversing the original decision — indexing them would let Google
  surface exactly what the embargo holds back. Flip it by deleting one line in
  `app/bandi/[bid]/page.tsx` if the SEO argument ever wins.

Mechanics of the rule itself are documented in `CLAUDE.md` → "The seven-day
release delay"; do not re-derive them here.

---

## TODO

| Description | Deadline | Who |
|---|---|---|
| File and pay the 2026-Q3 OSS return | 31.10.2026 | Can |
| Update finance Google Sheet | 08.09.2026 | Can |
| Germany: automation start | 20.09.2026 | Can |
| Research + implement paid service improvements — *MailerLite paid done 07.09.2026; GitHub stays Free; hosting: step 4 (DNS) done 10.09.2026 bar the GitHub custom-domain removal (from 12.09); staging moved to a Cloudflare preview 10.09.2026 (unmerged, first run unverified); Netlify retirement, steps 5 and 7 left* | 20.09.2026 | Can |
| Questionnaire | 30.09.2026 | Davide |
| Germany law/market research | 30.09.2026 | Davide |
| Research company location country for tax | 30.09.2026 | Davide |
| Research company shape + founder contract | 30.09.2026 | Davide |
| Research other bandi | 30.09.2026 | Davide |
| Market research on affiliate business and monetisation | 30.09.2026 | Davide |
| Configure Keliweb login | 30.09.2026 | Davide |
| Implement regional filter tab *(region level done 06.09.2026; per-province deferred by decision)* | 30.09.2026 | Can |
| Research bandi predictor | 30.10.2026 | Can |
| Implement banditaxi.it | 30.10.2026 | Can |
| Review and correct banditaxi.it | when Can's first version is ready | Davide |
| Book: Amazon decision → self-publish if delisted | 21.09.2026 | Can + Davide |

Davide starts BandiNCC work on **21.09.2026** (after the wedding).
