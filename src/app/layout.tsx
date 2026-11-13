import type { Metadata, Viewport } from "next";
import "@/styles/fonts";
import "./globals.css";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: { default: `${brand.name} · Entradas y eventos`, template: `%s · ${brand.name}` },
  description: brand.tagline,
  applicationName: brand.name,
};

export const viewport: Viewport = {
  themeColor: "#0d0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
