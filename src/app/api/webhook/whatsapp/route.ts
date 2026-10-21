import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/whatsapp";
import { processAIReply } from "@/lib/ai-processor";
import { pusherServer } from "@/lib/pusher";
import {
  downloadWhatsAppMedia,
  MediaTooLargeError,
  UnsupportedMediaError,
} from "@/lib/whatsapp-media";
import { extractFromMedia, wrapExtractedText } from "@/lib/media-extract";

// ==========================================
// GET — health check
// ==========================================
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}

/** Twilio signs the request with the exact URL plus the sorted POST params. */
function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  const expected = crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Twilio prefixes WhatsApp addresses with "whatsapp:". We store bare digits. */
function bareNumber(address: string): string {
  return address.replace(/^whatsapp:/, "").replace(/[^\d]/g, "");
}

// ==========================================
// POST — incoming WhatsApp messages / status callbacks
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const params: Record<string, string> = {};
    new URLSearchParams(rawBody).forEach((value, key) => {
      params[key] = value;
    });

    const signature = req.headers.get("x-twilio-signature");
    if (process.env.TWILIO_AUTH_TOKEN && signature) {
      const url = process.env.TWILIO_WEBHOOK_URL || req.nextUrl.href;
      if (!verifyTwilioSignature(url, params, signature)) {
        console.warn("❌ Invalid Twilio signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    // Status callback (sent / delivered / read / failed)
    if (params.MessageStatus && !params.Body && !params.NumMedia) {
      await handleStatusUpdate(params.MessageSid, params.MessageStatus);
      return new NextResponse("", { status: 204 });
    }

    if (params.From && params.MessageSid) {
      await processIncomingMessage(params);
    }

    return new NextResponse("", { status: 204 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new NextResponse("", { status: 204 });
  }
}

// ==========================================
// Process a single incoming message
// ==========================================
async function processIncomingMessage(params: Record<string, string>) {
  const clientWaNumber = bareNumber(params.From);
  const waMessageId = params.MessageSid;
  const contactName = params.ProfileName || null;

  const numMedia = parseInt(params.NumMedia || "0", 10);
  const body = (params.Body || "").trim();

  let content = body;
  let mediaType: string | null = null;
  let mediaUrl: string | null = null;
  let mediaContentType: string | null = null;

  if (numMedia > 0) {
    mediaUrl = params.MediaUrl0 || null;
    mediaContentType = (params.MediaContentType0 || "").split(";")[0].trim().toLowerCase();

    if (mediaContentType.startsWith("image/")) {
      mediaType = "image";
      content = body || "[Applicant sent a photo]";
    } else if (mediaContentType === "application/pdf") {
      mediaType = "document";
      content = body || "[Applicant sent a document]";
    } else if (mediaContentType.startsWith("audio/")) {
      mediaType = "audio";
      content = body || "[Applicant sent a voice note]";
    } else if (mediaContentType.startsWith("video/")) {
      mediaType = "video";
      content = body || "[Applicant sent a video]";
    } else {
      mediaType = "other";
      content = body || "[Applicant sent a file]";
    }
  }

  // Voice notes, photos and PDFs are read before the AI turn runs, so the intake
  // engine sees their contents as if the applicant had typed them.
  let transcript: string | null = null;
  let mediaMimeType: string | null = null;
  let mediaBytes: number | null = null;
  let mediaNotice: string | null = null;

  if (mediaUrl && (mediaType === "image" || mediaType === "document" || mediaType === "audio")) {
    try {
      const downloaded = await downloadWhatsAppMedia(mediaUrl, mediaContentType || "");
      mediaMimeType = downloaded.mimeType;
      mediaBytes = downloaded.bytes;

      const extracted = await extractFromMedia(downloaded);
      if (extracted.text) {
        transcript = wrapExtractedText(extracted.kind, extracted.text);
      } else {
        mediaNotice =
          mediaType === "audio"
            ? "Sorry, I couldn't make out that voice note. Could you try again, or type your answer?"
            : "Sorry, I couldn't read that clearly. Could you send a sharper photo, or type the details?";
      }
    } catch (err) {
      if (err instanceof MediaTooLargeError) {
        mediaNotice = "That file is too large for me to open. Could you send a smaller one, or type the details?";
      } else if (err instanceof UnsupportedMediaError) {
        mediaNotice = "I can read voice notes, photos and PDF files. Could you send it in one of those, or just type it?";
      } else {
        console.error("[webhook] Media processing failed:", err);
        mediaNotice = "Sorry, I had trouble opening that. Could you type the details instead?";
      }
    }
  } else if (mediaType === "video" || mediaType === "other") {
    mediaNotice = "I can't open that, but I can read voice notes, photos and PDFs. Could you send one of those, or type your answer?";
  }

  // Deduplicate by message SID
  const existingMessage = await prisma.message.findUnique({
    where: { waMessageId },
  });

  if (existingMessage) {
    console.log(`⏭ Duplicate message skipped: ${waMessageId}`);
    return;
  }

  // Upsert conversation — find existing by clientWaNumber or create new
  let conversation = await prisma.conversation.findFirst({
    where: {
      clientWaNumber,
      status: { not: "CLOSED" }, // Don't reuse closed conversations
    },
    orderBy: { createdAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        clientWaNumber,
        clientName: contactName,
        status: "ACTIVE",
        aiEnabled: true, // AI is on by default for new conversations
        lastClientMessageAt: new Date(),
      },
    });

    console.log(`🆕 New conversation created for ${clientWaNumber}`);

    await pusherServer.trigger("private-admin", "new_conversation", {
      conversationId: conversation.id,
      clientWaNumber,
      clientName: contactName,
      createdAt: conversation.createdAt,
    });
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastClientMessageAt: new Date(),
        clientName: contactName || conversation.clientName,
      },
    });
  }

  const savedMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "inbound",
      senderType: "CLIENT",
      content,
      mediaUrl,
      mediaType,
      transcript,
      mediaMimeType,
      mediaBytes,
      waMessageId,
      status: "DELIVERED",
    },
  });

  // Real-time: push to conversation channel
  await pusherServer.trigger(
    `presence-conversation-${conversation.id}`,
    "message_received",
    {
      id: savedMessage.id,
      content: savedMessage.content,
      senderType: "CLIENT",
      direction: "inbound",
      createdAt: savedMessage.createdAt,
    }
  );

  // Media we could not read at all — tell the applicant how to retry and stop.
  // (Media we DID read has a transcript, so it falls through to the AI turn.)
  if (mediaNotice) {
    try {
      const sid = await sendTextMessage(clientWaNumber, mediaNotice);
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "outbound",
          senderType: "AI_BOT",
          content: mediaNotice,
          waMessageId: sid,
          status: "SENT",
        },
      });
      await pusherServer.trigger(
        `presence-conversation-${conversation.id}`,
        "message_received",
        { id: sid, content: mediaNotice, senderType: "AI_BOT", direction: "outbound", createdAt: new Date() }
      );
    } catch (e) {
      console.warn("[webhook] Failed to send media notice:", e);
    }
    return;
  }

  // Nothing readable for the AI to work with.
  if (!body && !transcript) {
    return;
  }

  // Always notify assigned salesperson so inbox re-sorts (regardless of AI state)
  if (conversation.assignedToId) {
    await pusherServer.trigger(
      `private-sales-${conversation.assignedToId}`,
      "new_message",
      {
        conversationId: conversation.id,
        content: savedMessage.content,
        clientWaNumber,
        clientName: conversation.clientName,
        createdAt: savedMessage.createdAt,
      }
    );
  }

  // If AI is enabled for this conversation → queue AI reply
  if (conversation.aiEnabled) {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true },
    });

    if (config?.aiEnabled !== false) {
      after(async () => {
        await processAIReply(conversation.id, clientWaNumber);
      });
      console.log(`🤖 AI reply scheduled for conversation ${conversation.id}`);
    }
  }
}

// ==========================================
// Handle status callbacks (sent/delivered/read/failed)
// ==========================================
async function handleStatusUpdate(messageSid: string, status: string) {
  const statusMap: Record<string, string> = {
    sent: "SENT",
    delivered: "DELIVERED",
    read: "READ",
    failed: "FAILED",
    undelivered: "FAILED",
  };

  const dbStatus = statusMap[status];
  if (!dbStatus || !messageSid) return;

  try {
    await prisma.message.updateMany({
      where: { waMessageId: messageSid },
      data: { status: dbStatus as "SENT" | "DELIVERED" | "READ" | "FAILED" },
    });

    const msg = await prisma.message.findUnique({
      where: { waMessageId: messageSid },
      select: { conversationId: true },
    });

    if (msg) {
      await pusherServer.trigger(
        `presence-conversation-${msg.conversationId}`,
        "message_status_update",
        {
          waMessageId: messageSid,
          status: dbStatus,
        }
      );
    }
  } catch {
    // Message might not exist yet — ignore
  }
}
