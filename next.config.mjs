/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so every page ships as pre-rendered HTML — essential for SEO + GEO.
  output: "export",
  // Required for `output: export` (no Image Optimization server at runtime).
  images: { unoptimized: true },
  // Clean, crawlable URLs: /category/portraits/ instead of /category/portraits
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
