import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Required for src/instrumentation.ts

  },
};

export default nextConfig;
