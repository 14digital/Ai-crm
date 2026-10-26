"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Inbox, Bell, BarChart2, Settings, LogOut, CalendarCheck } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { NexaDeskLogo } from "@/components/NexaDeskLogo";

const navItems = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/my-stats", label: "My Stats", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SalesSidebar({ userName, userId }: { userName: string; userId: string }) {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 240,
      background: "var(--sidebar-bg)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "16px 16px 14px",
        borderBottom: "1px solid var(--sidebar-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <NexaDeskLogo
            variant="full"
            theme="white"
            height={22}
            style={{ maxWidth: "150px" }}
          />
          <NotificationBell userId={userId} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--sidebar-link-active)" : "var(--sidebar-link)",
              textDecoration: "none", transition: "all 0.15s ease",
              background: isActive ? "var(--sidebar-active-bg)" : "transparent",
            }}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: 16, borderTop: "1px solid var(--sidebar-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "var(--accent)",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{userName}</div>
            <div style={{ fontSize: 11, color: "var(--sidebar-link)" }}>Sales Person</div>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          color: "var(--sidebar-link)", background: "none",
          border: "1px solid var(--sidebar-border)", cursor: "pointer",
          transition: "all 0.15s ease",
        }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
