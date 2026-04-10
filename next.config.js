/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    // In dev mode, proxy API to separate Express server
    // In production, same server serves both
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:4000/api/:path*',
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
