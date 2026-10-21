import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncCare360Reference } from "@/lib/care360";
import { getBranches, getLookup } from "@/lib/care360";

// GET  /api/admin/care360/sync — what is currently cached
// POST /api/admin/care360/sync — refresh branches, nationalities, ethnicities, religions
//
// The cache is what the ID resolver matches against, so this needs running once
// after deploy and whenever Care360 changes a dropdown.

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [branches, nationalities, ethnicities, religions] = await Promise.all([
    getBranches(),
    getLookup("nationality"),
    getLookup("ethnicity"),
    getLookup("religion"),
  ]);

  return NextResponse.json({
    counts: {
      branches: branches.length,
      nationalities: nationalities.length,
      ethnicities: ethnicities.length,
      religions: religions.length,
    },
    branches,
    ethnicities,
    religions,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const counts = await syncCare360Reference();
    return NextResponse.json({ success: true, counts });
  } catch (err) {
    console.error("[care360/sync] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Care360 sync failed" },
      { status: 502 }
    );
  }
}
