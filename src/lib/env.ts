import "server-only";

/** Configuración del servidor. Se lee en cada llamada (los tests cambian el entorno). */
export const env = {
  appUrl: () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  demoMode: () => process.env.DEMO_MODE === "true",
  adminEmails: () =>
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  ticketSecret: () => {
    const s = process.env.TICKET_HMAC_SECRET;
    if (!s || s.length < 32) throw new Error("TICKET_HMAC_SECRET falta o es muy corto (mínimo 32 caracteres).");
    return s;
  },
  supabaseUrl: () => process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseAuthEnabled: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseStorageEnabled: () =>
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  mpAccessToken: () => process.env.MP_ACCESS_TOKEN || "",
  mpWebhookSecret: () => process.env.MP_WEBHOOK_SECRET || "",
  resendApiKey: () => process.env.RESEND_API_KEY || "",
  emailFrom: () => process.env.EMAIL_FROM || "Algo Lindo <entradas@algolindo.test>",
  isProd: () => process.env.NODE_ENV === "production",
};
