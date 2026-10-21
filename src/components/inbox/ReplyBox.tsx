"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Clock, ChevronDown } from "lucide-react";
import { AiToggle } from "./AiToggle";

interface ReplyBoxProps {
  conversationId: string;
  clientWaNumber: string;
  clientName?: string | null;
  aiEnabled: boolean;
  windowExpired: boolean;
  onMessageSent: (message: { id: string; conversationId: string; content: string; senderType: string; direction: string; status: string; createdAt: string }) => void;
}

interface Template {
  id: string;
  name: string;
  displayName: string;
  bodyText: string;
}

function parseVariables(bodyText: string): number {
  const matches = bodyText.match(/\{\{\d+\}\}/g);
  return matches ? new Set(matches).size : 0;
}

function fillTemplate(bodyText: string, vars: string[]): string {
  let result = bodyText;
  vars.forEach((v, i) => {
    result = result.replace(new RegExp(`\\{\\{${i + 1}\\}\\}`, "g"), v || `{{${i + 1}}}`);
  });
  return result;
}

function TemplatePicker({ conversationId, clientName, onMessageSent }: {
  conversationId: string;
  clientName?: string | null;
  onMessageSent: ReplyBoxProps["onMessageSent"];
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [vars, setVars] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then(r => r.json())
      .then(data => setTemplates(Array.isArray(data) ? data : []));
  }, []);

  function selectTemplate(t: Template | null) {
    if (!t) { setSelected(null); setVars([]); setError(null); return; }
    const count = parseVariables(t.bodyText);
    const prefilled = Array(count).fill("");
    // Auto-fill first variable with client name if available
    if (count >= 1 && clientName) prefilled[0] = clientName;
    setSelected(t);
    setVars(prefilled);
    setError(null);
  }

  async function sendTemplate() {
    if (!selected) return;
    const varCount = parseVariables(selected.bodyText);
    if (varCount > 0 && vars.some(v => !v.trim())) {
      setError("Please fill in all template variables");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: fillTemplate(selected.bodyText, vars),
          type: "template",
          templateName: selected.name,
          templateParams: vars.filter(Boolean),
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        onMessageSent(msg);
        setSelected(null);
        setVars([]);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to send template");
      }
    } finally {
      setSending(false);
    }
  }

  const varCount = selected ? parseVariables(selected.bodyText) : 0;
  const preview = selected ? fillTemplate(selected.bodyText, vars) : "";

  return (
    <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-light)", background: "var(--bg-card)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Clock size={13} color="#d97706" />
        <span style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
          24-hour window expired — send a template to re-engage
        </span>
      </div>

      {/* Template selector */}
      <div style={{ position: "relative", marginBottom: selected ? 10 : 0 }}>
        <select
          value={selected?.name || ""}
          onChange={e => {
            const t = templates.find(t => t.name === e.target.value) || null;
            selectTemplate(t);
          }}
          style={{
            width: "100%", padding: "9px 32px 9px 12px",
            border: "1px solid var(--border-light)", borderRadius: 8,
            fontSize: 13, color: selected ? "var(--text-primary)" : "var(--text-muted)",
            background: "var(--bg)", outline: "none",
            cursor: "pointer", appearance: "none",
          }}
        >
          <option value="">
            {templates.length === 0 ? "No approved templates — add one in Admin → Templates" : "Select a template..."}
          </option>
          {templates.map(t => (
            <option key={t.name} value={t.name}>{t.displayName}</option>
          ))}
        </select>
        <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
      </div>

      {/* Variable inputs */}
      {selected && varCount > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {Array.from({ length: varCount }).map((_, i) => (
            <input
              key={i}
              value={vars[i] || ""}
              onChange={e => {
                const updated = [...vars];
                updated[i] = e.target.value;
                setVars(updated);
              }}
              placeholder={`Variable {{${i + 1}}}`}
              style={{
                width: "100%", padding: "7px 10px",
                border: "1px solid var(--border-light)", borderRadius: 7,
                fontSize: 13, color: "var(--text-primary)", background: "var(--bg)",
                outline: "none", boxSizing: "border-box",
              }}
            />
          ))}
        </div>
      )}

      {/* Preview */}
      {selected && (
        <div style={{
          padding: "8px 12px", background: "#fffbeb",
          border: "1px solid #fde68a", borderRadius: 8,
          fontSize: 12, color: "#78350f", lineHeight: 1.5,
          marginBottom: 10,
        }}>
          <span style={{ fontWeight: 600, display: "block", marginBottom: 3 }}>Preview:</span>
          {preview}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{error}</div>
      )}

      {/* Send button */}
      {selected && (
        <button
          onClick={sendTemplate}
          disabled={sending}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
            background: sending ? "var(--border-light)" : "var(--primary)",
            color: sending ? "var(--text-muted)" : "white",
            cursor: sending ? "not-allowed" : "pointer",
          }}
        >
          <Send size={14} />
          {sending ? "Sending..." : "Send Template"}
        </button>
      )}
    </div>
  );
}

export function ReplyBox({ conversationId, clientName, aiEnabled, windowExpired, onMessageSent }: ReplyBoxProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [aiOn, setAiOn] = useState(aiEnabled);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setAiOn(aiEnabled); }, [aiEnabled]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content: trimmed, type: "text" }),
      });

      if (res.ok) {
        const msg = await res.json();
        onMessageSent(msg);
        setText("");
        textareaRef.current?.focus();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send message");
      }
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Window expired → show template picker
  if (windowExpired) {
    return <TemplatePicker conversationId={conversationId} clientName={clientName} onMessageSent={onMessageSent} />;
  }

  return (
    <div style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-card)" }}>
      {/* AI banner */}
      {aiOn && (
        <div style={{
          padding: "8px 16px", background: "var(--primary-50)",
          borderBottom: "1px solid var(--border-light)",
          fontSize: 12, color: "var(--primary)", fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          🤖 AI is handling this conversation — you can still override by sending a message
        </div>
      )}

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          rows={3}
          style={{
            width: "100%", resize: "none", border: "1px solid var(--border-light)",
            borderRadius: 10, padding: "10px 14px", fontSize: 14,
            color: "var(--text-primary)", background: "var(--bg)",
            outline: "none", fontFamily: "inherit", lineHeight: 1.5,
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <AiToggle
            conversationId={conversationId}
            initialValue={aiOn}
            onToggle={setAiOn}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              border: "none", cursor: !text.trim() || sending ? "not-allowed" : "pointer",
              background: !text.trim() || sending
                ? "var(--border-light)"
                : "var(--primary)",
              color: !text.trim() || sending ? "var(--text-muted)" : "white",
              transition: "all 0.2s",
            }}
          >
            <Send size={15} />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
