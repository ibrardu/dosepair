/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_URL || 'http://localhost:3001';

module.exports = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};
