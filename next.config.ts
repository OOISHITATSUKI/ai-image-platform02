import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Large multipart uploads bypass the 10MB middleware limit via a matcher
  // exclusion in middleware.ts (/api/admin/upload-companion-*).
  experimental: {
    serverActions: {
      bodySizeLimit: '520mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/:path*.html',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
