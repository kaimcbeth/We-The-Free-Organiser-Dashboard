import type { NextConfig } from "next";

// Every page in this app shows live, per-organiser data, so pages are
// rendered fresh on each request rather than pre-built.
const nextConfig: NextConfig = {
  cacheComponents: false,
  partialPrefetching: false,
  // The offline movie player (opened from a laptop's files) checks this page
  // for a newer version, so it may be read from anywhere.
  async headers() {
    return [
      {
        source: "/resources/movie-player.html",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
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
