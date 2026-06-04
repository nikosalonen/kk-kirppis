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
    // Distinguish the bounded-fetch timeout (504) and the "page had no
    // importable data" case (422) from a generic upstream failure (502), so the
    // client can tell the user something actionable. Mirrors the cover route.
    // The SSRF-guard rejection deliberately stays a generic 502 — don't leak
    // which host/hop was blocked.
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Tori took too long to respond. Try again." },
        { status: 504 },
      );
    }
    if (
      err instanceof Error &&
      err.message === "No listing data found on the page"
    ) {
      return NextResponse.json(
        { error: "That page has no importable listing data." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Import failed" }, { status: 502 });
  }
}
