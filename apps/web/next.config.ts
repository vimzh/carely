import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "45mb",
    },
  },
  rewrites: async () => [
    {
      source: "/pitch",
      destination: "/pitch/index.html",
    },
  ],
};

export default nextConfig;
