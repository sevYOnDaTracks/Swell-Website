import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Les fichiers du site (STORAGE_DIR) et les secrets ne font pas partie du code à tracer.
  outputFileTracingExcludes: {
    "/*": ["./.env*", "./storage/**/*", "./swell.db*"],
  },
  experimental: {
    // Upload des visuels et extraits audio depuis l'admin.
    serverActions: { bodySizeLimit: "25mb" },
    proxyClientMaxBodySize: "25mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
