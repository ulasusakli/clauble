import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  logging: {
    incomingRequests: {
      // Confirmation URLs contain one-time token hashes. Do not emit them in
      // the development request log.
      ignore: [/\/auth\/confirm(?:\?|$)/],
    },
  },
  reactStrictMode: true,
  typedRoutes: true,
};

export default nextConfig;
