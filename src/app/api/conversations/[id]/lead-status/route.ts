import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  leadStatus: z.enum(["NEW", "HOT", "COLD", "FOLLOW_UP", "CONVERTED", "LOST"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as { role: string }).role;
  if (role === "SALES_PERSON" && conversation.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: { leadStatus: body.data.leadStatus },
  });

  return NextResponse.json({ leadStatus: updated.leadStatus });
}
