import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import { env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string; contentId: string }>;
}

export type EmailSender = (msg: EmailMessage) => Promise<{ id: string; transport: "resend" | "console" }>;

/**
 * Envía con Resend si hay RESEND_API_KEY. Si no, lo imprime en consola y guarda una copia
 * navegable en .data/outbox/*.html (con los QR embebidos) para poder abrirla en el navegador.
 */
export const sendEmail: EmailSender = async (msg) => {
  const key = env.resendApiKey();
  if (key) {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: env.emailFrom(),
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments: msg.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        contentId: a.contentId,
      })),
    });
    if (error || !data) throw new Error(`Resend: ${error?.message ?? "sin respuesta"}`);
    return { id: data.id, transport: "resend" };
  }

  const id = `console-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const outboxDir = process.env.EMAIL_OUTBOX_DIR ?? ".data/outbox";
  let savedAt = "";
  if (outboxDir) {
    let html = msg.html;
    for (const a of msg.attachments ?? []) {
      html = html.split(`cid:${a.contentId}`).join(`data:${a.contentType};base64,${a.content.toString("base64")}`);
    }
    fs.mkdirSync(outboxDir, { recursive: true });
    savedAt = path.join(outboxDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${id}.html`);
    fs.writeFileSync(savedAt, html);
  }
  if (process.env.NODE_ENV !== "test") {
    console.log(
      [
        "",
        "📧 ─── Mail (sin RESEND_API_KEY: no se envió de verdad) ───",
        `Para:    ${msg.to}`,
        `Asunto:  ${msg.subject}`,
        savedAt ? `Copia:   ${savedAt}` : "",
        "",
        msg.text,
        "─────────────────────────────────────────────────────────",
        "",
      ]
        .filter((l) => l !== null)
        .join("\n"),
    );
  }
  return { id, transport: "console" };
};
