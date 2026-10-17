import type { NextConfig } from "next";

// Every page in this app shows live, per-organiser data, so pages are
// rendered fresh on each request rather than pre-built.
const nextConfig: NextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
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
