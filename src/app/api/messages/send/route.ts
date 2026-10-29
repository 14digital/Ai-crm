import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTextMessage, sendTemplateMessage, isWindowOpen } from "@/lib/whatsapp";
import { pusherServer } from "@/lib/pusher";
import { checkRateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  type: z.enum(["text", "template"]).default("text"),
  templateName: z.string().optional(),
  templateParams: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(`msg:${session.user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = sendMessageSchema.parse(body);

    // Fetch conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: data.conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check access: sales person can only send to their assigned conversations
    if (
      session.user.role === "SALES_PERSON" &&
      conversation.assignedToId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let waMessageId: string;

    if (data.type === "text") {
      // Check 24h window for text messages
      if (!isWindowOpen(conversation.lastClientMessageAt)) {
        return NextResponse.json(
          {
            error: "24-hour window expired. Use a template message instead.",
            windowExpired: true,
          },
          { status: 400 }
        );
      }

      // Send via WhatsApp API
      waMessageId = await sendTextMessage(
        conversation.clientWaNumber,
        data.content
      );
    } else {
      // Template message — no window restriction
      if (!data.templateName) {
        return NextResponse.json(
          { error: "templateName required for template messages" },
          { status: 400 }
        );
      }

      waMessageId = await sendTemplateMessage(
        conversation.clientWaNumber,
        data.templateName,
        data.templateParams || []
      );
    }

    // Save message to DB
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "outbound",
        senderType: "SALES_PERSON",
        sentById: session.user.id,
        content: data.content,
        waMessageId,
        status: "SENT",
        isTemplate: data.type === "template",
        templateName: data.templateName || null,
        templateParams: data.templateParams
          ? JSON.parse(JSON.stringify(data.templateParams))
          : null,
      },
    });

    // Real-time: push to conversation channel
    await pusherServer.trigger(
      `presence-conversation-${conversation.id}`,
      "message_received",
      {
        id: message.id,
        content: message.content,
        senderType: "SALES_PERSON",
        direction: "outbound",
        sentById: session.user.id,
        createdAt: message.createdAt,
      }
    );

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: (err as z.ZodError).issues[0].message },
        { status: 400 }
      );
    }
    console.error("Send message error:", err);
    const detail = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
