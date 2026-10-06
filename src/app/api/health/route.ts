import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called daily by the Vercel cron in vercel.json. Supabase pauses free-tier
// projects after ~7 days without database activity; one cheap query a day
// keeps the project awake. Public on purpose: it runs `SELECT 1` and returns
// no data.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[health] database check failed:", err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
