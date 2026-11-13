import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Sirve los flyers subidos en modo local (sin Supabase Storage, D18). */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!/^[0-9]{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)) {
    return new NextResponse("No encontrado", { status: 404 });
  }
  const file = await queryOne<{ content_type: string; data: Buffer }>(
    "select content_type, data from public.local_files where path = $1",
    [path],
  );
  if (!file) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
