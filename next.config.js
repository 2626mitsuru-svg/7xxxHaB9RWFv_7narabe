/** @type {import('next').NextConfig} */
const nextConfig = {
  // ここは空でOK（rewrites は page.tsx の redirect に一本化）
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
};
module.exports = nextConfig;
