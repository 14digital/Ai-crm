import { prisma } from "@/lib/prisma";
import { MessageSquare, CheckCircle2, InboxIcon, Users, CalendarCheck } from "lucide-react";

export default async function DashboardPage() {
  const [totalConversations, applicationsSubmitted, unassignedCount, activeSalesPersons, totalBookings] = await Promise.all([
    prisma.conversation.count(),
    prisma.applicantProfile.count({ where: { care360ApplicantId: { not: null } } }),
    prisma.conversation.count({ where: { status: "UNASSIGNED_QUEUE" } }),
    prisma.user.count({ where: { role: "SALES_PERSON", isActive: true } }),
    prisma.booking.count(),
  ]);

  const stats = [
    { label: "Total Conversations", value: totalConversations, icon: MessageSquare, color: "#0a56cf", bg: "#e7f0fc" },
    { label: "Bookings", value: totalBookings, icon: CalendarCheck, color: "#D946A0", bg: "#FCE4F1" },
    { label: "Applications Submitted", value: applicationsSubmitted, icon: CheckCircle2, color: "#06D6A0", bg: "#D1FAE5" },
    { label: "Unassigned Queue", value: unassignedCount, icon: InboxIcon, color: "#F59E0B", bg: "#FEF3C7" },
    { label: "Active Sales Persons", value: activeSalesPersons, icon: Users, color: "#3B82F6", bg: "#DBEAFE" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>Dashboard</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Overview of your WhatsApp CRM activity
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        {stats.map((stat) => (
          <div key={stat.label} className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: stat.bg,
                  color: stat.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <stat.icon size={22} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, fontWeight: 500 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity placeholder */}
      <div className="card" style={{ marginTop: 32, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent Activity</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Activity feed will populate as conversations come in via WhatsApp.
        </p>
      </div>
    </div>
  );
}
