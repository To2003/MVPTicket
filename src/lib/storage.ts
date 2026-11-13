import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { query } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const FLYER_BUCKET = "flyers";
export const MAX_FLYER_BYTES = 5 * 1024 * 1024;

/**
 * URL pública de un archivo guardado.
 * - Rutas absolutas ("/seed/...") o URLs completas se devuelven tal cual.
 * - Con Supabase: URL pública del bucket.
 * - Sin Supabase (modo local, D18): se sirve desde /api/files/...
 */
export function publicFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) return path;
  if (env.supabaseStorageEnabled()) {
    return `${env.supabaseUrl()}/storage/v1/object/public/${FLYER_BUCKET}/${path}`;
  }
  return `/api/files/${path}`;
}

/** Detecta el tipo real por los "magic bytes" (no confiamos en el content-type del navegador). */
export function sniffImageType(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { mime: "image/png", ext: "png" };
  if (
    bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return { mime: "image/webp", ext: "webp" };
  return null;
}

export class UploadError extends Error {}

/** Sube un flyer y devuelve su path (para guardar en events.flyer_path). */
export async function uploadFlyer(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError("El archivo está vacío.");
  if (file.size > MAX_FLYER_BYTES) throw new UploadError("El flyer pesa más de 5 MB. Probá con una versión más liviana.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw new UploadError("El flyer tiene que ser una imagen JPG, PNG o WEBP.");

  const path = `${new Date().getFullYear()}/${randomUUID()}.${type.ext}`;
  if (env.supabaseStorageEnabled()) {
    const { error } = await supabaseAdmin()
      .storage.from(FLYER_BUCKET)
      .upload(path, bytes, { contentType: type.mime, upsert: false });
    if (error) throw new UploadError(`No se pudo subir el flyer: ${error.message}`);
  } else {
    await query("insert into public.local_files (path, content_type, data) values ($1, $2, $3)", [
      path,
      type.mime,
      Buffer.from(bytes),
    ]);
  }
  return path;
}
