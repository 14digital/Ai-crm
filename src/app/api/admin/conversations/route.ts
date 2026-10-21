import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 50;

  const where: Record<string, unknown> = {};
  if (status === "UNASSIGNED_QUEUE") {
    where.assignedToId = null;
    where.status = { not: "CLOSED" };
  } else if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { clientName: { contains: search, mode: "insensitive" } },
      { clientWaNumber: { contains: search } },
    ];
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, senderType: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.conversation.count({ where }),
  ]);

  return NextResponse.json({ conversations, total, page, limit });
}
