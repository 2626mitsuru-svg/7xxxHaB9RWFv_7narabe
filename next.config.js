/** @type {import('next').NextConfig} */
const nextConfig = {
  // / → public/site/index.html にリライト
  async rewrites() {
    return [{ source: '/', destination: '/site/index.html' }];
  },

  // Next の型チェック/ESLint をビルド時は無効化（Vite側でビルド済みのため）
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
};

module.exports = nextConfig;
