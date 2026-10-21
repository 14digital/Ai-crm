"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCheck, MessageSquare } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  conversationId?: string | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PANEL_WIDTH = 320;

export function NotificationBell({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Pusher: listen for new_notification on private-sales-{userId}
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-sales-${userId}`);
    channel.bind("new_notification", (data: Notification) => {
      setUnreadCount((c) => c + 1);
      setNotifications((prev) => [{ ...data, id: data.id || `local-${Date.now()}`, isRead: false, createdAt: new Date().toISOString() }, ...prev]);
    });
    return () => {
      channel.unbind("new_notification");
    };
  }, [userId]);

  // Compute panel position from the bell's rect (portal uses fixed positioning)
  const positionPanel = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 16);
    setCoords({ top: rect.bottom + 8, left: Math.max(8, left) });
  }, []);

  function toggleOpen() {
    if (!open) positionPanel();
    setOpen((o) => !o);
  }

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open, positionPanel]);

  // Close on outside click (account for portal panel living outside the bell's DOM)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAllRead() {
    setMarking(true);
    await fetch("/api/notifications/mark-read", { method: "PATCH" });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarking(false);
  }

  async function markOneRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    // Skip server call for optimistic local-only ids (Pusher-pushed before refetch)
    if (id.startsWith("local-")) return;
    await fetch("/api/notifications/mark-read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  function handleNotificationClick(n: Notification) {
    setOpen(false);
    if (!n.isRead) markOneRead(n.id);
    if (n.conversationId) {
      router.push(`/inbox?conv=${n.conversationId}`);
    }
  }

  const panel = open && coords ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed", top: coords.top, left: coords.left,
        width: PANEL_WIDTH, background: "var(--bg-card)",
        border: "1px solid var(--border-light)", borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        zIndex: 9999, overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "1px solid var(--border-light)",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          Notifications {unreadCount > 0 && <span style={{ color: "#ef4444" }}>({unreadCount})</span>}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 600, color: "var(--primary)",
              background: "none", border: "none", cursor: "pointer",
            }}
          >
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No notifications yet
          </div>
        ) : notifications.slice(0, 15).map((n, i) => (
          <button
            key={n.id || n.createdAt || i}
            onClick={() => handleNotificationClick(n)}
            style={{
              width: "100%", textAlign: "left", padding: "12px 16px",
              borderBottom: "1px solid var(--border-light)",
              background: n.isRead ? "transparent" : "var(--primary-50)",
              cursor: n.conversationId ? "pointer" : "default",
              display: "block",
            } as React.CSSProperties}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: n.isRead ? "var(--bg)" : "var(--primary-50)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--primary)",
              }}>
                <MessageSquare size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: "var(--text-primary)" }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.body}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                  {timeAgo(n.createdAt)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {notifications.length > 0 && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border-light)" }}>
          <a href="/notifications" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
            View all notifications →
          </a>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        style={{
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 10,
          background: open ? "var(--primary-50)" : "transparent",
          border: open ? "1px solid var(--border-light)" : "1px solid transparent",
          cursor: "pointer", color: open ? "var(--primary)" : "var(--text-muted)",
          transition: "all 0.15s",
        }}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            minWidth: 16, height: 16, borderRadius: 99,
            background: "#ef4444", color: "white",
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px", lineHeight: 1,
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {panel}
    </div>
  );
}
