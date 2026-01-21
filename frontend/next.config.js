/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  basePath: process.env.NODE_ENV === 'production' ? '/Fantasy-NBA-Analytics' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/Fantasy-NBA-Analytics' : '',
}

module.exports = nextConfig
