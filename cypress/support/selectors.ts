/**
 * The app ships no `data-testid` attributes, so selectors are anchored on the
 * structural Tailwind classes that define each widget. Keeping them in one
 * place means a class rename breaks one file, not fifteen.
 *
 * Note the double escaping: `sm:hidden` in the DOM is `.sm\:hidden` in CSS,
 * which is `'.sm\\:hidden'` in a TypeScript string literal.
 */
export const sel = {
  /* Navigation --------------------------------------------------------- */
  desktopNav: 'nav.hidden.md\\:block',
  // The crest is the home link and sits outside the labelled-item group, so
  // `desktopNavLinks` still means exactly the labelled entries.
  desktopNavLinks: 'nav.hidden.md\\:block div.flex.space-x-1',
  desktopNavBrand: 'nav.hidden.md\\:block div.h-16 > a[href="/"]',
  mobileHeaderBrand: 'div.md\\:hidden.sticky a[href="/"]',
  mobileHeader: 'div.md\\:hidden.sticky',
  mobileMenuButton: 'div.md\\:hidden.sticky button',
  mobileMenu: 'div.md\\:hidden.w-64',
  mobileMenuBackdrop: 'div.md\\:hidden.fixed.inset-0',
  mobileCalculatorShortcut: 'div.md\\:hidden.sticky a[href^="/income-calculator"]',

  /* Home dashboard ----------------------------------------------------- */
  mobileTabBar: 'div.sm\\:hidden.mb-2',
  desktopTabBar: 'div.hidden.sm\\:block.mb-4',
  searchInput: 'input[placeholder="Cerca località"]',
  anchorPills: 'a[href^="#section-"]',

  /* Tables (bids + laws share the same row shell) ----------------------- */
  tableRow: 'div[class*="min-h-[4.5rem]"]',
  bidLink: 'a[href^="/bandi/"]',
  crestImage: 'img[alt^="Comune "]',

  /* Leaflet ------------------------------------------------------------ */
  map: '.leaflet-container',
  mapMarker: 'path.leaflet-interactive',
  mapPopup: '.leaflet-popup',
  mapPopupClose: '.leaflet-popup-close-button',
  mapZoomIn: '.leaflet-control-zoom-in',
  mapZoomOut: '.leaflet-control-zoom-out',

  /* FAQ ---------------------------------------------------------------- */
  accordion: 'div.bg-gray-800.rounded-lg.border-2',
  accordionButton: 'button',
  accordionPanel: 'div[class*="grid-rows-"]',

  /* Cookie banner ------------------------------------------------------ */
  cookieBanner: 'div.fixed.bottom-0.border-t',
  cookieModal: 'div.fixed.z-\\[60\\]',

  /* Income calculator -------------------------------------------------- */
  calculatorForm: 'form',
  calculatorModal: 'div.animate-scaleIn',
  calculatorBackdrop: 'div.animate-fadeIn > div.absolute.inset-0',

  /* Shared ------------------------------------------------------------- */
  /** The page-content column between the two (disabled) ad rails. */
  contentArea: 'div.max-w-5xl',
  hero: 'div.mb-3.relative.rounded-lg',
  authorBox: 'div.bg-gray-700.rounded-lg:contains("Scritto da")',
  footer: 'footer',
  jsonLd: 'script[type="application/ld+json"]',
} as const
