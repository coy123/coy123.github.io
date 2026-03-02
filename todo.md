Why AdSense Rejected: "Low Value Content"

Google's "low value content" rejection typically means the site doesn't have enough original, text-rich editorial
content to justify placing ads. While your site has good structure and useful tools, here's what's likely triggering
the rejection:

Core Issues

1. The main page is primarily a data table/map — Google sees this as a thin data aggregation page, not original
   content. There's minimal explanatory text around it.
2. No Privacy Policy page — Referenced in the disclaimer and cookie banner but there's no dedicated /privacy-policy
   route. This is a hard requirement for AdSense.
3. Several pages are very thin — The Contact page is just an email address. The About Us page is ~5 short paragraphs.
   The Disclaimer is boilerplate legal text.
4. No blog or regularly updated editorial content — Google strongly favors sites with fresh, original articles. The
   site is mostly static/tool-based.
5. Sitemap is incomplete — Missing /about-us, /contact, and /income-calculator from the sitemap.

  ---
Actionable Improvements (Priority Order)

Must-Do (AdSense Requirements)

#: 1 ✅ FINISHED
Action: Add a dedicated Privacy Policy page (/privacy-policy)
Why: Hard requirement for AdSense. Must detail data collection, cookies, analytics (Umami), and AdSense data usage.
Done: Created /app/privacy-policy/page.tsx with 12 sections covering data controller, data types, cookies, Umami, AdSense, GDPR rights, etc. Added translations to it.json. Added link in footer and cookie banner.
────────────────────────────────────────
#: 2 ✅ FINISHED
Action: Add a Cookie Policy page (/cookie-policy)
Why: Currently only handleds by a banner component. Needs a full page, especially with AdSense cookies.
Done: Created /app/cookie-policy/page.tsx with 9 sections covering cookie types, technical cookies, Umami, AdSense cookies, third-party cookies, cookie management, and legal basis. Added translations to it.json. Added link in footer and cookie banner.
────────────────────────────────────────
#: 3 ✅ FINISHED
Action: Expand the About Us page
Why: Add team credibility, methodology for data collection, how often data is updated, your mission in more depth.
Google wants to know who is behind the site.
Done: Restructured page with 5 sections: Il Nostro Team (generic team description, founding story), La Nostra Missione (4 pillars: accessibility, equal opportunity, transparency, timeliness), Come Raccogliamo i Dati (automated monitoring + manual verification), Il Nostro Impegno (daily updates, free service, ongoing improvements), Contattaci.
────────────────────────────────────────
#: 4 ✅ FINISHED
Action: Update the sitemap
Why: Add all 9 pages including /about-us, /contact, /income-calculator, and the new privacy/cookie pages.
Done: Updated sitemap.xml from 6 URLs to 50 URLs. Added missing static pages: /about-us, /contact, /income-calculator, /privacy-policy, /cookie-policy. Added all 39 individual /bandi/ detail pages. Set appropriate changefreq and priority for each (legal pages yearly/0.3, content pages monthly/0.6-0.8, homepage weekly/1.0).

High Impact (Content Depth)

#: 5 NOT FINISHED
Action: Add a blog/news section (/blog)
Why: Publish original articles like "New NCC bids in Lombardia - February 2025", "How NCC regulations changed in
2025",
market analysis, etc. Even 5-10 articles would help significantly.
NOT FINISHED: Davide check this, how realistic is it?
────────────────────────────────────────
#: 6 ✅ FINISHED
Action: Add more descriptive content to the homepage
Why: Below the table/map, add sections explaining what NCC bids are, why they matter, how to use the site, recent
trends in license availability, etc.
Done: Added 4 content sections below the table/map: "Cosa sono i Bandi NCC?", "Perché i Bandi NCC sono Importanti?", "Come Usare Questa Piattaforma", "Tendenze del Settore NCC in Italia". Added links from the top of the page to the info below.
────────────────────────────────────────
#: 7 ✅ FINISHED
Action: Create individual bid detail pages
Why: Instead of just linking to external URLs, create /bandi/[municipality] pages with context about each
municipality,
historical bids, local regulations, and the link to the official source. This massively increases unique page count.
Done: Created dynamic /bandi/[slug] page with bid details card, mini map, law link (if match in laws.json), "Cos'è un bando NCC?" and "Come partecipare" sections. Table locations now link to detail pages.
────────────────────────────────────────
#: 8 SKIPPED
Action: Expand the Regional Laws page
Why: Currently it's just 12 links to PDFs. Add summaries/explanations of each regional law, key differences between
regions, and practical implications for drivers.
SKIPPED, davide check this.

Medium Impact (User Experience & SEO)

