import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createBookingSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  service: z.string().min(1, "Service is required"),
  scheduledAt: z.string().datetime().or(z.string().min(1)),
  notes: z.string().optional(),
});

// GET — a sales person sees their own bookings; an admin sees everyone's
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role: string }).role;
  const userId = session.user.id as string;

  const bookings = await prisma.booking.findMany({
    where: role === "ADMIN" ? {} : { assignedToId: userId },
    orderBy: { scheduledAt: "asc" },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  return NextResponse.json(bookings);
}

// POST — create a booking assigned to the current user
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createBookingSchema.parse(body);

    const booking = await prisma.booking.create({
      data: {
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone || null,
        service: data.service,
        scheduledAt: new Date(data.scheduledAt),
        notes: data.notes || null,
        assignedTo: { connect: { id: session.user.id as string } },
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Create booking error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
