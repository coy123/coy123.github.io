/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['upload.wikimedia.org'], // Per stemmi comuni
    formats: ['image/avif', 'image/webp'],
  },
  output: 'export',
  trailingSlash: true,
}

export default nextConfig