#: 9 ✅ FINISHED
Action: Add a "Last Updated" date visible on the homepage
Why: Shows Google the content is actively maintained.
Done: Added "Ultimo aggiornamento: [date]" above the table, using server-side Date.now() so it reflects deployment date.
────────────────────────────────────────
#: 10 ✅ FINISHED
Action: Improve internal linking
Why: Cross-link between pages (e.g., FAQ answers linking to the guide, guide linking to the calculator). Google
rewards
sites with good internal link structure.
Done: Added internal links across all pages: Homepage sections link to guide/FAQ/regional laws. FAQ answers link to bandi list, regional laws, calculator, guide, and utilities. How to Become Driver has "Risorse utili" box linking to bandi/laws/calculator/FAQ. Income Calculator links to bandi/guide/FAQ. Bid detail pages link to guide/laws/calculator and back to bandi list. About Us links to bandi/utilities/calculator.
────────────────────────────────────────
#: 11 ✅ FINISHED
Action: Add structured data (Schema.org) to more pages
Why: Currently only the homepage has JSON-LD. Add FAQ schema to /faq, HowTo schema to /how-to-become-driver, Article
schema to blog posts.
Done: Added JSON-LD structured data to all pages: WebSite schema in root layout, FAQPage schema on /faq (includes all FAQ + glossary terms for rich results), Article schema on /how-to-become-driver and /utilities, AboutPage+Organization on /about-us, ContactPage on /contact, WebPage on /regional-laws, WebApplication on /income-calculator, GovernmentService on /bandi/[slug] with geo coordinates.
────────────────────────────────────────
#: 12 ✅ FINISHED
Action: Move Disclaimer out of main navigation
Why: Put it in the footer instead. Main nav should highlight valuable content pages. Replace with Blog or a more
content-rich page.
────────────────────────────────────────
#: 13 ✅ FINISHED
Action: Add author attribution
Why: Blog posts and guides should have author names/bios. Google's E-E-A-T (Experience, Expertise, Authoritativeness,
Trustworthiness) guidelines value this.
Done: Created reusable AuthorBox component ("La Redazione di BandiNCC" + bio + link to About Us). Added to /how-to-become-driver, /bandi/[slug], /faq, and /utilities pages.

Nice-to-Have (Polish)

