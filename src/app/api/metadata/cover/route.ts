import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isAllowedCoverHost } from "@/lib/metadata";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  uploadImageBytes,
} from "@/lib/storage";

const schema = z.object({ coverUrl: z.string().url() });

// Imports a game cover into our bucket: fetches the image server-side and
// re-uploads it, so listing images always live in Supabase (no hotlinking).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // SSRF guard: only ever fetch from the known image CDN host.
  if (!isAllowedCoverHost(parsed.data.coverUrl)) {
    return NextResponse.json({ error: "Disallowed host" }, { status: 400 });
  }

  try {
    // Bound the upstream fetch so a slow/stalled CDN can't tie up the function;
    // an abort lands in the catch below and returns a 502.
    const imgRes = await fetch(parsed.data.coverUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!imgRes.ok) {
      throw new Error(`cover fetch failed: ${imgRes.status}`);
    }
    const contentType = (imgRes.headers.get("content-type") ?? "").split(";")[0];
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
      return NextResponse.json(
        { error: "Unsupported image type" },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }
    const path = await uploadImageBytes(session.user.id, buf, contentType);
    return NextResponse.json({ path });
  } catch (err) {
    console.error("[metadata/cover] failed:", err);
    return NextResponse.json(
      { error: "Could not import cover" },
      { status: 502 },
    );
  }
}
