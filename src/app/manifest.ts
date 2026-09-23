import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vera - AI Insurance Consent & Mis-selling Prevention",
    short_name: "Vera",
    description:
      "B2B SaaS platform ensuring genuine informed consent and real-time AI copilot for insurance.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2459d3",
    orientation: "portrait",
    scope: "/",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
