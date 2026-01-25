/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['upload.wikimedia.org'], // Per stemmi comuni
    formats: ['image/avif', 'image/webp'],
  },
  // Per deploy su Vercel (SSR completo):
  // Nessuna configurazione aggiuntiva necessaria

  // Per deploy su GitHub Pages (solo SSG):
  // Decommentare queste righe se si vuole deploy statico
  // output: 'export',
  // trailingSlash: true,
  // images: { unoptimized: true },
}

export default nextConfig
