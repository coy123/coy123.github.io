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
#: 4
Action: Update the sitemap
Why: Add all 9 pages including /about-us, /contact, /income-calculator, and the new privacy/cookie pages.

High Impact (Content Depth)

#: 5
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
#: 7
Action: Create individual bid detail pages
Why: Instead of just linking to external URLs, create /bandi/[municipality] pages with context about each
municipality,
historical bids, local regulations, and the link to the official source. This massively increases unique page count.
────────────────────────────────────────
#: 8
Action: Expand the Regional Laws page
Why: Currently it's just 12 links to PDFs. Add summaries/explanations of each regional law, key differences between
regions, and practical implications for drivers.

Medium Impact (User Experience & SEO)

#: 9
Action: Add a "Last Updated" date visible on the homepage
Why: Shows Google the content is actively maintained.
────────────────────────────────────────
#: 10
Action: Improve internal linking
Why: Cross-link between pages (e.g., FAQ answers linking to the guide, guide linking to the calculator). Google
rewards
sites with good internal link structure.
────────────────────────────────────────
#: 11
Action: Add structured data (Schema.org) to more pages
Why: Currently only the homepage has JSON-LD. Add FAQ schema to /faq, HowTo schema to /how-to-become-driver, Article
schema to blog posts.
────────────────────────────────────────
#: 12
Action: Move Disclaimer out of main navigation
Why: Put it in the footer instead. Main nav should highlight valuable content pages. Replace with Blog or a more
content-rich page.
────────────────────────────────────────
#: 13
Action: Add author attribution
Why: Blog posts and guides should have author names/bios. Google's E-E-A-T (Experience, Expertise, Authoritativeness,
Trustworthiness) guidelines value this.

Nice-to-Have (Polish)

#: 14
Action: Add user testimonials or success stories
Why: Original content showing real value the site provides.
────────────────────────────────────────
#: 15
Action: Create a glossary page (/glossario)
Why: Define NCC-specific terms. Adds keyword-rich content.
────────────────────────────────────────
#: 16
Action: Add a "How to Use This Site" guide
Why: Helps with both UX and content depth.
────────────────────────────────────────
#: 17
Action: Improve meta descriptions
Why: Some are generic. Make each unique and compelling (150-160 chars).

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