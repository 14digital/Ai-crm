import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processAIReply } from "@/lib/ai-processor";
import { pusherServer } from "@/lib/pusher";
import { z } from "zod";

const toggleSchema = z.object({
  aiEnabled: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { aiEnabled } = parsed.data;
  const userId = session.user.id as string;
  const userName = session.user.name as string;
  const userRole = session.user.role as string;

  // Fetch conversation and verify access
  const conversation = await prisma.conversation.findUnique({
    where: { id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Sales person can only toggle AI on their own conversations
  if (userRole === "SALES_PERSON" && conversation.assignedToId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update aiEnabled — assignedToId is NEVER changed on AI toggle
  const updated = await prisma.conversation.update({
    where: { id },
    data: { aiEnabled },
  });

  // Log SYSTEM message for audit trail
  const systemContent = aiEnabled
    ? `AI bot re-activated by ${userName}`
    : `AI bot deactivated by ${userName}`;

  await prisma.message.create({
    data: {
      conversationId: id,
      direction: "outbound",
      senderType: "SYSTEM",
      content: systemContent,
      status: "SENT",
    },
  });

  // On re-enable: if last message is from client with no AI/human reply after it → queue AI immediately
  if (aiEnabled) {
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
    });

    const hasPendingClientMessage =
      lastMessage && lastMessage.senderType === "CLIENT";

    if (hasPendingClientMessage) {
      after(async () => {
        await processAIReply(id, conversation.clientWaNumber);
      });
      console.log(`🤖 AI re-enabled for ${id} — reply scheduled for pending client message`);
    }
  }

  // Pusher: broadcast toggle to all viewers of this conversation
  await pusherServer.trigger(
    `presence-conversation-${id}`,
    "ai_toggled",
    {
      conversationId: id,
      aiEnabled,
      toggledBy: userName,
    }
  );

  return NextResponse.json({ success: true, aiEnabled: updated.aiEnabled });
}
