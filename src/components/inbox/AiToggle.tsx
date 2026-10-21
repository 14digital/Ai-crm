"use client";

import { useState } from "react";
import { Bot } from "lucide-react";

interface AiToggleProps {
  conversationId: string;
  initialValue: boolean;
  onToggle?: (value: boolean) => void;
}

export function AiToggle({ conversationId, initialValue, onToggle }: AiToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/ai-toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: !enabled }),
      });
      if (res.ok) {
        setEnabled(!enabled);
        onToggle?.(!enabled);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={enabled ? "AI is handling this conversation — click to take over" : "AI is off — click to re-enable"}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: "none", cursor: loading ? "not-allowed" : "pointer",
        background: enabled
          ? "var(--primary)"
          : "var(--bg)",
        color: enabled ? "white" : "var(--text-muted)",
        outline: enabled ? "none" : "1px solid var(--border-light)",
        transition: "all 0.2s ease",
        opacity: loading ? 0.6 : 1,
      } as React.CSSProperties}
    >
      <Bot size={14} />
      {enabled ? "AI On" : "AI Off"}
    </button>
  );
}
