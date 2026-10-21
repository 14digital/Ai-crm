"use client";

import { useState, useEffect } from "react";
import { Bot, Save, Play, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODEL } from "@/lib/models";

interface BotConfig {
  id: string;
  displayName: string;
  displayPhone: string;
  aiModel: string;
  aiEnabled: boolean;
}

interface TestResult {
  message: string;
  meeting_scheduled: boolean;
  confidence: number;
  lead_info?: {
    name?: string;
    requirement?: string;
    budget?: string;
    meeting_time?: string;
  };
}

const MODEL_OPTIONS = AI_MODEL_OPTIONS;

export default function BotConfigPage() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [model, setModel] = useState<string>(DEFAULT_AI_MODEL);
  const [aiEnabled, setAiEnabled] = useState(true);

  const [testMessage, setTestMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [syncingBranches, setSyncingBranches] = useState(false);
  const [branchSyncMsg, setBranchSyncMsg] = useState<string | null>(null);

  async function syncCare360Reference() {
    setSyncingBranches(true);
    setBranchSyncMsg(null);
    const res = await fetch("/api/admin/care360/sync", { method: "POST" });
    const data = await res.json();
    setSyncingBranches(false);
    if (res.ok) {
      const c = data.counts;
      setBranchSyncMsg(
        `Synced ${c.branches} branches, ${c.nationalities} nationalities, ${c.ethnicities} ethnicities, ${c.religions} religions`
      );
    } else {
      setBranchSyncMsg(data.error || "Sync failed");
    }
    setTimeout(() => setBranchSyncMsg(null), 4000);
  }

  useEffect(() => {
    fetch("/api/admin/bot-config")
      .then(r => r.json())
      .then(data => {
        if (data.id) {
          setConfig(data);
          setModel(data.aiModel);
          setAiEnabled(data.aiEnabled);
        } else {
          setError(data.error || "Failed to load config");
        }
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/admin/bot-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiModel: model, aiEnabled }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error || "Save failed");
    }
    setSaving(false);
  }

  async function runTest() {
    if (!testMessage.trim()) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    const res = await fetch("/api/admin/bot-config/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: testMessage, model }),
    });
    if (res.ok) {
      setTestResult(await res.json());
    } else {
      const d = await res.json();
      setTestError(d.error || "Test failed");
    }
    setTesting(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
        Loading bot configuration...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>Bot Configuration</h1>
        {config && (
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            {config.displayName} · +{config.displayPhone}
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "start" }}>
        {/* Left: Config form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* AI Enabled toggle */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Bot size={18} />
                  AI Bot Status
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  When enabled, AI replies automatically to new conversations
                </div>
              </div>
              <button
                onClick={() => setAiEnabled(!aiEnabled)}
                style={{
                  width: 52, height: 28, borderRadius: 99, border: "none",
                  background: aiEnabled ? "var(--primary)" : "var(--border-light)",
                  cursor: "pointer", position: "relative", transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute", top: 3, left: aiEnabled ? 26 : 3,
                  width: 22, height: 22, borderRadius: "50%", background: "white",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }} />
              </button>
            </div>
          </div>

          {/* Care360 reference-data sync */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                  Care360 Reference Data
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  Sync branches, nationalities, ethnicities and religions from Care360. Required before applications can be submitted.
                </div>
                {branchSyncMsg && (
                  <div style={{ fontSize: 12, color: "var(--primary)", marginTop: 6, fontWeight: 500 }}>
                    {branchSyncMsg}
                  </div>
                )}
              </div>
              <button
                onClick={syncCare360Reference}
                disabled={syncingBranches}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: "1px solid var(--border-light)", background: "var(--bg)",
                  color: "var(--text-primary)", cursor: syncingBranches ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
              >
                <RefreshCw size={13} className={syncingBranches ? "spinner" : ""} />
                {syncingBranches ? "Syncing…" : "Sync Now"}
              </button>
            </div>
          </div>

          {/* Model */}
          <div className="card" style={{ padding: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 8 }}>
              AI Model
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px",
                border: "1px solid var(--border-light)", borderRadius: 8,
                fontSize: 13, color: "var(--text-primary)", background: "var(--bg)",
                outline: "none", cursor: "pointer",
              }}
            >
              {MODEL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Save button */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 22px",
                borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none",
                background: saving ? "var(--border-light)" : "var(--primary)",
                color: saving ? "var(--text-muted)" : "white",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              <Save size={15} />
              {saving ? "Saving..." : "Save Configuration"}
            </button>
            {saved && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#55c0af", fontSize: 13, fontWeight: 500 }}>
                <CheckCircle size={15} /> Saved successfully
              </div>
            )}
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#ef4444", fontSize: 13 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}
          </div>
        </div>

        {/* Right: Test panel */}
        <div className="card" style={{ padding: 20, position: "sticky", top: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
            <Play size={16} />
            Test Bot
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            Send a test message using the current (unsaved) prompt and model.
          </p>
          <textarea
            value={testMessage}
            onChange={e => setTestMessage(e.target.value)}
            placeholder="e.g. السلام عليكم، أحتاج عاملة منزلية مقيمة في مسقط"
            rows={4}
            style={{
              width: "100%", resize: "none",
              border: "1px solid var(--border-light)", borderRadius: 8,
              padding: "10px 12px", fontSize: 13, lineHeight: 1.5,
              color: "var(--text-primary)", background: "var(--bg)",
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              marginBottom: 10,
            }}
          />
          <button
            onClick={runTest}
            disabled={testing || !testMessage.trim()}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
              background: testing || !testMessage.trim() ? "var(--border-light)" : "var(--primary)",
              color: testing || !testMessage.trim() ? "var(--text-muted)" : "white",
              cursor: testing || !testMessage.trim() ? "not-allowed" : "pointer",
              marginBottom: 16,
            }}
          >
            <Play size={14} />
            {testing ? "Testing..." : "Run Test"}
          </button>

          {testError && (
            <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#991b1b" }}>
              {testError}
            </div>
          )}

          {testResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: "12px 14px", background: "var(--primary-50)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  AI Response
                </div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {testResult.message}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "8px 10px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Confidence</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                    {Math.round(testResult.confidence * 100)}%
                  </div>
                </div>
                <div style={{ flex: 1, padding: "8px 10px", background: testResult.meeting_scheduled ? "#e8f8f6" : "var(--bg)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Meeting</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: testResult.meeting_scheduled ? "#1d7a70" : "var(--text-muted)" }}>
                    {testResult.meeting_scheduled ? "Yes" : "No"}
                  </div>
                </div>
              </div>
              {testResult.lead_info && Object.values(testResult.lead_info).some(Boolean) && (
                <div style={{ padding: "10px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Extracted Applicant Info</div>
                  {Object.entries(testResult.lead_info).map(([k, v]) => v && (
                    <div key={k} style={{ fontSize: 12, color: "var(--text-primary)", marginBottom: 3 }}>
                      <b style={{ textTransform: "capitalize" }}>{k.replace("_", " ")}:</b> {v}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
