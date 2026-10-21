import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InboxClient } from "@/components/inbox/InboxClient";
import { getBranches, getLookup } from "@/lib/care360";
import { Suspense } from "react";

export default async function InboxPage() {
  const session = await auth();
  const userId = session!.user.id as string;

  // Fetch initial conversations server-side for fast first load
  const conversations = await prisma.conversation.findMany({
    where: { assignedToId: userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Serialize dates for client component
  const serialized = JSON.parse(JSON.stringify(conversations));

  // Cached Care360 dropdowns. The panel edits these fields as selects so a
  // recruiter picks a real id instead of typing one Care360 would reject.
  const [branches, nationalities, ethnicities, religions] = await Promise.all([
    getBranches(),
    getLookup("nationality"),
    getLookup("ethnicity"),
    getLookup("religion"),
  ]);

  return (
    <Suspense fallback={null}>
      <InboxClient
        initialConversations={serialized}
        userId={userId}
        care360Options={{
          branches: branches.map((b) => ({ refId: b.refId, name: b.name })),
          nationalities,
          ethnicities,
          religions,
        }}
      />
    </Suspense>
  );
}
