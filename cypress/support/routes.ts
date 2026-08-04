import { t } from './site'

export const TITLE_SUFFIX = 'Bandi NCC Italia'

export interface RouteSpec {
  /** Path without trailing slash (added by `cy.visitPage`). */
  path: string
  /** Full document title, including the `%s | Bandi NCC Italia` template. */
  title: string
  /** Exact `<meta name="description">` content. */
  description: string
  /** Expected text of the single `<h1>`. */
  h1: string
  /** Expected text of the hero `<h2>`, when the page has one. */
  h2?: string
  /** JSON-LD `@type`s expected on the page, on top of the layout's WebSite. */
  schemas: string[]
  /** Key in `t.nav` when the route is reachable from the main navigation. */
  navKey?: keyof typeof t.nav
}

export const ROUTES: RouteSpec[] = [
  {
    path: '/',
    // The home page is the root segment's own page, so `title.template` does
    // not apply to it; it falls through to the layout's `title.default`.
    title: `${TITLE_SUFFIX} | Licenze Noleggio Con Conducente`,
    description:
      'Consulta tutti i bandi NCC attivi in Italia: licenze disponibili, scadenze e link ufficiali aggiornati ogni giorno, comune per comune.',
    h1: t.pages.home.title,
    h2: t.pages.home.subtitle,
    schemas: ['Dataset'],
    navKey: 'home',
  },
  {
    path: '/how-to-become-driver',
    title: `Come Diventare Autista NCC | ${TITLE_SUFFIX}`,
    description:
      'Guida passo passo per diventare autista NCC: requisiti, esame CQC, iscrizione al ruolo conducenti, costi e tempi per ottenere la licenza.',
    h1: t.pages.howToBecomeDriver.title,
    h2: t.pages.howToBecomeDriver.subtitle,
    schemas: ['Article'],
    navKey: 'howToBecomeDriver',
  },
  {
    path: '/regional-laws',
    title: `Normative Regionali | ${TITLE_SUFFIX}`,
    description:
      'Leggi regionali NCC in Italia: normative, regolamenti e delibere di ogni regione sul Noleggio Con Conducente con link ai testi ufficiali.',
    h1: t.pages.regionalLaws.title,
    h2: t.pages.regionalLaws.subtitle,
    schemas: ['WebPage'],
    navKey: 'regionalLaws',
  },
  {
    path: '/utilities',
    title: `Strumenti Utili | ${TITLE_SUFFIX}`,
    description:
      'Strumenti essenziali per autisti NCC: app di navigazione, gestione prenotazioni, contabilità e risorse per avviare e gestire la tua attività.',
    h1: t.pages.utilities.title,
    h2: t.pages.utilities.subtitle,
    schemas: ['Article'],
    navKey: 'utilities',
  },
  {
    path: '/income-calculator',
    title: `Calcolatore Guadagni NCC | ${TITLE_SUFFIX}`,
    description:
      'Calcola quanto puoi guadagnare come autista NCC: stima personalizzata in base a ore, città, tipo di servizio e costi di gestione del veicolo.',
    h1: t.pages.incomeCalculator.title,
    h2: t.pages.incomeCalculator.subtitle,
    schemas: ['WebApplication'],
    navKey: 'incomeCalculator',
  },
  {
    path: '/faq',
    title: `FAQ e Glossario NCC | ${TITLE_SUFFIX}`,
    description:
      'Domande frequenti e glossario dei termini NCC: risposte pratiche su licenze, bandi, requisiti e definizioni di sigle e concetti chiave del settore.',
    h1: t.pages.faq.title,
    h2: t.pages.faq.subtitle,
    schemas: ['FAQPage'],
    navKey: 'faq',
  },
  {
    path: '/about-us',
    title: `Chi Siamo | ${TITLE_SUFFIX}`,
    description:
      'Chi siamo, la nostra missione e come raccogliamo i dati sui bandi NCC. Contattaci a info@bandincc.it per segnalazioni, domande e collaborazioni.',
    h1: t.pages.aboutUs.title,
    h2: t.pages.aboutUs.subtitle,
    schemas: ['AboutPage'],
    navKey: 'aboutUs',
  },
  {
    path: '/abbonamento',
    title: `${t.pages.abbonamento.metaTitle} | ${TITLE_SUFFIX}`,
    description: t.pages.abbonamento.metaDescription,
    h1: t.pages.abbonamento.title,
    h2: t.pages.abbonamento.subtitle,
    schemas: ['Product'],
  },
  // /grazie is deliberately absent, like /contact below: it is the Stripe
  // Payment Link redirect target, `noindex` on purpose, so it fails the
  // indexing invariant every entry here is held to. See `subscription.cy.ts`.
  // /contact is deliberately absent: it is no longer a content page but a
  // noindex stub redirecting to /about-us/#contatti, so it fails the indexing
  // and metadata invariants every entry here is held to. See
  // `cypress/e2e/contact-redirect.cy.ts`.
  {
    path: '/privacy-policy',
    title: `${t.pages.privacyPolicy.metaTitle} | ${TITLE_SUFFIX}`,
    description: t.pages.privacyPolicy.metaDescription,
    h1: t.pages.privacyPolicy.title,
    h2: t.pages.privacyPolicy.subtitle,
    schemas: [],
  },
  {
    path: '/cookie-policy',
    title: `${t.pages.cookiePolicy.metaTitle} | ${TITLE_SUFFIX}`,
    description: t.pages.cookiePolicy.metaDescription,
    h1: t.pages.cookiePolicy.title,
    h2: t.pages.cookiePolicy.subtitle,
    schemas: [],
  },
  {
    path: '/disclaimer',
    title: `Disclaimer | ${TITLE_SUFFIX}`,
    description:
      'Disclaimer e note legali del sito BandiNCC.it: limitazioni di responsabilità, fonti dei dati e condizioni di utilizzo della piattaforma.',
    h1: t.pages.disclaimer.title,
    h2: t.pages.disclaimer.subtitle,
    schemas: [],
  },
]

