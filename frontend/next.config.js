/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? '/espn-api' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/espn-api' : '',
}

module.exports = nextConfig
