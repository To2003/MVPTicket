import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Cliente con service role. SOLO server-side (Storage y administración de usuarios). */
export function supabaseAdmin(): SupabaseClient {
  if (!env.supabaseStorageEnabled()) throw new Error("Supabase no está configurado (URL + service role key).");
  if (!client) {
    client = createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
