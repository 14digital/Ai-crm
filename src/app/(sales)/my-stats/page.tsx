import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MessageSquare, CheckCircle2, TrendingUp, BarChart2 } from "lucide-react";

export default async function MyStatsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  const [
    totalAssigned,
    activeConversations,
    messagesSent,
    assignedConversations,
  ] = await Promise.all([
    prisma.conversation.count({ where: { assignedToId: userId } }),
    prisma.conversation.count({ where: { assignedToId: userId, status: { in: ["ASSIGNED", "HUMAN_TAKEOVER"] } } }),
    prisma.message.count({ where: { sentById: userId } }),
    prisma.conversation.findMany({
      where: { assignedToId: userId },
      select: { clientWaNumber: true },
    }),
  ]);

  const assignedNumbers = [...new Set(assignedConversations.map((conversation) => conversation.clientWaNumber))];
  const applicationsCompleted = assignedNumbers.length > 0
    ? await prisma.applicantProfile.count({
        where: {
          waNumber: { in: assignedNumbers },
          care360ApplicantId: { not: null },
        },
      })
    : 0;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart2 size={20} />
          My Stats
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
          Your personal performance overview
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Assigned", value: totalAssigned, icon: MessageSquare, color: "#0a56cf", bg: "#e7f0fc" },
          { label: "Active Now", value: activeConversations, icon: TrendingUp, color: "#55c0af", bg: "#e8f8f6" },
          { label: "Applications Completed", value: applicationsCompleted, icon: CheckCircle2, color: "#06b6d4", bg: "#cffafe" },
          { label: "Messages Sent", value: messagesSent, icon: MessageSquare, color: "#f59e0b", bg: "#fef3c7" },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: stat.bg, color: stat.color,
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
            }}>
              <stat.icon size={20} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 5, fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {totalAssigned === 0 && (
        <div className="card" style={{ padding: 32, marginTop: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          No conversations assigned to you yet. Stats will appear once you receive your first assignment.
        </div>
      )}
    </div>
  );
}
