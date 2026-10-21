import { prisma } from "@/lib/prisma";
import { DEFAULT_AI_MODEL } from "@/lib/models";
import { pusherServer } from "@/lib/pusher";
import { sendPushToUser } from "@/lib/push";
import { composeReply, extractFormData } from "@/lib/ai";
import { sendTextMessage, isWindowOpen } from "@/lib/whatsapp";
import { assignConversationRoundRobin } from "@/lib/assignment";
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

// How many fields the model is allowed to ask about in one message. The web form
// asks everything at once; on WhatsApp that reads as an interrogation.
const ASK_BATCH = 2;

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
Resolve every date the applicant gives — absolute ("3rd Jan 1990", "01/08/2026") or relative ("next month", "in two weeks", "asap") — into YYYY-MM-DD against today. Dates are UK format: day comes first.
===== END CURRENT DATE =====`;
}

/**
 * Show the model what is already on file, using display names rather than the
 * Care360 ids, so it can reference answers naturally instead of reciting codes.
 */
async function buildMemoryContext(
  waNumber: string,
  data: ApplicantFormData,
  submittedId: string | null
): Promise<string> {
  const shown: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!isFilled(v)) continue;
    shown[k] = v;
  }

  // Swap resolved ids back to human names.
  const idFields: [ApplicantField, "nationality" | "ethnicity" | "religion" | "branch"][] = [
    ["carerCountryId", "nationality"],
    ["carerEthnicGroup", "ethnicity"],
    ["carerReligiousGroup", "religion"],
    ["carerBranchId", "branch"],
  ];
  for (const [field, type] of idFields) {
    const value = data[field];
    if (typeof value === "string" && value) {
      const name = await nameForId(type, value);
      if (name) shown[field] = name;
    }
  }

  const memoryJson = Object.keys(shown).length
    ? JSON.stringify(shown, null, 2)
    : "(nothing yet — this is a brand new application)";

  return `\n\n===== ALREADY COLLECTED (do not ask again) =====
WhatsApp number: +${waNumber}
${memoryJson}

Submitted to Care360: ${submittedId ?? "not yet"}
===== END ALREADY COLLECTED =====`;
}

function buildNextToAsk(data: ApplicantFormData): string {
  const missing = missingRequired(data);

  if (missing.length === 0) {
    return `\n\n===== NEXT TO ASK =====
(nothing — every required field is collected)

Send a short read-back summary of the key details and ask them to confirm you can submit. Set ready_to_submit true only once they confirm.
===== END NEXT TO ASK =====`;
  }

  const batch = missing.slice(0, ASK_BATCH);
  const lines = batch.map((f) => `- ${f} (${FIELD_LABELS[f]})`).join("\n");
  const later = missing.slice(ASK_BATCH).map((f) => FIELD_LABELS[f]).join(", ") || "none";

  return `\n\n===== NEXT TO ASK =====
Your "message" should ask about these fields, and only these:
${lines}

Do not ask about anything else yet. Still outstanding for later turns: ${later}

