"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RotateCw, UserCheck, UserX, KeyRound, Copy, Check, Trash2 } from "lucide-react";

interface SalesPerson {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { assignedConversations: number };
}

export default function TeamPage() {
  const [users, setUsers] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesPerson | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function showToast(msg: string, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName, email: createEmail }),
    });
    const data = await res.json();
    setCreating(false);

    if (res.ok) {
      setGeneratedPassword(data.generatedPassword);
      fetchUsers();
      showToast(`${data.name} created successfully`);
    } else {
      showToast(data.error || "Failed to create user", "error");
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      fetchUsers();
      showToast(`User ${isActive ? "deactivated" : "activated"}`);
    }
  }

  async function resetPassword(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    const data = await res.json();
    if (res.ok && data.generatedPassword) {
      setGeneratedPassword(data.generatedPassword);
      setShowCreate(false);
      showToast("Password reset successfully");
    }
  }

  function copyPassword() {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }


  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setDeleteTarget(null);
      fetchUsers();
      showToast(`${deleteTarget.name} deleted`);
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to delete user", "error");
    }
  }

  function closeCreateModal() {
    setShowCreate(false);
    setCreateName("");
    setCreateEmail("");
    setGeneratedPassword("");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px" }}>Team Management</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Manage your sales team members
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setGeneratedPassword(""); }}>
          <Plus size={18} />
          Add Sales Person
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40 }}>
                  <div className="spinner" style={{ margin: "0 auto" }} />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  No sales persons yet. Click &quot;Add Sales Person&quot; to create one.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: u.isActive ? "var(--primary-50)" : "var(--border-light)",
                        color: u.isActive ? "var(--primary)" : "var(--text-muted)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700
                      }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.isActive ? "badge-success" : "badge-danger"}`}>
                      <span className={`status-dot ${u.isActive ? "status-dot-active" : "status-dot-inactive"}`} style={{ marginRight: 6 }} />
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{u._count.assignedConversations}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => toggleActive(u.id, u.isActive)}
                        title={u.isActive ? "Deactivate" : "Activate"}
                      >
                        {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => resetPassword(u.id)}
                        title="Reset Password"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setDeleteTarget(u)}
                        title="Delete User"
                        style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Add Sales Person</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
              A password will be auto-generated
            </p>

            {!generatedPassword ? (
              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Full Name</label>
                  <input className="input" placeholder="Ahmed Khan" value={createName} onChange={(e) => setCreateName(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Email</label>
                  <input className="input" type="email" placeholder="ahmed@company.com" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} required />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button type="button" className="btn btn-outline" onClick={closeCreateModal} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={creating} style={{ flex: 1 }}>
                    {creating ? <span className="spinner" /> : "Create"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="animate-fade-in">
                <div style={{
                  background: "var(--success-light)", padding: 16, borderRadius: 10,
                  border: "1px solid rgba(16,185,129,0.2)", marginBottom: 16
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", marginBottom: 8 }}>
                    ✓ User created! Share this password:
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <code style={{
                      flex: 1, padding: "8px 12px", background: "white", borderRadius: 6,
                      fontSize: 16, fontWeight: 700, letterSpacing: 1, fontFamily: "monospace"
                    }}>
                      {generatedPassword}
                    </code>
                    <button className="btn btn-sm btn-primary" onClick={copyPassword}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <button className="btn btn-outline" onClick={closeCreateModal} style={{ width: "100%" }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generated password modal (for reset) */}
      {generatedPassword && !showCreate && (
        <div className="modal-overlay" onClick={() => setGeneratedPassword("")}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ padding: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>New Password</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <code style={{
                flex: 1, padding: "10px 14px", background: "var(--bg)", borderRadius: 8,
                fontSize: 16, fontWeight: 700, letterSpacing: 1, fontFamily: "monospace"
              }}>
                {generatedPassword}
              </code>
              <button className="btn btn-sm btn-primary" onClick={copyPassword}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button className="btn btn-outline" onClick={() => setGeneratedPassword("")} style={{ width: "100%" }}>Done</button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ padding: 32, maxWidth: 400 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "var(--danger-light)", color: "var(--danger)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16
            }}>
              <Trash2 size={22} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete User?</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>
              You are about to permanently delete:
            </p>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>{deleteTarget.name}</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>{deleteTarget.email}</p>
            <p style={{
              fontSize: 13, color: "var(--danger)", fontWeight: 500,
              padding: "10px 14px", background: "var(--danger-light)", borderRadius: 8, marginBottom: 24
            }}>
              This action cannot be undone. All their data will be removed.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmDelete}
                disabled={deleting}
                style={{ flex: 1, background: "var(--danger)", borderColor: "var(--danger)" }}
              >
                {deleting ? <span className="spinner" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
