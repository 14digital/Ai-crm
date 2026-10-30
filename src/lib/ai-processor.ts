import { prisma } from "@/lib/prisma";
import { DEFAULT_AI_MODEL } from "@/lib/models";
import { pusherServer } from "@/lib/pusher";
import { sendPushToUser } from "@/lib/push";
import { composeBookingReply, BookingDraft } from "@/lib/booking-ai";
import { sendTextMessage, isWindowOpen } from "@/lib/whatsapp";
import { assignConversationRoundRobin, pickRoundRobinSalesPerson } from "@/lib/assignment";
import { BOOKING_PROMPT } from "@/lib/prompts";
import * as chrono from "chrono-node";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Deterministic fallback for scheduledAt: the model's JSON often fails to
 * resolve a date and time that arrived in separate messages (or just drops
 * them even after clear confirmation), so when the structured draft still
 * has no date/time after a turn, parse the customer's own recent messages
 * directly with chrono instead of trusting the model for this.
 */
function extractScheduledAt(clientTexts: string[], refDate: Date): string | undefined {
  let knownDate: Date | null = null;
  let knownHour: number | null = null;
  let knownMinute = 0;

  for (const text of clientTexts) {
    const results = chrono.parse(text, refDate, { forwardDate: true });
    for (const r of results) {
      const comp = r.start;
      if (comp.isCertain("day") || comp.isCertain("weekday")) {
        knownDate = comp.date();
        if (comp.isCertain("hour")) {
          knownHour = comp.get("hour")!;
          knownMinute = comp.get("minute") || 0;
        }
      } else if (comp.isCertain("hour")) {
        knownHour = comp.get("hour")!;
        knownMinute = comp.get("minute") || 0;
      }
    }
  }

  if (!knownDate || knownHour === null) return undefined;
  const d = new Date(knownDate);
  d.setHours(knownHour, knownMinute, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function buildDateContext(): string {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const readable = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `\n\n===== CURRENT DATE =====
Today is ${readable} (${iso}).
Resolve every date the customer gives — absolute ("3rd Jan", "05/11/2026") or relative ("next Friday", "tomorrow", "in two weeks") — against today. Dates are UK format: day comes first.
===== END CURRENT DATE =====`;
}

function buildDraftContext(draft: BookingDraft): string {
  const known = Object.entries(draft)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `\n\n===== ALREADY COLLECTED (do not ask again) =====
${known || "(nothing yet — this is a brand new booking)"}
===== END ALREADY COLLECTED =====`;
}

/** So the model can answer "what bookings do I have" without guessing. */
async function buildBookingHistoryContext(clientWaNumber: string): Promise<string> {
  const bookings = await prisma.booking.findMany({
    where: { customerPhone: { contains: clientWaNumber } },
    orderBy: { scheduledAt: "asc" },
    select: { service: true, scheduledAt: true, status: true },
  });

  if (bookings.length === 0) {
    return `\n\n===== THIS CUSTOMER'S PAST BOOKINGS =====
(none yet)
===== END PAST BOOKINGS =====`;
  }

  const list = bookings
    .map(
      (b) =>
        `- ${b.service} on ${b.scheduledAt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} at ${b.scheduledAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} — ${b.status}`
    )
    .join("\n");

  return `\n\n===== THIS CUSTOMER'S PAST BOOKINGS =====
${list}
===== END PAST BOOKINGS =====`;
}

async function flagForHuman(
  conversationId: string,
  clientWaNumber: string,
  clientName: string | null,
  reason: string,
  alreadyAssigned: boolean
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      needsHumanAt: new Date(),
      needsHumanReason: reason.slice(0, 500),
      ...(alreadyAssigned ? {} : { status: "UNASSIGNED_QUEUE" }),
    },
  });

  const who = clientName || `+${clientWaNumber}`;
  const title = "Customer needs a human";
  const body = `${who}: ${reason}`;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  await Promise.all(
    admins.map(async (admin) => {
      await prisma.notification.create({
        data: { userId: admin.id, title, body, type: "needs_human", conversationId },
      });
      await sendPushToUser(admin.id, {
        title,
        body,
        url: alreadyAssigned ? "/conversations" : "/queue",
      });
    })
  );

  await pusherServer.trigger("private-admin", "new_notification", { title, body, conversationId });
  await pusherServer.trigger("private-admin", "needs_human", {
    conversationId,
    clientName,
    clientWaNumber,
    reason,
  });

  if (!alreadyAssigned) {
    await assignConversationRoundRobin(conversationId);
  }
}

