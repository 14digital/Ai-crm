"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";

interface Template {
  id: string;
  name: string;
  displayName: string;
  category: string;
  language: string;
  bodyText: string;
  status: string;
  isActive: boolean;
  createdAt: string;
}

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 520, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <XCircle size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", displayName: "", category: "MARKETING", language: "en", bodyText: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/templates")
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false); });
  }

  useEffect(load, []);

  function openCreate() {
    setForm({ name: "", displayName: "", category: "MARKETING", language: "en", bodyText: "" });
    setFormError(null);
    setShowCreate(true);
  }

  function openEdit(t: Template) {
    setForm({ name: t.name, displayName: t.displayName, category: t.category, language: t.language, bodyText: t.bodyText });
    setFormError(null);
    setEditing(t);
  }

  async function saveCreate() {
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowCreate(false);
      load();
    } else {
      const d = await res.json();
      setFormError(d.error || "Failed to create");
    }
    setSaving(false);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const res = await fetch(`/api/admin/templates/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: form.displayName, category: form.category, bodyText: form.bodyText }),
    });
    if (res.ok) {
      setEditing(null);
      load();
    } else {
      const d = await res.json();
      setFormError(d.error || "Failed to update");
    }
    setSaving(false);
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    setDeleting(id);
    await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  async function toggleActive(t: Template) {
    await fetch(`/api/admin/templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    load();
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--border-light)", borderRadius: 8,
    fontSize: 13, color: "var(--text-primary)", background: "var(--bg)",
    outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit",
  };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block" as const, marginBottom: 5 };

  function TemplateForm({ isEdit }: { isEdit?: boolean }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!isEdit && (
          <div>
            <label style={labelStyle}>Template Name (snake_case, unique)</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} placeholder="e.g. follow_up_msg" style={inputStyle} />
          </div>
        )}
        <div>
          <label style={labelStyle}>Display Name</label>
          <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="e.g. Follow Up Message" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Language</label>
            <input value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} placeholder="en" style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Message Body</label>
          <textarea value={form.bodyText} onChange={e => setForm(f => ({ ...f, bodyText: e.target.value }))} placeholder="Use {{1}}, {{2}} for variables" rows={5} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        {formError && <div style={{ fontSize: 12, color: "#ef4444" }}>{formError}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            onClick={isEdit ? saveEdit : saveCreate}
            disabled={saving}
            style={{
              flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
              background: saving ? "var(--border-light)" : "var(--primary)",
              color: saving ? "var(--text-muted)" : "white", cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Template"}
          </button>
          <button
            onClick={() => { setShowCreate(false); setEditing(null); }}
            style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: "1px solid var(--border-light)", background: "var(--bg-card)",
              color: "var(--text-secondary)", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {(showCreate || editing) && (
        <Modal title={editing ? "Edit Template" : "Create Template"} onClose={() => { setShowCreate(false); setEditing(null); }}>
          <TemplateForm isEdit={!!editing} />
        </Modal>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>Templates</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>{templates.length} templates</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
            borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
            background: "var(--primary)",
            color: "white", cursor: "pointer",
          }}
        >
          <Plus size={16} /> New Template
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg)" }}>
              {["Name", "Category", "Language", "Status", "Active", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "white", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading...</td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No templates yet — create one</td></tr>
            ) : templates.map(t => (
              <tr key={t.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t.displayName}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, fontFamily: "monospace" }}>{t.name}</div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}>
                    {t.category}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{t.language.toUpperCase()}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: t.status === "APPROVED" ? "#e8f8f6" : "#fef3c7",
                    color: t.status === "APPROVED" ? "#1d7a70" : "#92400e",
                  }}>
                    {t.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => toggleActive(t)} style={{ background: "none", border: "none", cursor: "pointer", color: t.isActive ? "#55c0af" : "var(--text-muted)" }}>
                    {t.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </button>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => openEdit(t)}
                      style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      disabled={deleting === t.id}
                      style={{ background: "none", border: "1px solid #fecaca", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
