import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InboxClient } from "@/components/inbox/InboxClient";
import { getBranches, getLookup } from "@/lib/care360";
import { Suspense } from "react";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { SalesSidebar } from "@/components/inbox/SalesSidebar";
import { PushRegistration } from "@/components/inbox/PushRegistration";

export default async function InboxPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id as string;
  const role = (session.user as { role: string }).role;
  const isAdmin = role === "ADMIN";

  // Admins see every conversation (so they can jump in on any chat); a sales
  // person only sees what's assigned to them.
  const conversations = await prisma.conversation.findMany({
    where: isAdmin ? {} : { assignedToId: userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const serialized = JSON.parse(JSON.stringify(conversations));

  // Cached Care360 dropdowns. The panel edits these fields as selects so a
  // recruiter picks a real id instead of typing one Care360 would reject.
  const [branches, nationalities, ethnicities, religions] = await Promise.all([
    getBranches(),
    getLookup("nationality"),
    getLookup("ethnicity"),
    getLookup("religion"),
  ]);

  const care360Options = {
    branches: branches.map((b) => ({ refId: b.refId, name: b.name })),
    nationalities,
    ethnicities,
    religions,
  };

  const content = (
    <Suspense fallback={null}>
      <InboxClient
        initialConversations={serialized}
        userId={userId}
        care360Options={care360Options}
      />
    </Suspense>
  );

  if (isAdmin) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <AdminSidebar userName={session.user.name || "Admin"} />
        <main style={{ flex: 1, overflow: "hidden", background: "var(--bg)" }}>
          {content}
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SalesSidebar userName={session.user.name || "Sales Person"} userId={userId} />
      <PushRegistration userId={userId} />
      <main style={{ flex: 1, overflow: "hidden", background: "var(--bg)" }}>
        {content}
      </main>
    </div>
  );
}
