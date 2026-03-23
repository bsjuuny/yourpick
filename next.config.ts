import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/yourpick',
  assetPrefix: '/yourpick/',
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
