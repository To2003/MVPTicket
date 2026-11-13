/**
 * Template del mail de entradas. Función pura (sin dependencias de servidor):
 * la usa el envío real y también la Simulación para mostrar cómo llega el mail.
 */
import { brand } from "@/config/brand";
import { formatDateLong, formatMoney, formatTime } from "@/lib/format";

export interface TicketsEmailData {
  buyerName: string;
  eventName: string;
  startsAt: string;
  venueName: string;
  venueAddress: string;
  total: number;
  orderUrl: string;
  tickets: Array<{ code: string; holderName: string; ticketTypeName: string; url: string; qrSrc: string }>;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const C = {
  bg: "#0d0a0f",
  card: "#17121b",
  line: "#31283a",
  ink: "#f8f2ea",
  muted: "#a89db3",
  primary: "#ff3d7f",
  accent: "#d4ff3a",
};

export function renderTicketsEmail(d: TicketsEmailData): { subject: string; html: string; text: string } {
  const first = escapeHtml(d.buyerName.split(" ")[0] ?? d.buyerName);
  const when = `${formatDateLong(d.startsAt)} · ${formatTime(d.startsAt)} hs`;
  const n = d.tickets.length;
  const subject = `¡Listo! ${n === 1 ? "Tu entrada" : `Tus ${n} entradas`} para ${d.eventName} 🎉`;

  const ticketBlocks = d.tickets
    .map(
      (t, i) => `
      <tr><td style="padding:0 0 16px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.line};border-radius:18px">
          <tr>
            <td style="padding:20px 20px 4px 20px;font-family:Arial,Helvetica,sans-serif">
              <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted}">Entrada ${i + 1} de ${n} · ${escapeHtml(t.ticketTypeName)}</div>
              <div style="font-size:18px;font-weight:bold;color:${C.ink};margin-top:4px">${escapeHtml(t.holderName)}</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 20px">
              <div style="background:#ffffff;border-radius:14px;padding:12px;display:inline-block">
                <img src="${t.qrSrc}" width="200" height="200" alt="Código QR de la entrada ${escapeHtml(t.code)}" style="display:block;width:200px;height:200px" />
              </div>
              <div style="font-family:'Courier New',monospace;font-size:18px;font-weight:bold;letter-spacing:3px;color:${C.ink};margin-top:10px">${escapeHtml(t.code)}</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 20px 20px 20px">
              <a href="${escapeHtml(t.url)}" style="display:inline-block;background:${C.primary};color:#1a0510;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:999px">Ver entrada</a>
            </td>
          </tr>
        </table>
      </td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}">
  <tr><td align="center" style="padding:28px 14px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:${C.ink};padding-bottom:22px">
        <span style="color:${C.primary}">✦</span> ${escapeHtml(brand.name.toLowerCase())}
      </td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;color:${C.ink}">
        <div style="font-size:30px;font-weight:bold;line-height:1.1">¡Ya tenés ${n === 1 ? "tu entrada" : "tus entradas"}, ${first}!</div>
        <p style="font-size:16px;line-height:1.5;color:${C.muted};margin:12px 0 22px 0">
          Te esperamos en <strong style="color:${C.ink}">${escapeHtml(d.eventName)}</strong>. Mostrá el QR en la puerta desde el celu (no hace falta imprimirlo). Cada QR vale para una persona.
        </p>
      </td></tr>
      <tr><td style="padding-bottom:22px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};border-radius:14px">
          <tr><td style="padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${C.ink};line-height:1.6">
            <strong style="color:${C.accent}">Cuándo:</strong> ${escapeHtml(when)}<br>
            <strong style="color:${C.accent}">Dónde:</strong> ${escapeHtml(d.venueName)}${d.venueAddress ? ` · ${escapeHtml(d.venueAddress)}` : ""}<br>
            <strong style="color:${C.accent}">Total pagado:</strong> ${escapeHtml(formatMoney(d.total))}
          </td></tr>
        </table>
      </td></tr>
      ${ticketBlocks}
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${C.muted};padding-top:8px">
        ¿Algún problema con tu compra? Respondé este mail o escribinos por WhatsApp.<br>
        Podés ver todas tus entradas cuando quieras en <a href="${escapeHtml(d.orderUrl)}" style="color:${C.primary}">este link</a>. No lo compartas: cualquiera con el QR puede entrar.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    `¡Ya tenés ${n === 1 ? "tu entrada" : "tus entradas"}, ${d.buyerName.split(" ")[0]}!`,
    "",
    `${d.eventName}`,
    `${when}`,
    `${d.venueName}${d.venueAddress ? ` · ${d.venueAddress}` : ""}`,
    "",
    ...d.tickets.map((t, i) => `Entrada ${i + 1} (${t.ticketTypeName}) · ${t.holderName} · código ${t.code}\n${t.url}`),
    "",
    `Todas tus entradas: ${d.orderUrl}`,
  ].join("\n");

  return { subject, html, text };
}
