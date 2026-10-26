import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { sendPushToUser } from "@/lib/push";

export async function assignConversationRoundRobin(
  conversationId: string
): Promise<void> {
  // Get all active sales persons ordered by rrSequence (lower = next in line)
  const activeSalesPersons = await prisma.user.findMany({
    where: { role: "SALES_PERSON", isActive: true },
    orderBy: { rrSequence: "asc" },
  });

  if (activeSalesPersons.length === 0) {
    // No active sales persons — notify admins and keep UNASSIGNED_QUEUE
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: "No Sales Person Available",
            body: "A meeting was detected but no active sales person is available to assign.",
            type: "system",
            conversationId,
          },
        })
      )
    );

    await pusherServer.trigger("private-admin", "unassigned_queue_update", {
      conversationId,
      reason: "no_active_sales_persons",
    });

    // Real-time notification to admins
    await Promise.all(
      admins.map((admin) =>
        pusherServer.trigger("private-admin", "new_notification", {
          title: "No Sales Person Available",
          body: "A meeting was detected but no active sales person is available to assign.",
          conversationId,
        }).then(() => sendPushToUser(admin.id, {
          title: "No Sales Person Available",
          body: "A meeting was detected but no active sales person is available.",
          url: "/queue",
        }))
      )
    );

    return;
  }

  // Get current round-robin pointer from WhatsAppConfig
  const config = await prisma.whatsAppConfig.findFirst({
    where: { isActive: true },
  });

  const pointer = (config?.rrPointer ?? 0) % activeSalesPersons.length;
  const assignedTo = activeSalesPersons[pointer];
  const newPointer = (pointer + 1) % activeSalesPersons.length;

  // Assign conversation
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      assignedToId: assignedTo.id,
      assignedAt: new Date(),
      status: "ASSIGNED",
    },
  });

  // Advance the round-robin pointer
  if (config) {
    await prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: { rrPointer: newPointer },
    });
  }

  // Log the assignment
  await prisma.assignmentLog.create({
    data: {
      conversationId,
      assignedToId: assignedTo.id,
      method: "round_robin",
    },
  });

  // Notify the assigned sales person
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { clientName: true, clientWaNumber: true, needsHumanReason: true },
  });

  await prisma.notification.create({
    data: {
      userId: assignedTo.id,
      title: "New Conversation Assigned",
      body: `Applicant ${conversation?.clientName || conversation?.clientWaNumber} has been assigned to you.`,
      type: "assignment",
      conversationId,
    },
  });

  // Pusher: notify the assigned sales person's inbox
  await pusherServer.trigger(
    `private-sales-${assignedTo.id}`,
    "conversation_assigned",
    {
      conversationId,
      clientName: conversation?.clientName,
      clientWaNumber: conversation?.clientWaNumber,
      needsHumanReason: conversation?.needsHumanReason,
    }
  );

  // Real-time notification bell + browser push
  await pusherServer.trigger(`private-sales-${assignedTo.id}`, "new_notification", {
    title: "New Conversation Assigned",
    body: `Applicant ${conversation?.clientName || conversation?.clientWaNumber} has been assigned to you.`,
    conversationId,
  });
  await sendPushToUser(assignedTo.id, {
    title: "New Conversation Assigned",
    body: `Applicant ${conversation?.clientName || conversation?.clientWaNumber} has been assigned to you.`,
    url: "/inbox",
  });

  // Pusher: update admin's queue view
  await pusherServer.trigger("private-admin", "unassigned_queue_update", {
    conversationId,
    assignedToId: assignedTo.id,
    assignedToName: assignedTo.name,
  });

  console.log(
    `✅ Conversation ${conversationId} assigned to ${assignedTo.name} (round-robin)`
  );
}

/**
 * Pick the next active sales person for a new booking, round-robin, sharing the
 * same WhatsAppConfig.rrPointer used for conversation assignment. Returns null
 * if no sales person is active (caller should flag for a human instead).
 */
export async function pickRoundRobinSalesPerson(): Promise<{ id: string; name: string } | null> {
  const activeSalesPersons = await prisma.user.findMany({
    where: { role: "SALES_PERSON", isActive: true },
    orderBy: { rrSequence: "asc" },
    select: { id: true, name: true },
  });

  if (activeSalesPersons.length === 0) return null;

  const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true } });
  const pointer = (config?.rrPointer ?? 0) % activeSalesPersons.length;
  const picked = activeSalesPersons[pointer];
  const newPointer = (pointer + 1) % activeSalesPersons.length;

  if (config) {
    await prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: { rrPointer: newPointer },
    });
  }

  return picked;
}

export async function assignConversationManual(
  conversationId: string,
  assignedToId: string,
  assignedById: string,
  notes?: string
): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { assignedToId: true, clientName: true, clientWaNumber: true },
  });

  if (!conversation) throw new Error("Conversation not found");

  const isReassign = !!conversation.assignedToId;

  // Reassign: remove old sales person's access
  if (isReassign && conversation.assignedToId !== assignedToId) {
    await pusherServer.trigger(
      `private-sales-${conversation.assignedToId}`,
      "conversation_reassigned",
      { conversationId, message: "This conversation has been reassigned." }
    );
  }

  // Update conversation
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      assignedToId,
      assignedAt: new Date(),
      status: "ASSIGNED",
    },
  });

  // Log the assignment
  await prisma.assignmentLog.create({
    data: {
      conversationId,
      assignedToId,
      method: isReassign ? "reassign" : "manual",
      assignedById,
      notes,
    },
  });

  // Notify the new assignee
  await prisma.notification.create({
    data: {
      userId: assignedToId,
      title: isReassign ? "Conversation Reassigned to You" : "New Conversation Assigned",
      body: `Client ${conversation.clientName || conversation.clientWaNumber} has been assigned to you.`,
      type: "assignment",
      conversationId,
    },
  });

  const assignedTo = await prisma.user.findUnique({
    where: { id: assignedToId },
    select: { name: true },
  });

  // Pusher: notify new sales person
  await pusherServer.trigger(
    `private-sales-${assignedToId}`,
    "conversation_assigned",
    {
      conversationId,
      clientName: conversation.clientName,
      clientWaNumber: conversation.clientWaNumber,
    }
  );

  // Real-time notification bell + browser push
  await pusherServer.trigger(`private-sales-${assignedToId}`, "new_notification", {
    title: isReassign ? "Conversation Reassigned to You" : "New Conversation Assigned",
    body: `Client ${conversation.clientName || conversation.clientWaNumber} has been assigned to you.`,
    conversationId,
  });
  await sendPushToUser(assignedToId, {
    title: isReassign ? "Conversation Reassigned to You" : "New Conversation Assigned",
    body: `Client ${conversation.clientName || conversation.clientWaNumber} has been assigned to you.`,
    url: "/inbox",
  });

  // Pusher: update admin view
  await pusherServer.trigger("private-admin", "unassigned_queue_update", {
    conversationId,
    assignedToId,
    assignedToName: assignedTo?.name,
  });

  console.log(
    `✅ Conversation ${conversationId} manually assigned to ${assignedTo?.name}`
  );
}
