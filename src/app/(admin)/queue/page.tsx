"use client";

import { useState, useEffect } from "react";
import { InboxIcon, UserRound, UserCheck, RefreshCw } from "lucide-react";

interface Conversation {
  id: string;
  clientWaNumber: string;
  clientName?: string | null;
  needsHumanAt?: string | null;
  needsHumanReason?: string | null;
  updatedAt: string;
  messages?: { content: string; senderType: string }[];
}

interface SalesPerson {
  id: string;
  name: string;
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

export default function QueuePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/conversations?status=UNASSIGNED_QUEUE&limit=100");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(users => setSalesPersons(users.filter((u: SalesPerson & { isActive: boolean }) => u.isActive)));
  }, []);

  async function assign(conversationId: string, assignedToId: string) {
    setAssigning(conversationId);
    const res = await fetch(`/api/conversations/${conversationId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    if (res.ok) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    }
    setAssigning(null);
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>Unassigned Queue</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} waiting for assignment
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: "1px solid var(--border-light)", background: "var(--bg-card)",
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          Loading...
        </div>
      ) : conversations.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <InboxIcon size={36} style={{ opacity: 0.2, marginBottom: 12, display: "block", margin: "0 auto 12px" }} />
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Queue is empty — all conversations are assigned</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {conversations.map(conv => {
            return (
              <div key={conv.id} className="card" style={{ padding: 20 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                      {conv.clientName || "Unknown"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      +{conv.clientWaNumber}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(conv.updatedAt)}</span>
                  </div>
                </div>

                {/* Needs-a-human badge */}
                {conv.needsHumanAt && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "6px 10px",
                    background: "#fffbeb", borderRadius: 8, marginBottom: 10,
                    border: "1px solid #fde68a",
                  }}>
                    <UserRound size={13} color="#d97706" />
                    <span style={{ fontSize: 12, color: "#92400e", fontWeight: 500 }}>Needs a human</span>
                    {conv.needsHumanReason && (
                      <span style={{ fontSize: 12, color: "#92400e", marginLeft: 4 }}>— {conv.needsHumanReason}</span>
                    )}
                  </div>
                )}

                {/* Last message */}
                {conv.messages?.[0] && (
                  <div style={{
                    fontSize: 12, color: "var(--text-muted)", marginBottom: 12,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {conv.messages[0].senderType === "CLIENT" ? "Applicant: " : "Bot: "}
                    {conv.messages[0].content}
                  </div>
                )}

                {/* Assign */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <UserCheck size={14} color="var(--text-muted)" />
                  <select
                    disabled={assigning === conv.id}
                    onChange={e => e.target.value && assign(conv.id, e.target.value)}
                    value=""
                    style={{
                      flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 12,
                      border: "1px solid var(--border-light)", background: "var(--bg-card)",
                      color: assigning === conv.id ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: "pointer", outline: "none",
                    }}
                  >
                    <option value="">{assigning === conv.id ? "Assigning..." : "Assign to sales person..."}</option>
                    {salesPersons.map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
