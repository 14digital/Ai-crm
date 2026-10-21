import { prisma } from "@/lib/prisma";
import { BarChart3, TrendingUp, MessageSquare, Users } from "lucide-react";

async function getAnalyticsData() {
  const [
    byStatus,
    totalMessages,
    messagesBySender,
    applicationsSubmitted,
    applicationsInProgress,
    activeSalesPersons,
    recentConversations,
  ] = await Promise.all([
    prisma.conversation.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.message.count(),
    prisma.message.groupBy({ by: ["senderType"], _count: { _all: true } }),
    prisma.applicantProfile.count({ where: { care360ApplicantId: { not: null } } }),
    prisma.applicantProfile.count({ where: { care360ApplicantId: null } }),
    prisma.user.count({ where: { role: "SALES_PERSON", isActive: true } }),
    prisma.conversation.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        clientName: true,
        clientWaNumber: true,
        status: true,
        aiEnabled: true,
        createdAt: true,
        assignedTo: { select: { name: true } },
      },
    }),
  ]);

  return { byStatus, totalMessages, messagesBySender, applicationsSubmitted, applicationsInProgress, activeSalesPersons, recentConversations };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#55c0af", ASSIGNED: "#3b82f6", HUMAN_TAKEOVER: "#f59e0b",
  UNASSIGNED_QUEUE: "#ef4444", CLOSED: "#94a3b8",
};
const SENDER_COLORS: Record<string, string> = {
  CLIENT: "#3b82f6", AI_BOT: "#8b5cf6", SALES_PERSON: "#06b6d4", SYSTEM: "#94a3b8",
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ height: 8, background: "var(--bg)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
    </div>
  );
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();
  const totalConversations = data.byStatus.reduce((s, r) => s + r._count._all, 0);
  const maxStatus = Math.max(...data.byStatus.map(r => r._count._all), 1);
  const maxSender = Math.max(...data.messagesBySender.map(r => r._count._all), 1);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>Analytics</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Overview of your CRM performance</p>
      </div>

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Conversations", value: totalConversations, icon: MessageSquare, color: "#0a56cf", bg: "#e7f0fc" },
          { label: "Total Messages", value: data.totalMessages, icon: BarChart3, color: "#3b82f6", bg: "#dbeafe" },
          { label: "Applications Submitted", value: data.applicationsSubmitted, icon: TrendingUp, color: "#06b6d4", bg: "#cffafe" },
          { label: "Applications In Progress", value: data.applicationsInProgress, icon: TrendingUp, color: "#55c0af", bg: "#e8f8f6" },
          { label: "Active Sales Persons", value: data.activeSalesPersons, icon: Users, color: "#f59e0b", bg: "#fef3c7" },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.bg, color: stat.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <stat.icon size={20} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 5, fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 28 }}>
        {/* Conversations by Status */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>By Status</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.byStatus.map(r => (
              <div key={r.status}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                    {r.status.replace("_", " ")}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{r._count._all}</span>
                </div>
                <Bar value={r._count._all} max={maxStatus} color={STATUS_COLORS[r.status] || "#94a3b8"} />
              </div>
            ))}
          </div>
        </div>

        {/* Messages by Sender */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Messages by Sender</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.messagesBySender.map(r => (
              <div key={r.senderType}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                    {r.senderType.replace("_", " ")}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{r._count._all}</span>
                </div>
                <Bar value={r._count._all} max={maxSender} color={SENDER_COLORS[r.senderType] || "#94a3b8"} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-light)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600 }}>Recent Conversations</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg)" }}>
              {["Client", "Status", "Assigned", "AI", "Created"].map(h => (
                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontWeight: 600, color: "white", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.recentConversations.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{c.clientName || "Unknown"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>+{c.clientWaNumber}</div>
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: `${STATUS_COLORS[c.status]}20`, color: STATUS_COLORS[c.status] || "#64748b" }}>
                    {c.status.replace("_", " ")}
                  </span>
                </td>
                <td style={{ padding: "10px 16px", color: c.assignedTo ? "var(--text-primary)" : "var(--text-muted)", fontSize: 12 }}>
                  {c.assignedTo?.name || "—"}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: c.aiEnabled ? "var(--primary)" : "var(--text-muted)" }}>
                  {c.aiEnabled ? "On" : "Off"}
                </td>
                <td style={{ padding: "10px 16px", color: "var(--text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
