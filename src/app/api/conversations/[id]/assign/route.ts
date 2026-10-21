import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assignConversationManual } from "@/lib/assignment";
import { z } from "zod";

const assignSchema = z.object({
  assignedToId: z.string().uuid(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can manually assign
  if ((session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { assignedToId, notes } = parsed.data;

  // Verify conversation exists
  const conversation = await prisma.conversation.findUnique({
    where: { id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Verify the target sales person exists and is active
  const salesPerson = await prisma.user.findUnique({
    where: { id: assignedToId, isActive: true },
  });

  if (!salesPerson) {
    return NextResponse.json({ error: "Sales person not found or inactive" }, { status: 404 });
  }

  await assignConversationManual(
    id,
    assignedToId,
    session.user.id as string,
    notes
  );

  return NextResponse.json({ success: true, assignedToId });
}
