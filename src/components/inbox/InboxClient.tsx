"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";
import { MessageBubble } from "./MessageBubble";
import { ReplyBox } from "./ReplyBox";
import { ApplicantInfoPanel, type Care360Options } from "./ApplicantInfoPanel";
import { WindowExpiryBanner } from "./WindowExpiryBanner";
import { SubmitApplicantButton, type ApplicantProfileLite } from "./SubmitApplicantButton";
import { Search, MessageSquare, Bot, Clock } from "lucide-react";

interface Message {
  id: string;
  conversationId: string;
  senderType: string;
  content: string;
  status: string;
  direction: string;
  createdAt: string;
  isTemplate?: boolean;
  templateName?: string | null;
  templateParams?: Record<string, unknown> | null;
}

interface Conversation {
  id: string;
  clientWaNumber: string;
  clientName?: string | null;
  status: string;
  aiEnabled: boolean;
  lastClientMessageAt?: string | null;
  internalNotes?: string | null;
  needsHumanAt?: string | null;
  needsHumanReason?: string | null;
  updatedAt: string;
  messages?: Message[];
}

function isWindowExpired(lastClientMessageAt: string | null | undefined): boolean {
  if (!lastClientMessageAt) return true;
  const elapsed = Date.now() - new Date(lastClientMessageAt).getTime();
  return elapsed >= 24 * 60 * 60 * 1000;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function InboxClient({
  initialConversations,
  userId,
  care360Options,
}: {
  initialConversations: Conversation[];
  userId: string;
  care360Options: Care360Options;
}) {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("conv"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<ApplicantProfileLite | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const selected = conversations.find((c) => c.id === selectedId) || null;

  // Sync selection when the ?conv= URL param changes (e.g. clicking a notification
  // while already on /inbox — useState initializer only runs on mount).
  const convParam = searchParams.get("conv");
  useEffect(() => {
    if (convParam && convParam !== selectedId) {
      setSelectedId(convParam);
    }
  }, [convParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the selected conversation isn't in the list yet, fetch and add it so the
  // chat opens even when navigating straight to it from a notification.
  useEffect(() => {
    if (!selectedId) return;
    if (conversations.find((c) => c.id === selectedId)) return;
    fetch(`/api/conversations/${selectedId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((conv) => {
        if (conv?.id) {
          setConversations((prev) =>
            prev.find((c) => c.id === conv.id) ? prev : [conv, ...prev]
          );
        }
      })
      .catch(() => {});
  }, [selectedId, conversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages + profile when conversation selected.
  // When selectedId becomes null we leave the stale profile in state — it's only
  // rendered inside the `selected && ...` branch below, so it's effectively invisible.
  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    fetch(`/api/conversations/${selectedId}`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages || []);
        setProfile(data.applicantProfile || null);
        setLoadingMessages(false);
      })
      .catch(() => setLoadingMessages(false));
  }, [selectedId]);

  // Re-fetch profile after a new client message so the UI shows fresh form_updates
  const refreshProfile = useCallback(async () => {
    if (!selectedId) return;
    const res = await fetch(`/api/conversations/${selectedId}`);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.applicantProfile || null);
    }
  }, [selectedId]);

  // Pusher: private-sales-{userId} for new assignments
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`private-sales-${userId}`);

    channel.bind("conversation_assigned", (data: { conversationId: string }) => {
      // Fetch the new conversation and add to list
      fetch(`/api/conversations/${data.conversationId}`)
        .then((r) => r.json())
        .then((conv) => {
          setConversations((prev) => {
            if (prev.find((c) => c.id === conv.id)) return prev;
            return [conv, ...prev];
          });
        });
    });

    channel.bind("new_message", (data: { conversationId: string }) => {
      // Bump conversation to top
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === data.conversationId ? { ...c, updatedAt: new Date().toISOString() } : c
        );
        return [...updated].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-sales-${userId}`);
    };
  }, [userId]);

  // Pusher: presence-conversation-{id} for real-time messages
  useEffect(() => {
    if (!selectedId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`presence-conversation-${selectedId}`);

    channel.bind("message_received", (data: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
      // Bump this conversation to top + update lastClientMessageAt for CLIENT messages
      setConversations((prev) => {
        const now = new Date().toISOString();
        const updated = prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                updatedAt: now,
                ...(data.senderType === "CLIENT" ? { lastClientMessageAt: data.createdAt } : {}),
              }
            : c
        );
        return [...updated].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      // After an AI reply, the persistent profile may have new form_updates
      if (data.senderType === "AI_BOT") {
        refreshProfile();
      }
    });

    channel.bind("ai_toggled", (data: { aiEnabled: boolean }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, aiEnabled: data.aiEnabled } : c))
      );
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`presence-conversation-${selectedId}`);
    };
  }, [selectedId, refreshProfile]);

  const handleMessageSent = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.find((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    // Bump conversation to top when salesperson sends a reply
    setConversations((prev) => {
      const now = new Date().toISOString();
      const updated = prev.map((c) => (c.id === selectedId ? { ...c, updatedAt: now } : c));
      return [...updated].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
  }, [selectedId]);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.clientName?.toLowerCase().includes(q) ||
      c.clientWaNumber.includes(q)
    );
  });

  const windowExpired = selected ? isWindowExpired(selected.lastClientMessageAt) : false;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* LEFT: Conversation List (280px) */}
      <div style={{
        width: 280, borderRight: "1px solid var(--border-light)",
        background: "var(--bg-card)", display: "flex", flexDirection: "column",
        flexShrink: 0,
      }}>
        <div style={{ padding: "16px 12px 8px", borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            Inbox
          </div>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              style={{
                width: "100%", padding: "7px 10px 7px 30px",
                borderRadius: 8, border: "1px solid var(--border-light)",
                fontSize: 13, color: "var(--text-primary)", background: "var(--bg)",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No conversations yet
            </div>
          )}
          {filtered.map((conv) => {
            const isActive = conv.id === selectedId;
            const lastMsg = conv.messages?.[0];
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 14px",
                  borderBottom: "1px solid var(--border-light)",
                  background: isActive ? "var(--primary-50)" : "transparent",
                  cursor: "pointer", display: "block",
                } as React.CSSProperties}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--primary)" : "var(--text-primary)" }}>
                    {conv.clientName || `+${conv.clientWaNumber}`}
                  </span>
                  <span suppressHydrationWarning style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {timeAgo(conv.updatedAt)}
                  </span>
                </div>
                {lastMsg && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lastMsg.senderType === "AI_BOT" ? "🤖 " : ""}{lastMsg.content}
                  </div>
                )}
                {conv.aiEnabled && (
                  <div style={{ display: "flex", marginTop: 5 }}>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "var(--primary-50)", color: "var(--primary)", fontWeight: 600 }}>
                      AI
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER: Chat Window */}
      {!selected ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          <div style={{ textAlign: "center" }}>
            <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>Select a conversation to start chatting</div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Chat header */}
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid var(--border-light)",
            background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {selected.clientName || `+${selected.clientWaNumber}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                {selected.aiEnabled ? (
                  <><Bot size={11} /> AI is handling</>
                ) : (
                  <><Clock size={11} /> Manual mode</>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SubmitApplicantButton
                conversationId={selected.id}
                profile={profile}
                onSubmitted={(care360ApplicantId) =>
                  setProfile((prev) =>
                    prev
                      ? {
                          ...prev,
                          care360ApplicantId,
                          care360SubmittedAt: new Date().toISOString(),
                          lastSubmitError: null,
                        }
                      : prev
                  )
                }
              />
            </div>
          </div>

          {/* Window expiry banner */}
          <WindowExpiryBanner lastClientMessageAt={selected.lastClientMessageAt ?? null} />

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
            {loadingMessages ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>Loading...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24, fontSize: 13 }}>
                No messages yet
              </div>
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box */}
          <ReplyBox
            conversationId={selected.id}
            clientWaNumber={selected.clientWaNumber}
            clientName={selected.clientName}
            aiEnabled={selected.aiEnabled}
            windowExpired={windowExpired}
            onMessageSent={handleMessageSent}
          />
        </div>
      )}

      {/* RIGHT: Applicant Info Panel */}
      {selected && (
        <ApplicantInfoPanel
          conversation={selected}
          profile={profile}
          options={care360Options}
          onProfileUpdate={(updated) => setProfile(updated)}
        />
      )}
    </div>
  );
}
