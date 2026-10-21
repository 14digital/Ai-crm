import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SalesSidebar } from "@/components/inbox/SalesSidebar";
import { PushRegistration } from "@/components/inbox/PushRegistration";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");
  if ((session.user as { role: string }).role !== "SALES_PERSON") redirect("/dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SalesSidebar userName={session.user.name || "Sales Person"} userId={session.user.id} />
      <PushRegistration userId={session.user.id} />
      <main style={{ flex: 1, overflow: "hidden", background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}