#: 14 SKIPPED
Action: Add user testimonials or success stories
Why: Original content showing real value the site provides.
────────────────────────────────────────
#: 15 ✅ FINISHED
Action: Create a glossary page (/glossario)
Why: Define NCC-specific terms. Adds keyword-rich content.
Done: Added glossary section to the FAQ page with 14 NCC-specific terms (NCC, Licenza, Bando, CAP, CQC, Rimessa, Foglio di Servizio, etc.) using the same accordion component. Removed standalone /glossario page in favor of integrating it into /faq for better content density. Updated FAQ page title/subtitle/description/meta to reflect glossary inclusion. Added pill-style anchor links ("Domande Frequenti" / "Glossario NCC") at the top of the page. Updated nav label to "FAQ e Glossario". Updated links from homepage, how-to-become-driver, and income-calculator to mention glossary.
────────────────────────────────────────
#: 16 ✅ FINISHED
Action: Add a "How to Use This Site" guide
Why: Helps with both UX and content depth.
Done: Already covered by the "Come Usare Questa Piattaforma" section on the homepage (added in #6).
────────────────────────────────────────
#: 17 ✅ FINISHED
Action: Improve meta descriptions
Why: Some are generic. Make each unique and compelling (150-160 chars).
Done: Rewrote meta descriptions for all pages to be unique, keyword-rich and ~150 chars: Home, Layout default, How-to-become-driver, Utilities, Disclaimer, About Us, Regional Laws, Contact. Added missing metadata for Income Calculator via layout.tsx. FAQ was already updated in #15.

  ---
Recommended Strategy

The fastest path to AdSense approval:

1. Add Privacy Policy + Cookie Policy pages (mandatory)
2. Create 5-10 blog articles about NCC topics (biggest impact)
3. Create individual municipality pages from your existing data
4. Expand existing thin pages (About, Regional Laws, Homepage text)
5. Fix sitemap + add structured data
6. Wait 2-3 weeks, then resubmit

The blog and individual municipality pages are the biggest wins — they turn your ~9-page site into potentially 50+
pages of unique, useful content, which is what Google wants to see before serving ads.


###########

###############

HERE IS WHAT AI THINKS OF GOOGLE ADSENSE REJECTING 

######################

What's Still Missing (from the original list)

- #5 - Blog/news section: This is the single biggest gap. Google sees your site as a data tool, not a content site. A
  blog is what transforms it.
- #8 - Expand Regional Laws: Still just a list of links to PDFs — thin page.
- #14 - Testimonials: Skipped.

Why They're Probably Still Rejecting

Even with all your improvements, the core problem remains: your site is fundamentally a data aggregation tool. Google
is harsh on these because they see it as "scraping data from government sources and wrapping it in a UI." Here's
what's likely still triggering the rejection:

1. The 39 bandi detail pages are templated — they all follow the same structure with swapped data. Google sees this as
   programmatic/auto-generated content, not "original" content.
2. No blog = no editorial voice — This is the #1 thing that separates "tool sites" from "content sites" in Google's
   eyes. Even 5 short articles would help enormously.
3. The regional laws page is still just links — It's essentially a bookmark list.
4. Content-to-functionality ratio — Most of your "content" is inside interactive elements (table, map, calculator).
   Google's crawler may not fully render/value JS-heavy interactive content.

What I'd Actually Do

Tier 1 — Do these first:
- Add 5-8 blog posts (even short 400-600 word ones). Topics: "Nuovi bandi NCC Febbraio 2026", "Come funziona il bando
  NCC a Milano", "Differenze tra NCC e Taxi", "Quanto costa una licenza NCC nel 2026". This is the single highest-impact
  change.
- Expand Regional Laws — Add a 2-3 sentence summary for each region's law. What does it cover, key differences,
  practical implications.

Tier 2 — Sneaky but effective:
- Add a "Guida Completa" long-form page (~1500-2000 words) — a comprehensive guide to NCC licensing in Italy. Google
  loves cornerstone content.
- Make bandi detail pages more unique — Add municipality-specific context (population, region description, local
  transport info) pulled from a static dataset. Make each page feel less templated.
- Add a "Statistiche" or "Report" page — Aggregate your data into insights: "X bandi aperti in Italia", "Regioni con
  più opportunità", trends over time. Original analysis from your data = original content.

Tier 3 — Worth trying:
- Resubmit from a different AdSense account (if possible) — sometimes accounts get flagged
- Wait longer between resubmissions — Google needs time to re-crawl. At least 2-3 weeks after changes.
- Make sure Google Search Console shows all pages indexed — If the bandi pages aren't indexed, Google doesn't know
  they exist when reviewing.
- Add a "Risorse" or "Link Utili" page with curated external resources + your commentary on each

The Blunt Truth

The blog is the make-or-break item. Everything else you've done is good housekeeping, but without original editorial
content, Google will keep seeing this as a thin data wrapper. Even AI-assisted articles (that you review and
personalize) would work — they just need to demonstrate expertise and provide value beyond the raw data.

##########

###############

HERE IS WHAT IT SAYS ABOUT MONETISATION

#####################

Yeah, absolutely. AdSense is honestly one of the worst options for a niche site like yours anyway — the CPM is
terrible for small Italian sites. Here are realistic alternatives:

Best Fit for Your Site

1. Affiliate Marketing
   Your audience is people trying to get NCC licenses. They need:
- Insurance (RCA per NCC) — insurance companies have affiliate programs with solid commissions
- Vehicle leasing/purchasing — NCC drivers need specific vehicles, dealerships or platforms like Brumbrum/Autoscout24
  have affiliate programs
- Accounting/fiscal services — opening a P.IVA, Fiscozen or similar have referral programs (~€25-50 per lead)
- PEC/firma digitale providers — Aruba, Register, etc. Required for bandi applications
- Driving school courses (CQC/CAP) — partner with schools that offer NCC-specific training

This is by far the most natural fit. Your users literally need these services.

2. Direct Advertising / Sponsored Listings
   Sell ad space directly to:
- Driving schools that offer CQC courses
- NCC fleet management companies
- Vehicle rental companies targeting NCC drivers
- Consultants who help with bandi applications

Even €50-100/month from a couple of local businesses adds up. A simple "Spazio pubblicitario" banner slot is easy to
implement.

3. Lead Generation
   This is the real money. Instead of showing ads, collect leads and sell them:
- "Vuoi assistenza per partecipare a questo bando?" → collect name/email/phone → sell the lead to consultants or
  agencies that handle NCC applications (€5-20 per lead)
- "Richiedi un preventivo assicurazione NCC" → sell to insurance brokers

4. Premium / Gated Features
- Email alerts — "Ricevi una notifica quando esce un nuovo bando nella tua regione" — free tier gets weekly digest,
  paid tier (€3-5/month) gets instant notifications
- Export data — Let people download filtered bandi lists as PDF/Excel for a small fee
- Bandi scaduti / storico — Archive of past bids behind a paywall for market research

5. Donations / Support
   Simple but works for niche utility sites:
- Buy Me a Coffee / Ko-fi button
- "Questo sito è gratuito. Supportaci con un caffè"
- Low effort, low return, but non-zero

What I'd Recommend

If I were you, I'd go with this combo:

1. Affiliate links for PEC, firma digitale, Fiscozen, insurance → embed naturally into your guide/how-to pages
   (easiest to start, passive income)
2. Email alert system with a free/paid tier → builds an audience AND monetizes (recurring revenue)
3. Lead gen form on bandi detail pages → "Hai bisogno di aiuto?" → sell leads to consultants

These all align with your users' actual needs, don't require AdSense approval, and some of them (affiliates
especially) can make significantly more than display ads on a niche site.