/** Persist an outbound bot message, send it, and broadcast it to the inbox. */
async function sendAndRecord(
  conversationId: string,
  clientWaNumber: string,
  text: string
): Promise<void> {
  const saved = await prisma.message.create({
    data: {
      conversationId,
      direction: "outbound",
      senderType: "AI_BOT",
      content: text,
      status: "PENDING",
    },
  });

  const wamid = await sendTextMessage(clientWaNumber, text);

  await prisma.message.update({
    where: { id: saved.id },
    data: { waMessageId: wamid, status: "SENT" },
  });

  await pusherServer.trigger(`presence-conversation-${conversationId}`, "message_received", {
    id: saved.id,
    content: text,
    senderType: "AI_BOT",
    direction: "outbound",
    createdAt: saved.createdAt,
  });
}

/** Notify a newly-assigned sales person about a booking, the same way conversation assignment does. */
async function notifyBookingAssigned(
  assignedToId: string,
  assignedToName: string,
  draft: BookingDraft
): Promise<void> {
  const title = "New Booking Assigned";
  const body = `${draft.customerName || "A customer"} booked ${draft.service || "an appointment"} — assigned to you.`;

  await prisma.notification.create({
    data: { userId: assignedToId, title, body, type: "booking_assigned" },
  });
  await pusherServer.trigger(`private-sales-${assignedToId}`, "new_notification", { title, body });
  await pusherServer.trigger(`private-sales-${assignedToId}`, "booking_assigned", { title, body });
  await sendPushToUser(assignedToId, { title, body, url: "/bookings" });

  console.log(`✅ Booking assigned to ${assignedToName} (round-robin)`);
}

