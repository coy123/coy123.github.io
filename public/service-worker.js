// Bumped with the brand swap: the icon set and og-image changed under the same
// filenames, so a v1 cache would keep serving the old taxi artwork.
const CACHE_NAME = 'licenzia-static-v2'
const assetPattern = /^\/assets\//
const immutableExtensions = /\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|avif|ico)$/

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key)
            }
            return undefined
          })
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  const isSameOrigin = url.origin === self.location.origin
  const shouldCache =
    isSameOrigin &&
    (assetPattern.test(url.pathname) || immutableExtensions.test(url.pathname))

  if (!shouldCache) {
    return
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) {
        return cached
      }

      try {
        const response = await fetch(request)
        if (response.ok) {
          cache.put(request, response.clone())
        }
        return response
      } catch (error) {
        return cached ?? Promise.reject(error)
      }
    })
  )
})

