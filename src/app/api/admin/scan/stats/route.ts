import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { gateStats } from "@/lib/scan";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("evento") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  return NextResponse.json(await gateStats(id));
}