export async function processAIReply(
  conversationId: string,
  clientWaNumber: string
): Promise<void> {
  try {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      console.warn(`[booking] Conversation ${conversationId} not found — skipping`);
      return;
    }

    if (!conversation.aiEnabled) {
      console.log(`[booking] aiEnabled=false for ${conversationId} — skipping`);
      return;
    }

    if (!isWindowOpen(conversation.lastClientMessageAt)) {
      console.log(`[booking] 24h window expired for ${conversationId} — skipping`);
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { aiEnabled: false },
      });
      return;
    }

    const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true } });
    const model = config?.aiModel || DEFAULT_AI_MODEL;
    const basePrompt = config?.aiSystemPrompt?.trim() ? config.aiSystemPrompt : BOOKING_PROMPT;

    const draft = (conversation.bookingDraft as BookingDraft | null) || {};

    const rawMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { senderType: true, content: true, transcript: true },
    });
    const messages = rawMessages.reverse();

    const systemPrompt =
      basePrompt +
      buildDateContext() +
      buildDraftContext(draft) +
      (await buildBookingHistoryContext(clientWaNumber));

    let aiResult;
    let lastErr: unknown;
    const ATTEMPTS = 3;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        aiResult = await composeBookingReply(messages, systemPrompt, model);
        break;
      } catch (err) {
        lastErr = err;
        // Gemini overload/timeout (503/504) is usually a few seconds, not
        // systemic — a couple of quick retries recover most of them instead of
        // leaving the customer with a "something went wrong" message.
        console.warn(`[booking] Attempt ${attempt}/${ATTEMPTS} failed for ${conversationId}:`, err);
        if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 2000));
      }
    }
    if (!aiResult) throw lastErr;

    // Merge whatever the model just read out of the latest message into the draft.
    // The customer's phone is always known from their WhatsApp number — the
    // model occasionally echoes digits the customer sent into customerName or
    // service (e.g. "Hair Treatment 03135232204") when asked for both in one
    // message; strip any trailing phone-number-shaped tail so it never
    // pollutes those fields.
    const sanitized = { ...aiResult.booking };
    for (const key of ["customerName", "service"] as const) {
      if (sanitized[key]) {
        sanitized[key] = sanitized[key].replace(/\s*[+\d][\d\s-]{6,}$/, "").trim();
      }
    }
    // The model occasionally dumps its own reasoning into a field instead of
    // just the value (e.g. service becoming a paragraph of "wait, looking at
    // the history..."). A real service name is short — anything that reads
    // like prose is not one, so drop it rather than save garbage.
    if (sanitized.service && (sanitized.service.length > 60 || /\b(wait|looking at|i have|confirming)\b/i.test(sanitized.service))) {
      delete sanitized.service;
    }
    // A field the model re-emits blank/whitespace (it was only asked to repeat
    // what's already known, never to clear it) must never overwrite a value we
    // already have — drop empty entries instead of letting them win the merge.
    for (const key of Object.keys(sanitized) as (keyof BookingDraft)[]) {
      if (!sanitized[key]?.trim()) delete sanitized[key];
    }
    // The model's prose repeatedly says "I've noted your email" without
    // actually putting it in the structured JSON — don't depend on it for
    // something this mechanical. An email is unambiguous to spot with a
    // regex, so pull it straight from the customer's own latest message
    // whenever one appears, regardless of what the model returned.
    const lastClientMessage = [...messages].reverse().find((m) => m.senderType === "CLIENT");
    const emailMatch = lastClientMessage?.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) sanitized.customerEmail = emailMatch[0];

    const updatedDraft: BookingDraft = { ...draft, ...sanitized };

    // Same unreliability for date/time: the model regularly confirms a date
    // and time in its reply text without the JSON ever carrying scheduledAt,
    // even across several turns and an explicit "yes" from the customer. If
    // it's still missing, parse the recent conversation text directly — the
    // date often comes from the BOT's own message (e.g. "we have
    // availability tomorrow") with the customer only confirming ("3pm",
    // "yes"), so both sides need scanning, not just the customer's.
    if (!updatedDraft.scheduledAt) {
      const conversationTexts = messages
        .map((m) => m.transcript?.trim() || m.content)
        .filter((t): t is string => !!t);
      const parsed = extractScheduledAt(conversationTexts, new Date());
      if (parsed) updatedDraft.scheduledAt = parsed;
    }

    if (JSON.stringify(updatedDraft) !== JSON.stringify(draft)) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { bookingDraft: updatedDraft as object },
      });
    }

    await sendAndRecord(conversationId, clientWaNumber, aiResult.message);

    console.log(
      `[booking] ${conversationId} — draft now: ${JSON.stringify(updatedDraft)}`
    );

    const scheduledDate = updatedDraft.scheduledAt ? new Date(updatedDraft.scheduledAt) : null;
    const draftComplete =
      !!updatedDraft.customerName &&
      !!updatedDraft.customerEmail &&
      !!updatedDraft.service &&
      !!scheduledDate &&
      !isNaN(scheduledDate.getTime());

    if (aiResult.ready_to_book && draftComplete && scheduledDate) {
      const assignee = await pickRoundRobinSalesPerson();

      if (!assignee) {
        // No one to hand the booking to — flag for a human instead of creating
        // an orphaned booking (assignedToId is required on Booking).
        await flagForHuman(
          conversationId,
          clientWaNumber,
          conversation.clientName,
          `Booking ready (${updatedDraft.service} for ${updatedDraft.customerName}) but no sales person is active`,
          !!conversation.assignedToId
        );
        return;
      }

      await prisma.booking.create({
        data: {
          customerName: updatedDraft.customerName!,
          customerEmail: updatedDraft.customerEmail!,
          customerPhone: `+${clientWaNumber}`,
          service: updatedDraft.service!,
          scheduledAt: scheduledDate,
          notes: updatedDraft.notes || null,
          assignedTo: { connect: { id: assignee.id } },
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { bookingDraft: {}, leadStatus: "CONVERTED" },
      });

      await notifyBookingAssigned(assignee.id, assignee.name, updatedDraft);

      await sendAndRecord(
        conversationId,
        clientWaNumber,
        `You're booked in — ${updatedDraft.service} on ${scheduledDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at ${scheduledDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Our team will be in touch to confirm. See you soon!`
      );
      return;
    }

    // The model said the booking is confirmed but our own data says it's
    // incomplete (e.g. it never resolved scheduledAt) — the customer has
    // just been told they're booked when nothing was actually created, so
    // get a human on it rather than silently dropping it.
    if (aiResult.ready_to_book && !draftComplete) {
      console.warn(
        `[booking] ${conversationId} — ready_to_book but draft incomplete: ${JSON.stringify(updatedDraft)}`
      );
      await flagForHuman(
        conversationId,
        clientWaNumber,
        conversation.clientName,
        `AI told the customer they're booked, but the draft is missing required fields: ${JSON.stringify(updatedDraft)}`,
        !!conversation.assignedToId
      );
      return;
    }

    if (aiResult.needs_human) {
      await flagForHuman(
        conversationId,
        clientWaNumber,
        conversation.clientName,
        aiResult.needs_human_reason || "Customer asked for a human",
        !!conversation.assignedToId
      );
    }
  } catch (err) {
    // Runs fire-and-forget after the webhook has already responded, so we
    // cannot throw — but the customer still needs SOMETHING, or their message
    // just goes unanswered until they happen to try again.
    console.error(`[booking] processAIReply failed for ${conversationId}:`, err);
    try {
      await sendAndRecord(
        conversationId,
        clientWaNumber,
        "Sorry, I'm having a little trouble right now — could you give me a moment and try that again?"
      );
    } catch (sendErr) {
      console.error(`[booking] Fallback message also failed for ${conversationId}:`, sendErr);
    }
  }
}

