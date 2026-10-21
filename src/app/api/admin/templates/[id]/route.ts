import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { displayName, category, bodyText, isActive } = body;

  const template = await prisma.whatsAppTemplate.update({
    where: { id },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(category !== undefined && { category }),
      ...(bodyText !== undefined && { bodyText }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.whatsAppTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
