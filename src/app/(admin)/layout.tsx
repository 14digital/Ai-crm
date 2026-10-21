import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar userName={session.user.name || "Admin"} />
      <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}
