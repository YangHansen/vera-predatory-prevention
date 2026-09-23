import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export const viewport: Viewport = {
  themeColor: "#2459d3",
  width: "device-width",
  initialScale: 1,

  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Vera — Agent workspace",
  description:
    "B2B SaaS platform ensuring genuine informed consent and real-time AI copilot for insurance sales.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vera",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
