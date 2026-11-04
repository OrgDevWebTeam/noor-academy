import type { MetadataRoute } from "next";

// Lets the site install on a phone like an app (PWA). Served at /manifest.webmanifest.
// Icons are placeholders until the design team delivers the final ones.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Noor Academy | نور أكاديمي",
    short_name: "Noor",
    description: "A personalized growth platform for Muslim children.",
    // "/" lets the app pick the saved or browser language on every launch.
    start_url: "/",
    scope: "/",
    display: "standalone",
    dir: "auto",
    background_color: "#ffffff",
    theme_color: "#1b6b5a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
