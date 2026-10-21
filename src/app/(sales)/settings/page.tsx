"use client";

import { useState } from "react";
import { Settings, KeyRound, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (res.ok) {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const d = await res.json();
      setError(d.error || "Failed to change password");
    }
    setSaving(false);
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px",
    border: "1px solid var(--border-light)", borderRadius: 8,
    fontSize: 14, color: "var(--text-primary)", background: "var(--bg)",
    outline: "none", boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  const labelStyle = {
    fontSize: 13, fontWeight: 600, color: "var(--text-secondary)",
    display: "block" as const, marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", display: "flex", alignItems: "center", gap: 8 }}>
          <Settings size={20} />
          Settings
        </h1>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border-light)" }}>
          <KeyRound size={18} color="var(--text-muted)" />
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Change Password</h2>
        </div>

        <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="Minimum 8 characters"
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: 13 }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#55c0af", fontSize: 13, fontWeight: 500 }}>
              <CheckCircle size={15} /> Password changed successfully
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            style={{
              padding: "10px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              border: "none",
              background: saving || !currentPassword || !newPassword || !confirmPassword
                ? "var(--border-light)"
                : "var(--primary)",
              color: saving || !currentPassword || !newPassword || !confirmPassword
                ? "var(--text-muted)" : "white",
              cursor: saving || !currentPassword || !newPassword || !confirmPassword
                ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
