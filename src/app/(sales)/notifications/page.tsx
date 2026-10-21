import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Bell, CheckCheck } from "lucide-react";
import { MarkAllReadButton } from "./MarkAllReadButton";

function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={20} />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <MarkAllReadButton />
        )}
      </div>

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            <Bell size={32} style={{ opacity: 0.2, marginBottom: 10, display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 14 }}>No notifications yet</div>
          </div>
        ) : notifications.map((n) => (
          <div key={n.id} style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-light)",
            background: n.isRead ? "transparent" : "var(--primary-50)",
            display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: n.isRead ? "var(--bg)" : "#e0e7ff",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--primary)",
            }}>
              <Bell size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: n.isRead ? 500 : 700, color: "var(--text-primary)" }}>
                {n.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                {n.body}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {timeAgo(new Date(n.createdAt))}
              </div>
            </div>
            {!n.isRead && (
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--primary)", flexShrink: 0, marginTop: 6,
              }} />
            )}
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <CheckCheck size={14} /> You&#39;re all caught up
        </div>
      )}
    </div>
  );
}
