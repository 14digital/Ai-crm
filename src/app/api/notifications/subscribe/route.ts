import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { endpoint, p256dh, auth: authKey } = body;

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "endpoint, p256dh, auth required" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.user.id, endpoint, p256dh, auth: authKey },
    update: { userId: session.user.id, p256dh, auth: authKey },
  });

  return NextResponse.json({ success: true });
}
