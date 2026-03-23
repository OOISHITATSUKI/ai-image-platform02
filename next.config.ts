import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
