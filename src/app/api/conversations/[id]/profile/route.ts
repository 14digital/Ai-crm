import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, mergeProfileUpdates } from "@/lib/applicant-profile";
import {
  ApplicantField,
  ApplicantFormData,
  FIELD_LABELS,
  validateField,
} from "@/lib/applicant-form";

// PATCH /api/conversations/:id/profile
// Manual correction of collected answers from the inbox panel — a recruiter
// fixing something the applicant garbled, or filling a gap themselves.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, clientWaNumber: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const profile = await getOrCreateProfile(conversation.clientWaNumber);

  if (profile.care360ApplicantId) {
    return NextResponse.json(
      { error: "Application already submitted to Care360 — the form is locked." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const updates = body.updates as Partial<ApplicantFormData>;

  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "updates object required" }, { status: 400 });
  }

  // A human edit is validated exactly like an AI extraction — a bad value here
  // would otherwise sail straight through to Care360.
  const context = { ...profile.formData, ...updates };
  const invalid = (Object.keys(updates) as ApplicantField[])
    .map((field) => ({ field, message: validateField(field, updates[field], context) }))
    .filter((e): e is { field: ApplicantField; message: string } => e.message !== null);

  if (invalid.length > 0) {
    return NextResponse.json(
      {
        error: "Some values are not valid",
        fieldErrors: invalid.map((e) => `${FIELD_LABELS[e.field]}: ${e.message}`),
      },
      { status: 400 }
    );
  }

  const updated = await mergeProfileUpdates(conversation.clientWaNumber, updates);

  return NextResponse.json({
    profile: {
      formData: updated.formData,
      formComplete: updated.formComplete,
      care360ApplicantId: updated.care360ApplicantId,
      care360SubmittedAt: updated.care360SubmittedAt,
    },
  });
}
