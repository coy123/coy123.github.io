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

Want me to start implementing any of these?