"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Bot, RefreshCw } from "lucide-react";

interface Conversation {
  id: string;
  clientWaNumber: string;
  clientName?: string | null;
  status: string;
  aiEnabled: boolean;
  needsHumanAt?: string | null;
  updatedAt: string;
  assignedTo?: { id: string; name: string } | null;
  messages?: { content: string; senderType: string; createdAt: string }[];
}

interface SalesPerson {
  id: string;
  name: string;
  isActive: boolean;
}

const STATUS_OPTIONS = ["", "ACTIVE", "ASSIGNED", "HUMAN_TAKEOVER", "UNASSIGNED_QUEUE", "CLOSED"];
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: "#e8f8f6", color: "#1d7a70" },
  ASSIGNED: { bg: "#dbeafe", color: "#1e40af" },
  HUMAN_TAKEOVER: { bg: "#fef3c7", color: "#92400e" },
  UNASSIGNED_QUEUE: { bg: "#fee2e2", color: "#991b1b" },
  CLOSED: { bg: "#f1f5f9", color: "#475569" },
};
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/conversations?${params}`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
      setTotal(data.total);
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(users => {
      setSalesPersons(users);
    });
  }, []);

  async function assign(conversationId: string, assignedToId: string) {
    setAssigning(conversationId);
    await fetch(`/api/conversations/${conversationId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    setAssigning(null);
    load();
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>All Conversations</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          {total} total conversations
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or number..."
            style={{
              width: "100%", padding: "8px 10px 8px 32px",
              border: "1px solid var(--border-light)", borderRadius: 8,
              fontSize: 13, color: "var(--text-primary)", background: "var(--bg-card)",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 12px", border: "1px solid var(--border-light)",
            borderRadius: 8, fontSize: 13, color: "var(--text-primary)",
            background: "var(--bg-card)", outline: "none", cursor: "pointer",
          }}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s || "All Statuses"}</option>
          ))}
        </select>
        <button
          onClick={load}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: "1px solid var(--border-light)", background: "var(--bg-card)",
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg)" }}>
                {["Client", "Status", "AI", "Last Activity", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left", fontWeight: 600,
                    color: "white", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
                    Loading...
                  </td>
                </tr>
              ) : conversations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
                    No conversations found
                  </td>
                </tr>
              ) : conversations.map(conv => {
                const sc = STATUS_COLORS[conv.status] || { bg: "#f1f5f9", color: "#475569" };
                return (
                  <tr key={conv.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {conv.clientName || "Unknown"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                        +{conv.clientWaNumber}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: sc.bg, color: sc.color,
                      }}>
                        {conv.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {conv.aiEnabled ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--primary)", fontSize: 12, fontWeight: 600 }}>
                          <Bot size={13} /> On
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Off</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {timeAgo(conv.updatedAt)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <select
                        disabled={assigning === conv.id}
                        onChange={e => e.target.value && assign(conv.id, e.target.value)}
                        value={conv.assignedTo?.id ?? ""}
                        style={{
                          padding: "5px 8px", borderRadius: 6, fontSize: 12,
                          border: "1px solid var(--border-light)", background: "var(--bg-card)",
                          color: "var(--text-secondary)", cursor: "pointer", outline: "none",
                        }}
                      >
                        <option value="" disabled>Assign to...</option>
                        {salesPersons.map(sp => (
                          <option key={sp.id} value={sp.id} disabled={!sp.isActive}>
                            {sp.name}{sp.isActive ? "" : " (Inactive)"}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
