import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// DELETE — permanently remove a sales person
// Conversations move to UNASSIGNED_QUEUE; messages/logs keep history with null userId
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Verify target is a SALES_PERSON (not an admin)
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!target || target.role !== "SALES_PERSON") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$transaction([
      // 1. Move their assigned conversations to unassigned queue
      prisma.conversation.updateMany({
        where: { assignedToId: id },
        data: {
          assignedToId: null,
          assignedAt: null,
          status: "UNASSIGNED_QUEUE",
        },
      }),
      // 2. Null out assignment history references (keep logs for audit)
      prisma.assignmentLog.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      }),
      // 3. Null out message sender references (messages stay in history)
      prisma.message.updateMany({
        where: { sentById: id },
        data: { sentById: null },
      }),
      // 4. Delete their notifications and push subscriptions
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.pushSubscription.deleteMany({ where: { userId: id } }),
      // 5. Delete the user
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Could not delete user" }, { status: 500 });
  }
}

// PATCH — update sales person (activate/deactivate, reset password)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    let newPassword: string | undefined;

    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }

    if (body.resetPassword === true) {
      newPassword = crypto.randomBytes(6).toString("hex");
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (body.name) {
      updateData.name = body.name;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, isActive: true },
    });

    return NextResponse.json({ ...user, ...(newPassword ? { generatedPassword: newPassword } : {}) });
  } catch (err) {
    console.error("Update user error:", err);
    return NextResponse.json({ error: "User not found or update failed" }, { status: 404 });
  }
}
