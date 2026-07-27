/// <reference types="cypress" />

export interface LinkInfo {
  /** Raw `href` attribute, exactly as authored. */
  href: string
  /** Fully-resolved, URL-encoded absolute href (from the DOM property). */
  url: string
  text: string
  target: string
  rel: string
}

export interface CollectedLinks {
  internal: LinkInfo[]
  external: LinkInfo[]
  anchors: LinkInfo[]
  mail: LinkInfo[]
}

/**
 * `next.config.mjs` sets `trailingSlash: true`, so `/faq/` is the canonical
 * form. Visiting the canonical URL avoids relying on server-side redirects,
 * which differ between `next dev`, `serve out/` and GitHub Pages.
 */
export const withTrailingSlash = (path: string) => {
  const [base, hash] = path.split('#')
  const [pathname, query] = base.split('?')
  const normalized =
    pathname.endsWith('/') || /\.[a-z0-9]+$/i.test(pathname)
      ? pathname
      : `${pathname}/`
  return `${normalized}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
}

const seedConsent = (win: Window, value: string) => {
  win.localStorage.setItem('cookie-consent', value)
}

/**
 * Visits a page with the cookie banner already dismissed. The banner is
 * `position: fixed; bottom: 0` and intercepts clicks on anything near the
 * bottom of the viewport, so every spec except `cookie-banner.cy.ts` uses this.
 */
Cypress.Commands.add(
  'visitPage',
  (path: string, options: Partial<Cypress.VisitOptions> = {}) =>
    cy.visit(withTrailingSlash(path), {
      ...options,
      onBeforeLoad(win) {
        seedConsent(win, 'accepted')
        options.onBeforeLoad?.(win)
      },
    })
)

/** Visits a page with a pristine localStorage, so the cookie banner shows. */
Cypress.Commands.add(
  'visitRaw',
  (path: string, options: Partial<Cypress.VisitOptions> = {}) =>
    cy.visit(withTrailingSlash(path), options)
)

Cypress.Commands.add('useDesktop', () => {
  cy.viewport(1280, 800)
})
Cypress.Commands.add('useTablet', () => {
  cy.viewport(768, 1024)
})
Cypress.Commands.add('useMobile', () => {
  cy.viewport(390, 844)
})

/** Parses every JSON-LD block on the page and yields the parsed objects. */
Cypress.Commands.add('jsonLd', () =>
  cy.get('script[type="application/ld+json"]').then(($scripts) => {
    const blocks: Record<string, any>[] = $scripts.toArray().map((script) => {
      const raw = script.textContent ?? ''
      const where = script.ownerDocument?.location?.pathname ?? 'page'
      try {
        return JSON.parse(raw)
      } catch (error) {
        throw new Error(
          `Invalid JSON-LD on ${where}: ${(error as Error).message}\n${raw.slice(0, 200)}`
        )
      }
    })
    return blocks
  })
)

/** Buckets every `<a href>` currently in the DOM by link kind. */
Cypress.Commands.add('collectLinks', (scope = 'body') =>
  cy.get(scope).find('a[href]').then(($links) => {
    const collected: CollectedLinks = {
      internal: [],
      external: [],
      anchors: [],
      mail: [],
    }

    $links.toArray().forEach((element) => {
      const anchor = element as HTMLAnchorElement

      // Leaflet renders its zoom and popup-close controls as `<a href="#">`.
      // They are third-party chrome, not site navigation.
      if (anchor.closest('.leaflet-container')) return

      // Resolve against the application's document, not the spec frame.
      const appOrigin = anchor.ownerDocument.location.origin
      const info: LinkInfo = {
        href: anchor.getAttribute('href') ?? '',
        url: anchor.href,
        text: (anchor.textContent ?? '').replace(/\s+/g, ' ').trim(),
        target: anchor.getAttribute('target') ?? '',
        rel: anchor.getAttribute('rel') ?? '',
      }

      if (/^(mailto|tel):/i.test(info.href)) {
        collected.mail.push(info)
      } else if (info.href.startsWith('#')) {
        collected.anchors.push(info)
      } else if (info.href.startsWith('/') || info.url.startsWith(appOrigin)) {
        collected.internal.push(info)
      } else {
        collected.external.push(info)
      }
    })

    return collected
  })
)

/**
 * Asserts the current pathname, tolerating the trailing slash. Server-rendered
 * navigations land on `/faq/` while `next/link` client transitions may keep
 * `/faq`, and both are correct as far as these tests are concerned.
 */
Cypress.Commands.add('assertPath', (path: string) => {
  const clean = path.replace(/\/+$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  cy.location('pathname').should('match', new RegExp(`^${clean}/?$`))
})

/** Asserts a URL is reachable, following the site's trailing-slash redirects. */
Cypress.Commands.add('assertReachable', (url: string) => {
  cy.request({ url, failOnStatusCode: false, followRedirect: true }).then((response) => {
    expect(response.status, `GET ${url}`).to.be.oneOf([200, 304])
  })
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      visitPage(path: string, options?: Partial<Cypress.VisitOptions>): Chainable<Cypress.AUTWindow>
      visitRaw(path: string, options?: Partial<Cypress.VisitOptions>): Chainable<Cypress.AUTWindow>
      useDesktop(): Chainable<void>
      useTablet(): Chainable<void>
      useMobile(): Chainable<void>
      jsonLd(): Chainable<Record<string, any>[]>
      collectLinks(scope?: string): Chainable<CollectedLinks>
      assertPath(path: string): Chainable<void>
      assertReachable(url: string): Chainable<void>
    }
  }
}

export {}