/* ===========================================================================
 * LEGACY — job-applicant intake flow (commented out, kept for reference/rollback)
 * Used ApplicantProfile + Care360 submission instead of Booking. See
 * applicant-form.ts, applicant-profile.ts, applicant-submit.ts, care360.ts,
 * care360-resolve.ts, and `extractFormData` in ai.ts — all still intact,
 * just unused while the booking flow above is active.
 * ===========================================================================

import { composeReply, extractFormData } from "@/lib/ai";
import { getOrCreateProfile, mergeProfileUpdates } from "@/lib/applicant-profile";
import { submitApplicantForNumber } from "@/lib/applicant-submit";
import { resolveFormIds } from "@/lib/care360-resolve";
import { nameForId } from "@/lib/care360";
import {
  ApplicantField,
  ApplicantFormData,
  FIELD_LABELS,
  allRequiredFilled,
  isFilled,
  missingRequired,
  validateField,
} from "@/lib/applicant-form";

const ASK_BATCH = 2;

async function buildMemoryContext(waNumber, data, submittedId) { ... }
function buildNextToAsk(data) { ... }
function screenInvalid(updates, stored) { ... }

export async function processAIReply(conversationId, clientWaNumber) {
  // 1. Load conversation, config (APPLICANT_INTAKE_PROMPT), ApplicantProfile.
  // 2. extractFormData() via regex, resolveFormIds() against Care360 lookups,
  //    screenInvalid() per-field validation, mergeProfileUpdates() to persist.
  // 3. composeReply() with ALREADY COLLECTED + NEXT TO ASK context blocks.
  // 4. On ready_to_submit + allRequiredFilled → submitApplicantForNumber(),
  //    confirm or flagForHuman() on rejection/duplicate.
  // 5. On needs_human → flagForHuman().
  // See git history before the Meta/booking migration for the full body.
}

 * =========================================================================== */
