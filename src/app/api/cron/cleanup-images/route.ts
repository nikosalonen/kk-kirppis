import { NextResponse } from "next/server";
import { cleanUpOrphanedImages } from "@/lib/image-cleanup";

// Called daily by the Vercel cron in vercel.json. Vercel sends
// `Authorization: Bearer $CRON_SECRET` when that env var is set. This route
// deletes files, so it fails closed: without the secret, nobody can run it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanUpOrphanedImages();
    if (result.skipped) {
      console.warn("[cleanup-images] skipped:", result.skipped, result);
    } else {
      console.log("[cleanup-images] done:", result);
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cleanup-images] failed:", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
