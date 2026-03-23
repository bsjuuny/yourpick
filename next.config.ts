import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/youerpick',
  assetPrefix: '/youerpick/',
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
