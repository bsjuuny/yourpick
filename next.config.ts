import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/yourpick',
  assetPrefix: '/yourpick/',
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
