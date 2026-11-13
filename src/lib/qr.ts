import "server-only";
import QRCode from "qrcode";

const opts = { errorCorrectionLevel: "M" as const, margin: 1 };

/** SVG del QR (para páginas). Colores fijos: negro sobre blanco, para que cualquier lector lo lea. */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { ...opts, type: "svg", color: { dark: "#0d0a0f", light: "#ffffff" } });
}

/** PNG del QR (para adjuntar inline en el mail). */
export function qrPng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, { ...opts, type: "png", width: 360, color: { dark: "#0d0a0f", light: "#ffffff" } });
}
