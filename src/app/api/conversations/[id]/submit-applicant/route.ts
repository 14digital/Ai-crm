import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitApplicantForNumber } from "@/lib/applicant-submit";

// POST /api/conversations/:id/submit-applicant
//
// The manual override. The bot normally submits by itself the moment the
// applicant confirms; this is the retry path when that failed, or for a recruiter
// who filled in the last gaps by hand.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { id: true, clientWaNumber: true, assignedToId: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const role = (session.user as { role: string }).role;
  if (role === "SALES_PERSON" && conversation.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const outcome = await submitApplicantForNumber(conversation.clientWaNumber);

  if (outcome.ok) {
    await prisma.conversation.update({
      where: { id },
      data: { leadStatus: "CONVERTED" },
    });
    return NextResponse.json({
      success: true,
      care360ApplicantId: outcome.applicantId,
      message: outcome.message,
    });
  }

  // 409 for "nothing to do", 400 for "fix the data", 502 for "Care360 said no".
  const status =
    outcome.reason === "already_submitted" || outcome.reason === "in_flight"
      ? 409
      : outcome.reason === "rejected"
        ? 502
        : 400;

  return NextResponse.json(
    {
      error: outcome.message,
      reason: outcome.reason,
      missingFields: outcome.missingFields,
      fieldErrors: outcome.errors,
    },
    { status }
  );
}
