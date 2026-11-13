import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

/** PWA: se puede "Agregar a inicio" y abre directo el escáner de puerta (D13). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} · Puerta`,
    short_name: "Puerta",
    description: "Escáner de entradas de Algo Lindo",
    start_url: "/admin/escaner",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0a0f",
    theme_color: "#0d0a0f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