This block governs your QUESTION only. It does NOT restrict form_updates — put every
field the applicant has given you this turn in form_updates, including fields from
this outstanding list, if they have already answered them.
===== END NEXT TO ASK =====`;
}

/**
 * Reject values that fail validation instead of storing them, and return the
 * message to append so the applicant is told exactly what to fix.
 */
function screenInvalid(
  updates: Partial<ApplicantFormData>,
  stored: ApplicantFormData
): { clean: Partial<ApplicantFormData>; problems: string[] } {
  const clean = { ...updates };
  const problems: string[] = [];
  const context = { ...stored, ...updates };

  for (const key of Object.keys(updates) as ApplicantField[]) {
    const message = validateField(key, updates[key], context);
    if (message) {
      delete clean[key];
      problems.push(message);
    }
  }

  return { clean, problems };
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
  const title = "Applicant needs a human";
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

export async function processAIReply(
  conversationId: string,
  clientWaNumber: string
): Promise<void> {
  try {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      console.warn(`[intake] Conversation ${conversationId} not found — skipping`);
      return;
    }

    if (!conversation.aiEnabled) {
      console.log(`[intake] aiEnabled=false for ${conversationId} — skipping`);
      return;
    }

    if (!isWindowOpen(conversation.lastClientMessageAt)) {
      console.log(`[intake] 24h window expired for ${conversationId} — skipping`);
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { aiEnabled: false },
      });
      return;
    }

    const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true } });
    const model = config?.aiModel || DEFAULT_AI_MODEL;
    const basePrompt = config?.aiSystemPrompt?.trim()
      ? config.aiSystemPrompt
      : (await import("@/lib/prompts")).APPLICANT_INTAKE_PROMPT;

    const profile = await getOrCreateProfile(clientWaNumber);

    // Already submitted — nothing left to collect, so acknowledge and stop.
    if (profile.care360ApplicantId) {
      await sendAndRecord(
        conversationId,
        clientWaNumber,
        "Thanks for getting in touch. Your application has already been submitted and our recruitment team will contact you soon. If you need anything else, just let me know and I'll pass it on."
      );
      return;
    }

    const rawMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { senderType: true, content: true, transcript: true },
    });
    const messages = rawMessages.reverse();
    const dateContext = buildDateContext();

    // 1. Read what the applicant just told us. `pending` is what we asked about
    //    last turn — a bare "yes" or a date only counts as an answer to one of
    //    those, so it is never attached to the wrong field.
    const pending = missingRequired(profile.formData).slice(0, ASK_BATCH);
    const extracted = await extractFormData(messages.slice(-6), profile.formData, pending);

    // 2. Resolve free text → Care360 ids, then reject anything that fails validation.
    const { resolved, unresolved } = await resolveFormIds(extracted, profile.formData);
    const { clean, problems } = screenInvalid(resolved, profile.formData);

    // 3. Store it BEFORE composing the reply, so the next question accounts for
    //    everything we just learned — otherwise a CV gets read and the bot still
    //    asks for the date of birth that was in it.
    const updated =
      Object.keys(clean).length > 0
        ? await mergeProfileUpdates(clientWaNumber, clean)
        : profile;

    // 4. Now decide what to say.
    const systemPrompt =
      basePrompt +
      dateContext +
      (await buildMemoryContext(clientWaNumber, updated.formData, updated.care360ApplicantId)) +
      buildNextToAsk(updated.formData);

    const aiResult = await composeReply(messages, systemPrompt, model);

    // Anything we refused to store is explained to the applicant in the same
    // message, so they can correct it on their next turn.
    const corrections = [...problems, ...unresolved];
    const outgoing = corrections.length
      ? `${aiResult.message}\n\n${corrections.join("\n")}`
      : aiResult.message;

    await sendAndRecord(conversationId, clientWaNumber, outgoing);

    console.log(
      `[intake] ${conversationId} — stored ${Object.keys(clean).length} field(s), ${missingRequired(updated.formData).length} still missing`
    );

    // Auto-submit: the applicant confirmed AND the data actually holds up.
    if (
      aiResult.ready_to_submit &&
      corrections.length === 0 &&
      allRequiredFilled(updated.formData)
    ) {
      const outcome = await submitApplicantForNumber(clientWaNumber);

      if (outcome.ok) {
        await sendAndRecord(
          conversationId,
          clientWaNumber,
          "Your application has been submitted. Our recruitment team will review it and be in touch soon. Thank you for applying to Assisted Lives."
        );
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { leadStatus: "CONVERTED" },
        });
      } else {
        console.warn(`[intake] Auto-submit failed for ${clientWaNumber}: ${outcome.message}`);
        await sendAndRecord(conversationId, clientWaNumber, outcome.applicantMessage);

        // A backend rejection needs a person to look at it; a merely incomplete
        // form does not — the bot just keeps asking.
        if (outcome.reason === "rejected" || outcome.reason === "duplicate") {
          await flagForHuman(
            conversationId,
            clientWaNumber,
            conversation.clientName,
            `Submission failed: ${outcome.message}`,
            !!conversation.assignedToId
          );
        }
      }
      return;
    }

    if (aiResult.needs_human) {
      await flagForHuman(
        conversationId,
        clientWaNumber,
        conversation.clientName,
        aiResult.needs_human_reason || "Applicant asked for a human",
        !!conversation.assignedToId
      );
    }
  } catch (err) {
    // Runs inside after() — the response has already gone out, so we cannot throw.
    console.error(`[intake] processAIReply failed for ${conversationId}:`, err);
  }
}