/** Every destination reachable from the main navigation, in bar order. */
export const NAV_ITEMS: { path: string; key: keyof typeof t.nav }[] = [
  { path: '/', key: 'home' },
  { path: '/how-to-become-driver', key: 'howToBecomeDriver' },
  { path: '/regional-laws', key: 'regionalLaws' },
  { path: '/utilities', key: 'utilities' },
  { path: '/income-calculator', key: 'incomeCalculator' },
  { path: '/faq', key: 'faq' },
  { path: '/about-us', key: 'aboutUs' },
]

/**
 * The labelled links in `components/Navigation.tsx`. Home is absent by design:
 * the crest carries it — as the highlighted first item of the desktop bar, and
 * as the logo in the mobile header — so it is no longer a labelled entry in
 * either the bar or the drawer.
 */
export const NAV_LABELLED_ITEMS = NAV_ITEMS.filter((item) => item.path !== '/')

/** Links rendered by `components/Footer.tsx`. */
export const FOOTER_LINKS: { path: string; label: string; hash?: string }[] = [
  // The subscription page is reachable from the footer and the home-page CTA
  // only: it is not in the main nav, whose desktop bar has no room for another
  // label. Order here must match `components/Footer.tsx`.
  { path: '/abbonamento', label: t.footer.links.abbonamento },
  { path: '/privacy-policy', label: t.footer.links.privacyPolicy },
  { path: '/cookie-policy', label: t.footer.links.cookiePolicy },
  { path: '/disclaimer', label: t.footer.links.disclaimer },
  // Contatti is a section of Chi Siamo rather than a page of its own.
  { path: '/about-us', label: t.footer.links.contact, hash: '#contatti' },
]

export const routeByPath = (path: string): RouteSpec => {
  const route = ROUTES.find((candidate) => candidate.path === path)
  if (!route) throw new Error(`No RouteSpec registered for "${path}"`)
  return route
}
