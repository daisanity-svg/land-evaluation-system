/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: process.env.NODE_ENV === 'production' ? '/land-evaluation-system' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/land-evaluation-system/' : '',
};

module.exports = nextConfig;
