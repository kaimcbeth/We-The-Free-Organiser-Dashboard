import type { MetadataRoute } from "next";

// Lets people "Add to Home Screen" (needed for phone notifications on iPhone).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "We The Free Movement Hub",
    short_name: "Movement Hub",
    start_url: "/me",
    display: "standalone",
    background_color: "#071130",
    theme_color: "#071130",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
