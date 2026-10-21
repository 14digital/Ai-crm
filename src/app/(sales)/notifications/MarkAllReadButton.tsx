"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export function MarkAllReadButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function markAll() {
    setLoading(true);
    await fetch("/api/notifications/mark-read", { method: "PATCH" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={markAll}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
        border: "1px solid var(--border-light)", background: "var(--bg-card)",
        color: "var(--text-secondary)", cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      <CheckCheck size={14} />
      {loading ? "Marking..." : "Mark all read"}
    </button>
  );
}
