"use client";

import { useState, useEffect } from "react";
import { Plus, XCircle, Trash2 } from "lucide-react";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  service: string;
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  assignedTo?: { id: string; name: string } | null;
}

const STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-warning",
  CONFIRMED: "badge-primary",
  COMPLETED: "badge-success",
  CANCELLED: "badge-danger",
};

const emptyForm = { customerName: "", customerEmail: "", customerPhone: "", service: "", scheduledAt: "", notes: "" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div className="card" style={{ width: "100%", maxWidth: 480, padding: 24 }}>
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

export function BookingsClient({ isAdmin }: { isAdmin: boolean }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => {
        setBookings(data);
        setLoading(false);
      });
  }

  useEffect(load, []);

  function openCreate() {
    setForm(emptyForm);
    setFormError(null);
    setShowCreate(true);
  }

  async function saveCreate() {
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : "",
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      load();
    } else {
      const d = await res.json();
      setFormError(d.error || "Failed to create booking");
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function deleteBooking(id: string) {
    if (!confirm("Delete this booking?")) return;
    await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    load();
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--border-light)", borderRadius: 8,
    fontSize: 13, color: "var(--text-primary)", background: "var(--bg)",
    outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block" as const, marginBottom: 5 };

  const columns = isAdmin
    ? ["Customer", "Service", "Date & Time", "Assigned To", "Status", "Actions"]
    : ["Customer", "Service", "Date & Time", "Status", "Actions"];

  return (
    <div style={{ padding: 24 }}>
      {showCreate && (
        <Modal title="New Booking" onClose={() => setShowCreate(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Customer Name</label>
              <input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} placeholder="e.g. Sara Khan" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Customer Email</label>
              <input type="email" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} placeholder="sara@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Customer Phone</label>
              <input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} placeholder="+44 7xxx xxxxxx" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Service</label>
              <input value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} placeholder="e.g. Hair, Skin, Nails, Bridal" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date & Time</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            {formError && <div style={{ fontSize: 12, color: "#ef4444" }}>{formError}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={saveCreate}
                disabled={saving}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
                  background: saving ? "var(--border-light)" : "var(--primary)",
                  color: saving ? "var(--text-muted)" : "white", cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Create Booking"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
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
        </Modal>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>{isAdmin ? "All Bookings" : "My Bookings"}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>{bookings.length} bookings</p>
        </div>
        {!isAdmin && (
          <button
            onClick={openCreate}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
              borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none",
              background: "var(--primary)", color: "white", cursor: "pointer",
            }}
          >
            <Plus size={16} /> New Booking
          </button>
        )}
      </div>

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
              {columns.map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#ffffff", background: "var(--sidebar-bg)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading...</td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No bookings yet{isAdmin ? "" : " — create one"}</td></tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600 }}>{b.customerName}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{b.customerEmail}</div>
                    {b.customerPhone && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{b.customerPhone}</div>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{b.service}</td>
                  <td style={{ padding: "12px 16px" }}>{new Date(b.scheduledAt).toLocaleString()}</td>
                  {isAdmin && (
                    <td style={{ padding: "12px 16px" }}>{b.assignedTo?.name || "—"}</td>
                  )}
                  <td style={{ padding: "12px 16px" }}>
                    <select
                      value={b.status}
                      onChange={(e) => updateStatus(b.id, e.target.value)}
                      className={`badge ${STATUS_BADGE[b.status]}`}
                      style={{ border: "none", cursor: "pointer", fontSize: 11 }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => deleteBooking(b.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
