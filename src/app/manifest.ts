import type { MetadataRoute } from "next";

// Lets people "Add to Home Screen" (needed for phone notifications on iPhone).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "We The Free Organiser",
    short_name: "We The Free",
    start_url: "/me",
    display: "standalone",
    background_color: "#071130",
    theme_color: "#071130",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
