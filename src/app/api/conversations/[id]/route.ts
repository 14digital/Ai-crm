import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as { role: string }).role;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Sales person can only see their own conversations
  if (role === "SALES_PERSON" && conversation.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Attach the persistent applicant profile (collected form data + Care360 status)
  const profile = await prisma.applicantProfile.findUnique({
    where: { waNumber: conversation.clientWaNumber },
    select: {
      formData: true,
      formComplete: true,
      care360ApplicantId: true,
      care360SubmittedAt: true,
      lastSubmitError: true,
    },
  });

  // Any bookings already created for this WhatsApp number, so the UI can show
  // whether the booking draft on this conversation actually turned into one.
  const bookings = await prisma.booking.findMany({
    where: { customerPhone: `+${conversation.clientWaNumber}` },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ...conversation, applicantProfile: profile, bookings });
}
