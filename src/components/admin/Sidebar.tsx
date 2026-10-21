"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  MessageSquare,
  InboxIcon,
  Users,
  Bot,
  FileText,
  BarChart3,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conversations", label: "All Conversations", icon: MessageSquare },
  { href: "/queue", label: "Unassigned Queue", icon: InboxIcon },
  { href: "/team", label: "Team Management", icon: Users },
  { href: "/bot-config", label: "Bot Configuration", icon: Bot },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        background: "var(--sidebar-bg)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "16px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <img
          src="/logo-sidebar.png"
          alt="Assisted Pulse"
          style={{ height: 36, width: "auto", maxWidth: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--sidebar-link-active)" : "#ffffff",
                textDecoration: "none",
                transition: "all 0.15s ease",
                background: isActive ? "var(--sidebar-active-bg)" : "transparent",
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div
        style={{
          padding: 16,
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "var(--accent)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>
              {userName}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              Administrator
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: "#ffffff",
            background: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
