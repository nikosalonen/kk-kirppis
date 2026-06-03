import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { searchGames } from "@/lib/metadata";

const schema = z.object({ q: z.string().trim().min(1).max(100) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const results = await searchGames(parsed.data.q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[metadata/search] failed:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
