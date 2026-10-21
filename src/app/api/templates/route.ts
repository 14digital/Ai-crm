import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.whatsAppTemplate.findMany({
    where: { isActive: true, status: "APPROVED" },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(templates);
}
