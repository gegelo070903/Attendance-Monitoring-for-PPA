/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Railway/Docker deployments
  output: "standalone",
  // Performance optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
