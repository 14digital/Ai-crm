import { Bot, User, ExternalLink, Video } from "lucide-react";

interface Message {
  id: string;
  senderType: string;
  content: string;
  status: string;
  createdAt: string;
  isTemplate?: boolean;
  templateName?: string | null;
  templateParams?: Record<string, unknown> | null;
}

export function MessageBubble({ message }: { message: Message }) {
  const time = new Date(message.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  // Safely extract template data regardless of how Prisma/Pusher typed it
  const rawParams = message.templateParams as
    | { buttonUrl?: unknown; cvs?: unknown }
    | null
    | undefined;

  const invoiceUrl =
    message.templateName === "invoice_alert" &&
    typeof rawParams?.buttonUrl === "string"
      ? rawParams.buttonUrl
      : null;

  const cvs =
    message.templateName === "cv_share" && Array.isArray(rawParams?.cvs)
      ? (rawParams.cvs as Array<{ name?: unknown; url?: unknown; videoUrl?: unknown }>)
          .filter((c) => typeof c?.name === "string" && typeof c?.url === "string")
          .map((c) => ({
            name: c.name as string,
            url: c.url as string,
            videoUrl: typeof c.videoUrl === "string" && c.videoUrl ? c.videoUrl : null,
          }))
      : null;

  // SYSTEM — centered pill
  if (message.senderType === "SYSTEM") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
        <span style={{
          fontSize: 11, color: "var(--text-muted)", background: "var(--bg)",
          border: "1px solid var(--border-light)", borderRadius: 99,
          padding: "3px 12px",
        }}>
          {message.content}
        </span>
      </div>
    );
  }

  // CLIENT — right-aligned
  if (message.senderType === "CLIENT") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "2px 0" }}>
        <div style={{ maxWidth: "70%" }}>
          <div style={{
            background: "#f0f0f0", borderRadius: "16px 4px 16px 16px",
            padding: "10px 14px", fontSize: 14, color: "#111",
            lineHeight: 1.5,
          }}>
            {message.content}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right", marginTop: 3 }}>
            {time}
          </div>
        </div>
      </div>
    );
  }

  // AI_BOT — left-aligned, navy
  if (message.senderType === "AI_BOT") {
    return (
      <div style={{ display: "flex", gap: 8, padding: "2px 0", alignItems: "flex-end" }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "var(--primary)",
          color: "white", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Bot size={15} />
        </div>
        <div style={{ maxWidth: "70%" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3, fontWeight: 500 }}>AI Bot</div>
          <div style={{
            background: "var(--primary)",
            borderRadius: "4px 16px 16px 16px",
            padding: "10px 14px", fontSize: 14, color: "white", lineHeight: 1.5,
          }}>
            {message.content}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{time}</div>
        </div>
      </div>
    );
  }

  // SALES_PERSON — left-aligned, white card
  return (
    <div style={{ display: "flex", gap: 8, padding: "2px 0", alignItems: "flex-end" }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: "var(--primary-50)", color: "var(--primary)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <User size={15} />
      </div>
      <div style={{ maxWidth: "70%" }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3, fontWeight: 500 }}>You</div>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border-light)",
          borderRadius: "4px 16px 16px 16px",
          overflow: "hidden",
        }}>
          {cvs ? (
            <>
              <div style={{ padding: "10px 14px 6px", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>
                Hello! Here are the CVs:
              </div>
              <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                {cvs.map((cv, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <a
                      href={cv.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: 8,
                        background: "var(--primary-50)", color: "var(--primary)",
                        fontSize: 13, fontWeight: 600, textDecoration: "none",
                      }}
                    >
                      <ExternalLink size={13} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cv.name}</span>
                    </a>
                    {cv.videoUrl && (
                      <a
                        href={cv.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "7px 10px", borderRadius: 8,
                          background: "#fef3c7", color: "#b45309",
                          fontSize: 12, fontWeight: 600, textDecoration: "none",
                        }}
                      >
                        <Video size={12} style={{ flexShrink: 0 }} />
                        <span>Watch Video</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ padding: "0 14px 10px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Please let us know which candidate you&apos;d like to proceed with.
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: "10px 14px", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {message.content}
              </div>
              {invoiceUrl && (
                <a
                  href={invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "9px 14px",
                    borderTop: "1px solid var(--border-light)",
                    background: "var(--primary-50)",
                    color: "var(--primary)",
                    fontSize: 13, fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <ExternalLink size={13} />
                  View Invoice
                </a>
              )}
            </>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{time}</div>
      </div>
    </div>
  );
}
