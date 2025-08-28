/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // ルートを Viteビルド成果物の index.html に差し替え
      { source: '/', destination: '/site/index.html' }
    ];
  }
};
module.exports = nextConfig;
