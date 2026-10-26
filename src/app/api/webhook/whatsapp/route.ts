import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/whatsapp";
import { processAIReply } from "@/lib/ai-processor";
import { pusherServer } from "@/lib/pusher";
import {
  downloadWhatsAppMedia,
  resolveMediaUrl,
  MediaTooLargeError,
  UnsupportedMediaError,
} from "@/lib/whatsapp-media";
import { extractFromMedia, wrapExtractedText } from "@/lib/media-extract";

// ==========================================
// GET — Meta webhook verification handshake
// (Meta → Settings → Webhooks sends hub.mode / hub.verify_token / hub.challenge)
// ==========================================
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  // Plain health check (no verification params) or a failed handshake.
  if (!mode) {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/** Meta signs the raw body with the app secret: "sha256=" + HMAC-SHA256 hex digest. */
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) return true; // skip if not configured

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf-8").digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

// ==========================================
// Meta webhook payload types (trimmed to what we use)
// ==========================================
interface MetaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; filename?: string };
  audio?: { id: string; mime_type: string };
  video?: { id: string; mime_type: string };
}

interface MetaStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

interface MetaChangeValue {
  messaging_product: "whatsapp";
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: { profile: { name: string }; wa_id: string }[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}

interface MetaWebhookBody {
  object?: string;
  entry?: { id: string; changes: { value: MetaChangeValue; field: string }[] }[];
}

// ==========================================
// POST — incoming WhatsApp messages / status callbacks
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const signature = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(rawBody, signature)) {
      console.warn("❌ Invalid Meta webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body: MetaWebhookBody = JSON.parse(rawBody);

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const contactName = value.contacts?.[0]?.profile?.name || null;

        for (const message of value.messages || []) {
          await processIncomingMessage(message, contactName);
        }

        for (const status of value.statuses || []) {
          await handleStatusUpdate(status.id, status.status);
        }
      }
    }

    return new NextResponse("", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new NextResponse("", { status: 200 });
  }
}

// ==========================================
// Process a single incoming message
// ==========================================
async function processIncomingMessage(message: MetaMessage, contactName: string | null) {
  const clientWaNumber = message.from.replace(/[^\d]/g, "");
  const waMessageId = message.id;

  let content = "";
  let mediaType: string | null = null;
  let mediaId: string | null = null;
  let mediaContentType: string | null = null;

  if (message.type === "text") {
    content = message.text?.body?.trim() || "";
  } else if (message.type === "image" && message.image) {
    mediaType = "image";
    mediaId = message.image.id;
    mediaContentType = message.image.mime_type;
    content = "[Applicant sent a photo]";
  } else if (message.type === "document" && message.document) {
    mediaType = "document";
    mediaId = message.document.id;
    mediaContentType = message.document.mime_type;
    content = "[Applicant sent a document]";
  } else if (message.type === "audio" && message.audio) {
    mediaType = "audio";
    mediaId = message.audio.id;
    mediaContentType = message.audio.mime_type;
    content = "[Applicant sent a voice note]";
  } else if (message.type === "video" && message.video) {
    mediaType = "video";
    mediaId = message.video.id;
    mediaContentType = message.video.mime_type;
    content = "[Applicant sent a video]";
  } else {
    // Unsupported message type (location, contacts, interactive reply, etc.)
    mediaType = "other";
    content = "[Applicant sent a file]";
  }

  // Voice notes, photos and PDFs are read before the AI turn runs, so the intake
  // engine sees their contents as if the applicant had typed them.
  let transcript: string | null = null;
  let mediaUrl: string | null = null;
  let mediaMimeType: string | null = null;
  let mediaBytes: number | null = null;
  let mediaNotice: string | null = null;

  if (mediaId && (mediaType === "image" || mediaType === "document" || mediaType === "audio")) {
    try {
      const resolved = await resolveMediaUrl(mediaId);
      mediaUrl = resolved.url;
      const downloaded = await downloadWhatsAppMedia(resolved.url, mediaContentType || resolved.mimeType);
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

  // Deduplicate by message id
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
  if (!content && !transcript) {
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
      // Fire-and-forget, not awaited: Meta expects a fast webhook response
      // (a slow Gemini retry can take minutes), and this is a long-running
      // Node server — not serverless/edge — so the process stays alive to
      // finish the promise after the response is sent. next/server's after()
      // was tried here first but silently drops the callback behind this
      // app's custom proxy.ts, which doesn't implement the waitUntil hook
      // after() depends on.
      processAIReply(conversation.id, clientWaNumber).catch((err) => {
        console.error(`[booking] processAIReply (background) failed for ${conversation.id}:`, err);
      });
      console.log(`🤖 AI reply scheduled for conversation ${conversation.id}`);
    }
  }
}

// ==========================================
// Handle status callbacks (sent/delivered/read/failed)
// ==========================================
async function handleStatusUpdate(messageId: string, status: string) {
  const statusMap: Record<string, string> = {
    sent: "SENT",
    delivered: "DELIVERED",
    read: "READ",
    failed: "FAILED",
  };

  const dbStatus = statusMap[status];
  if (!dbStatus || !messageId) return;

  try {
    await prisma.message.updateMany({
      where: { waMessageId: messageId },
      data: { status: dbStatus as "SENT" | "DELIVERED" | "READ" | "FAILED" },
    });

    const msg = await prisma.message.findUnique({
      where: { waMessageId: messageId },
      select: { conversationId: true },
    });

    if (msg) {
      await pusherServer.trigger(
        `presence-conversation-${msg.conversationId}`,
        "message_status_update",
        {
          waMessageId: messageId,
          status: dbStatus,
        }
      );
    }
  } catch {
    // Message might not exist yet — ignore
  }
}

/* ===========================================================================
 * LEGACY — Twilio webhook handlers (commented out, kept for reference/rollback)
 * ===========================================================================

export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}

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

function bareNumber(address: string): string {
  return address.replace(/^whatsapp:/, "").replace(/[^\d]/g, "");
}

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

// (processIncomingMessage / handleStatusUpdate Twilio versions took
// Record<string,string> params in Twilio's form-encoded shape — see git
// history before the Meta Cloud API migration for the full implementation.)

 * =========================================================================== */
