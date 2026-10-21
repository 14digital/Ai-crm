"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

export function WindowExpiryBanner({ lastClientMessageAt }: { lastClientMessageAt: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!lastClientMessageAt) return;

    function calc() {
      const elapsed = Date.now() - new Date(lastClientMessageAt!).getTime();
      const rem = 24 * 60 * 60 * 1000 - elapsed;
      setRemaining(rem);
    }

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [lastClientMessageAt]);

  if (!remaining || remaining <= 0 || remaining > 4 * 60 * 60 * 1000) return null;

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / 60000);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 16px", background: "#fffbeb",
      borderBottom: "1px solid #fde68a", fontSize: 13, color: "#92400e",
    }}>
      <AlertCircle size={15} />
      <span>
        Window closes in <strong>{hours}h {mins}m</strong> — reply soon or use a template
      </span>
    </div>
  );
}
