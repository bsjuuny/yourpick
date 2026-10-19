import type { NextConfig } from "next";

const basePath = '/yourpick';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: `${basePath}/`,
  // fetch() does not inherit Next's basePath. Inline the same prefix in every
  // client bundle even when the build machine has no local environment file.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
