import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['all-the-cities'],
  headers: async () => [{
    source: '/(.*)',
    headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }]
  }]
};

export default nextConfig;
