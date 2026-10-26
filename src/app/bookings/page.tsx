import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { SalesSidebar } from "@/components/inbox/SalesSidebar";
import { BookingsClient } from "@/components/bookings/BookingsClient";

export default async function BookingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role: string }).role;
  const isAdmin = role === "ADMIN";

  if (isAdmin) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <AdminSidebar userName={session.user.name || "Admin"} />
        <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", background: "var(--bg)" }}>
          <BookingsClient isAdmin />
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SalesSidebar userName={session.user.name || "Sales Person"} userId={session.user.id} />
      <main style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>
        <BookingsClient isAdmin={false} />
      </main>
    </div>
  );
}
