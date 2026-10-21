/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  outputFileTracingIncludes: { '/api/reports/*/pdf': ['./assets/NotoSansTC.ttf'] },
};

module.exports = nextConfig;
