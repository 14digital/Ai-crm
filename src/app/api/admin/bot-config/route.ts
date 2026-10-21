import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await prisma.whatsAppConfig.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      displayName: true,
      displayPhone: true,
      aiSystemPrompt: true,
      aiModel: true,
      aiEnabled: true,
    },
  });

  if (!config) return NextResponse.json({ error: "No config found" }, { status: 404 });

  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { aiSystemPrompt, aiModel, aiEnabled } = body;

  const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true } });
  if (!config) return NextResponse.json({ error: "No config found" }, { status: 404 });

  const updated = await prisma.whatsAppConfig.update({
    where: { id: config.id },
    data: {
      ...(aiSystemPrompt !== undefined && { aiSystemPrompt }),
      ...(aiModel !== undefined && { aiModel }),
      ...(aiEnabled !== undefined && { aiEnabled }),
    },
  });

  return NextResponse.json(updated);
}
