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
  /**
   * The search affordance in the mobile tab bar: the one plain <div> among the
   * tab <button>s (it becomes the text input once expanded, so it cannot be a
   * button). Anchored on the shape rather than on a position, because the tab
   * bar grew a third tab and every `.eq(2)` in the specs went with it.
   */
  mobileSearchToggle: 'div.sm\\:hidden.mb-2 > div > div',
  desktopTabBar: 'div.hidden.sm\\:block.mb-4',
  searchInput: 'input[placeholder="Cerca località"]',
  anchorPills: 'a[href^="#section-"]',

  /* Regions tab (components/RegionsContent.tsx) ------------------------- */
  /**
   * The desktop picker: twenty named buttons. Both grids are always in the
   * DOM — one is display:none at any width — so every region assertion has to
   * go through one of these two, never through `regionButton` on its own.
   */
  regionGrid: 'div.hidden.sm\\:grid[role="group"]',
  /** The phone picker: the same twenty as crests only, four across. */
  regionGridMobile: 'div.grid.sm\\:hidden[role="group"]',
  /** One region button. `aria-pressed` is what makes it a toggle, and unique. */
  regionButton: 'button[aria-pressed]',
  /** The region currently chosen, within whichever grid it is scoped to. */
  regionButtonSelected: 'button[aria-pressed="true"]',
  /**
   * The heading + table + map a chosen region reveals, and the element the
   * picker scrolls to. Reached as a sibling of the picker because
   * `scroll-mt-20` on its own also matches the home page's section anchors.
   */
  regionResults: 'div.grid.sm\\:hidden[role="group"] ~ div.scroll-mt-20',
  /** The launch flag on the Regioni tab. Expires — see HomeContent.tsx. */
  newBadge: '.tab-new-badge',

  /* Tables (bids + laws share the same row shell) ----------------------- */
  // `min-h-`, not `h-`: the locked placeholder rows are sized `h-[4.5rem]`
  // precisely so this keeps meaning "a real bid row" and never counts them.
  tableRow: 'div[class*="min-h-[4.5rem]"]',
  bidLink: 'a[href^="/bandi/"]',
  crestImage: 'img[alt^="Comune "]',

  /* Locked rows (bandi inside their subscriber-only window) ------------- */
  /** The blurred skeleton. Contains no text and no links, by design. */
  lockedRows: '.locked-rows',
  /** One shimmering placeholder bar inside it. */
  lockedBar: '.locked-bar',
  /** The subscription card sitting over the skeleton. */
  lockedOverlay: '.locked-rows + div a[href^="/abbonamento"]',

  /* Leaflet ------------------------------------------------------------ */
  map: '.leaflet-container',
  mapMarker: 'path.leaflet-interactive',
  mapPopup: '.leaflet-popup',
  // The open/scaduto pill inside a map popup. `rounded-full` is the only
  // structural class that distinguishes it from the other spans in there,
  // which is the same anchoring convention the rest of this file uses.
  mapPopupStatus: '.leaflet-popup span.rounded-full',
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

  /* Rendered markdown --------------------------------------------------- */
  /** Any markdown surface: the two article pages and the FAQ answers. */
  richText: '.rich-text',
  /** One rendered .md block (components/MarkdownArticle.tsx). */
  articleBody: '.article-body',
  /** A GFM table and its horizontal-scroll container. */
  articleTable: '.article-table',

  /* Shared ------------------------------------------------------------- */
  /** The page-content column between the two ad rails. */
  contentArea: 'div.max-w-5xl',
  /** A desktop side rail (xl and up), one either side of the content column. */
  sideAd: 'aside.hidden.xl\\:flex',
  /** The decorative confetti/balloon overlay on /grazie. */
  celebration: 'div.celebration',
  hero: 'div.mb-3.relative.rounded-lg',
  /**
   * The crest in the right-hand strip of a page hero (xl and up). Currently
   * never matches: `HeroCrest` is disabled, and `routes.cy.ts` asserts that.
   */
  heroCrest: 'div.mb-3.relative.rounded-lg img[src="/images/logo-crest.svg"]',
  authorBox: 'div.bg-gray-700.rounded-lg:contains("Scritto da")',
  footer: 'footer',
  jsonLd: 'script[type="application/ld+json"]',
} as const
