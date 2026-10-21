import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { sendPushToUser } from "@/lib/push";
import { submitApplicant } from "@/lib/care360";
import {
  ApplicantFormData,
  FIELD_LABELS,
  allRequiredFilled,
  missingRequired,
  validateAll,
} from "@/lib/applicant-form";
import {
  claimSubmitLock,
  findLocalDuplicate,
  getProfile,
  markSubmitted,
  releaseSubmitLock,
} from "@/lib/applicant-profile";

// The single submission path. Both the bot's auto-submit and the inbox button go
// through here so the guards, the locking and the notifications can never diverge.

export type SubmitOutcome =
  | { ok: true; applicantId: string; message: string }
  | {
      ok: false;
      /** Machine-readable so callers can decide between retrying and re-asking. */
      reason: "already_submitted" | "in_flight" | "incomplete" | "invalid" | "duplicate" | "rejected";
      message: string;
      /** Applicant-facing wording — safe to send straight to WhatsApp. */
      applicantMessage: string;
      missingFields?: string[];
      errors?: string[];
    };

function labelList(fields: (keyof ApplicantFormData)[]): string[] {
  return fields.map((f) => FIELD_LABELS[f]);
}

export async function submitApplicantForNumber(waNumber: string): Promise<SubmitOutcome> {
  const profile = await getProfile(waNumber);

  if (!profile) {
    return {
      ok: false,
      reason: "incomplete",
      message: "No application data has been collected for this number yet.",
      applicantMessage:
        "I don't have your application details yet. Let's start — what's your first name?",
    };
  }

  if (profile.care360ApplicantId) {
    return {
      ok: false,
      reason: "already_submitted",
      message: `Already submitted to Care360 (applicant id ${profile.care360ApplicantId}).`,
      applicantMessage:
        "Your application has already been submitted. Our recruitment team will be in touch soon.",
    };
  }

  const data = profile.formData;

  if (!allRequiredFilled(data)) {
    const missing = labelList(missingRequired(data));
    return {
      ok: false,
      reason: "incomplete",
      message: `Application is incomplete. Missing: ${missing.join(", ")}`,
      applicantMessage: "There are still a few things I need before I can submit your application.",
      missingFields: missing,
    };
  }

  const invalid = validateAll(data);
  if (invalid.length > 0) {
    return {
      ok: false,
      reason: "invalid",
      message: `Validation failed: ${invalid.map((e) => `${FIELD_LABELS[e.field]} — ${e.message}`).join("; ")}`,
      applicantMessage: invalid[0].message,
      errors: invalid.map((e) => `${FIELD_LABELS[e.field]}: ${e.message}`),
    };
  }

  // Care360 rejects duplicate NI numbers and emails. Catching it here gives the
  // applicant a clear answer instead of a raw backend error.
  const duplicate = await findLocalDuplicate(waNumber, data);
  if (duplicate) {
    const what =
      duplicate.field === "niNumber" ? "National Insurance number" : "email address";
    return {
      ok: false,
      reason: "duplicate",
      message: `Duplicate ${what} — already submitted from ${duplicate.waNumber}.`,
      applicantMessage: `It looks like an application has already been submitted with that ${what}. Our team will check this and get back to you.`,
    };
  }

  // Claim the lock last, so a failed pre-check never leaves it held.
  const claimed = await claimSubmitLock(waNumber);
  if (!claimed) {
    const fresh = await getProfile(waNumber);
    if (fresh?.care360ApplicantId) {
      return {
        ok: false,
        reason: "already_submitted",
        message: `Already submitted to Care360 (applicant id ${fresh.care360ApplicantId}).`,
        applicantMessage:
          "Your application has already been submitted. Our recruitment team will be in touch soon.",
      };
    }
    return {
      ok: false,
      reason: "in_flight",
      message: "A submission for this applicant is already in progress.",
      applicantMessage: "I'm submitting your application now — one moment.",
    };
  }

  const result = await submitApplicant(data);

  if (!result.ok || !result.applicantId) {
    const detail = [result.message, ...result.errors].filter(Boolean).join(" | ");
    await releaseSubmitLock(waNumber, detail.slice(0, 2000));

    // Care360 signals a duplicate with HTTP 200 + status:false and a message that
    // is already fit to show a person ("A carer with this NI Number already
    // exists."). Pass that straight through rather than burying it under a
    // generic failure — the applicant can act on it, a 500 they cannot.
    const isDuplicate = /already exists/i.test(result.message);

    return {
      ok: false,
      reason: isDuplicate ? "duplicate" : "rejected",
      message: detail || "Care360 rejected the application.",
      applicantMessage: isDuplicate
        ? `${result.message} Our recruitment team will look into this and get back to you.`
        : "Something went wrong submitting your application. Our team has been notified and will sort it out.",
      errors: result.errors,
    };
  }

  await markSubmitted(waNumber, result.applicantId);
  await notifyAdmins(waNumber, result.applicantId);

  return { ok: true, applicantId: result.applicantId, message: result.message };
}

async function notifyAdmins(waNumber: string, applicantId: string): Promise<void> {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { clientWaNumber: waNumber },
      orderBy: { createdAt: "desc" },
      select: { id: true, clientName: true },
    });

    const who = conversation?.clientName || `+${waNumber}`;
    const title = "Application submitted";
    const body = `${who} completed their application. Care360 id: ${applicantId}`;

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });

    await Promise.all(
      admins.map(async (admin) => {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title,
            body,
            type: "applicant_submitted",
            conversationId: conversation?.id ?? null,
          },
        });
        await sendPushToUser(admin.id, { title, body, url: "/conversations" });
      })
    );

    await pusherServer.trigger("private-admin", "new_notification", {
      title,
      body,
      conversationId: conversation?.id,
    });
    await pusherServer.trigger("private-admin", "applicant_submitted", {
      conversationId: conversation?.id,
      waNumber,
      applicantId,
    });
  } catch (err) {
    // Notification failure must never undo a successful submission.
    console.error("[applicant-submit] Failed to notify admins:", err);
  }
}
