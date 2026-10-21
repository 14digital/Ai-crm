import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional `id` in body marks a single notification read; otherwise mark all.
  let id: string | undefined;
  try {
    const body = await req.json();
    id = typeof body?.id === "string" ? body.id : undefined;
  } catch {
    // No body — fall through to mark-all.
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      isRead: false,
      ...(id ? { id } : {}),
    },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
