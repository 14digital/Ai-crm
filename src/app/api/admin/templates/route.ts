import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const templates = await prisma.whatsAppTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, displayName, category, language, bodyText } = body;

  if (!name || !displayName || !category || !bodyText) {
    return NextResponse.json({ error: "name, displayName, category, bodyText are required" }, { status: 400 });
  }

  const existing = await prisma.whatsAppTemplate.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ error: "Template name already exists" }, { status: 409 });

  const template = await prisma.whatsAppTemplate.create({
    data: { name, displayName, category, language: language || "en", bodyText },
  });

  return NextResponse.json(template, { status: 201 });
}
