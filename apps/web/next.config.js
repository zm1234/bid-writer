/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bid-writer/shared', '@bid-writer/agents'],
}

module.exports = nextConfig
