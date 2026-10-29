import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBookingStatusEmail } from "@/lib/mail";
import { z } from "zod";

const updateBookingSchema = z.object({
  customerName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  service: z.string().min(1).optional(),
  scheduledAt: z.string().min(1).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
  sendEmail: z.boolean().optional(),
});

async function loadOwnedBooking(id: string, userId: string, role: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return null;
  if (role !== "ADMIN" && booking.assignedToId !== userId) return undefined;
  return booking;
}

// PATCH — update a booking (owner or admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as { role: string }).role;
  const userId = session.user.id as string;

  const existing = await loadOwnedBooking(id, userId, role);
  if (existing === null) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (existing === undefined) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = updateBookingSchema.parse(body);

    const { sendEmail, ...updateData } = data;

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...updateData,
        scheduledAt: updateData.scheduledAt ? new Date(updateData.scheduledAt) : undefined,
      },
    });

    let emailError: string | undefined;
    if (sendEmail && data.status) {
      if (!booking.customerEmail) {
        emailError = "No email on file for this customer";
      } else {
        try {
          await sendBookingStatusEmail({
            to: booking.customerEmail,
            customerName: booking.customerName,
            service: booking.service,
            scheduledAt: booking.scheduledAt,
            status: booking.status,
          });
        } catch (err) {
          console.error("Booking status email failed:", err);
          emailError = "Email could not be sent";
        }
      }
    }

    return NextResponse.json({ ...booking, emailError });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Update booking error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — remove a booking (owner or admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as { role: string }).role;
  const userId = session.user.id as string;

  const existing = await loadOwnedBooking(id, userId, role);
  if (existing === null) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (existing === undefined) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.booking.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
