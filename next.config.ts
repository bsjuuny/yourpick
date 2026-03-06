import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/kindergartencompare',
  assetPrefix: '/kindergartencompare/',
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
