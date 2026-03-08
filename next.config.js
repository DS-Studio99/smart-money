const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_VALUE === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => config,
  turbopack: {},
}

module.exports = withPWA(nextConfig)
