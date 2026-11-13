import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/auth";
import { gateStats, scanInput } from "@/lib/scan";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  input: z.string().min(1).max(300),
  eventId: z.string().uuid(),
});

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const res = await scanInput(parsed.data.input, parsed.data.eventId);
  const stats = await gateStats(parsed.data.eventId);
  return NextResponse.json({ ...res, stats });
}
