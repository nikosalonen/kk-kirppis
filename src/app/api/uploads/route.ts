import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ALLOWED_IMAGE_TYPES, createImageUploadTargets } from "@/lib/storage";
import { MAX_IMAGES } from "@/lib/validation";

// Returns signed upload URLs so the browser can PUT image files directly to
// Supabase Storage. Auth-gated: only signed-in members can request targets.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const contentTypes: unknown = body?.contentTypes;

  if (
    !Array.isArray(contentTypes) ||
    contentTypes.length === 0 ||
    contentTypes.length > MAX_IMAGES
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const allowed = ALLOWED_IMAGE_TYPES as readonly string[];
  if (!contentTypes.every((t) => typeof t === "string" && allowed.includes(t))) {
    return NextResponse.json(
      { error: "Unsupported image type" },
      { status: 400 },
    );
  }

  try {
    const targets = await createImageUploadTargets(
      session.user.id,
      contentTypes as string[],
    );
    return NextResponse.json({ targets });
  } catch (err) {
    // Surface the real cause in the server log (missing service-role key,
    // missing bucket, etc.) without leaking it to the client.
    console.error("[uploads] failed to create signed upload URLs:", err);
    return NextResponse.json(
      { error: "Could not create upload URLs" },
      { status: 500 },
    );
  }
}
