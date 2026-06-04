import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { fetchToriListing, isToriItemUrl } from "@/lib/tori-import";

const schema = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || !isToriItemUrl(parsed.data.url)) {
    return NextResponse.json(
      { error: "Paste a tori.fi listing link (…/forsale/item/…)." },
      { status: 400 },
    );
  }

  try {
    const listing = await fetchToriListing(parsed.data.url);
    return NextResponse.json({ listing });
  } catch (err) {
    console.error("[import/tori] failed:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 502 });
  }
}
