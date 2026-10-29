"use client";

import { useState, useRef } from "react";
import { Phone, FileText, CheckCircle, ClipboardList, Lock, AlertTriangle, UserRound, CalendarCheck } from "lucide-react";
import type { BookingDraft, BookingLite } from "./InboxClient";
import {
  ApplicantField,

  FIELD_SECTIONS,
  FIELD_LABELS,
  TITLES,
  GENDERS,
  AVAILABILITIES,
  isRequired,
  isFilled,
  missingRequired,
  progressPercent,
} from "@/lib/applicant-form";
import type { ApplicantProfileLite } from "./SubmitApplicantButton";

export interface LookupOption {
  refId: string;
  name: string;
}

export interface Care360Options {
  branches: LookupOption[];
  nationalities: LookupOption[];
  ethnicities: LookupOption[];
  religions: LookupOption[];
}

interface Conversation {
  id: string;
  clientWaNumber: string;
  clientName?: string | null;
  aiEnabled: boolean;
  internalNotes?: string | null;
  needsHumanAt?: string | null;
  needsHumanReason?: string | null;
}

// Plain enum fields render as a fixed dropdown.
const ENUM_OPTIONS: Partial<Record<ApplicantField, { value: string; label: string }[]>> = {
  carerTitle: TITLES.map((t) => ({ value: t, label: t })),
  carerGender: GENDERS.map((g) => ({ value: g, label: g })),
  carerAvailability: AVAILABILITIES.map((a) => ({ value: a, label: a })),
  referredForJob: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
  hasUkDrivingLicense: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
  eligibleToWorkUk: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
  criminalRecord: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
  carerIsDriver: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }],
};

// Care360 id fields render as a dropdown of the cached lookup, so a recruiter can
// never hand-type an id that does not exist.
const LOOKUP_FIELDS: Partial<Record<ApplicantField, keyof Care360Options>> = {
  carerBranchId: "branches",
  carerCountryId: "nationalities",
  carerEthnicGroup: "ethnicities",
  carerReligiousGroup: "religions",
};

const DATE_FIELDS = new Set<ApplicantField>(["carerDOB", "canStart"]);
const LONG_TEXT_FIELDS = new Set<ApplicantField>([
  "availabilityJson",
  "employmentHistoryDetails",
  "educationTraining",
  "carerCommunication",
  "criminalRecordDetails",
]);

const BOOKING_FIELD_LABELS: Record<keyof BookingDraft, string> = {
  customerName: "Name",
  service: "Service",
  scheduledAt: "Date & Time",
  customerEmail: "Email",
  notes: "Notes",
};

export function ApplicantInfoPanel({
  conversation,
  profile,
  options,
  onProfileUpdate,
  bookingDraft,
  bookings,
  onBookingCreated,
}: {
  conversation: Conversation;
  profile: ApplicantProfileLite | null;
  options: Care360Options;
  onProfileUpdate?: (p: ApplicantProfileLite) => void;
  bookingDraft?: BookingDraft | null;
  bookings?: BookingLite[];
  onBookingCreated?: (b: BookingLite) => void;
}) {
  const [notes, setNotes] = useState(conversation.internalNotes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingField, setEditingField] = useState<ApplicantField | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const locked = !!profile?.care360ApplicantId;
  const formData = profile?.formData ?? {};
  const missing = missingRequired(formData);
  const percent = progressPercent(formData);

  /** Stored value → what the recruiter should see (ids become names). */
  function displayValue(key: ApplicantField): string {
    const raw = formData[key];
    if (!isFilled(raw)) return "";
    const value = String(raw);

    const lookupKey = LOOKUP_FIELDS[key];
    if (lookupKey) {
      return options[lookupKey].find((o) => o.refId === value)?.name ?? value;
    }
    const enums = ENUM_OPTIONS[key];
    if (enums) return enums.find((o) => o.value === value)?.label ?? value;
    return value;
  }

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/conversations/${conversation.id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
  }

  async function createBookingFromDraft() {
    if (!bookingDraft?.customerName || !bookingDraft?.customerEmail || !bookingDraft?.service || !bookingDraft?.scheduledAt) return;
    setCreatingBooking(true);
    setBookingError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: bookingDraft.customerName,
          customerEmail: bookingDraft.customerEmail,
          customerPhone: `+${conversation.clientWaNumber}`,
          service: bookingDraft.service,
          scheduledAt: bookingDraft.scheduledAt,
          notes: bookingDraft.notes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onBookingCreated?.(data as BookingLite);
      } else {
        setBookingError(data.error || "Could not create booking");
      }
    } catch {
      setBookingError("Could not create booking");
    } finally {
      setCreatingBooking(false);
    }
  }

  function startEdit(key: ApplicantField) {
    if (locked) return;
    setFieldError(null);
    setEditingField(key);
    setEditingValue(isFilled(formData[key]) ? String(formData[key]) : "");
  }

  async function handleSaveField(key: ApplicantField, value: string) {
    if (savingRef.current) return;
    savingRef.current = true;
    setEditingField(null);

    const trimmed = value.trim();
    if (!trimmed) {
      savingRef.current = false;
      return;
    }

    try {
      const res = await fetch(`/api/conversations/${conversation.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { [key]: trimmed } }),
      });
      const data = await res.json();
      if (res.ok) {
        onProfileUpdate?.(data.profile as ApplicantProfileLite);
      } else {
        // The server validates human edits too — surface exactly what it rejected.
        setFieldError(data.fieldErrors?.join(" ") ?? data.error ?? "Could not save");
      }
    } finally {
      savingRef.current = false;
    }
  }

  function renderInput(key: ApplicantField) {
    const base: React.CSSProperties = {
      fontSize: 11, padding: "2px 6px",
      border: "1px solid var(--primary)", borderRadius: 4,
      color: "var(--text-primary)", background: "var(--bg)",
      outline: "none", maxWidth: 150,
    };

    const lookupKey = LOOKUP_FIELDS[key];
    const choices = lookupKey
      ? options[lookupKey].map((o) => ({ value: o.refId, label: o.name }))
      : ENUM_OPTIONS[key];

    if (choices) {
      return (
        <select
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => handleSaveField(key, editingValue)}
          style={base}
        >
          <option value="">Select…</option>
          {choices.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    }

    if (LONG_TEXT_FIELDS.has(key)) {
      return (
        <textarea
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => handleSaveField(key, editingValue)}
          rows={4}
          style={{ ...base, maxWidth: 160, resize: "vertical", fontFamily: "inherit" }}
        />
      );
    }

    return (
      <input
        autoFocus
        type={DATE_FIELDS.has(key) ? "date" : "text"}
        value={editingValue}
        onChange={(e) => setEditingValue(e.target.value)}
        onBlur={() => handleSaveField(key, editingValue)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSaveField(key, editingValue);
          if (e.key === "Escape") setEditingField(null);
        }}
        style={base}
      />
    );
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.5px",
  };

  return (
    <div style={{
      width: 300, borderLeft: "1px solid var(--border-light)",
      background: "var(--bg-card)", overflowY: "auto",
      display: "flex", flexDirection: "column",
    }}>
      {/* Applicant identity */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border-light)" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: "var(--primary)",
          color: "white", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 700, marginBottom: 10,
        }}>
          {(conversation.clientName || conversation.clientWaNumber).charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
          {[formData.carerForename, formData.carerSurname].filter(Boolean).join(" ") ||
            conversation.clientName ||
            "Unknown applicant"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, color: "var(--text-muted)", fontSize: 13 }}>
          <Phone size={13} />
          <span>+{conversation.clientWaNumber}</span>
        </div>
      </div>

      {/* Needs a human */}
      {conversation.needsHumanAt && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)", background: "#fffbeb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <UserRound size={14} color="#d97706" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Needs a human</span>
          </div>
          {conversation.needsHumanReason && (
            <div style={{ fontSize: 11, color: "#92400e", lineHeight: 1.4 }}>{conversation.needsHumanReason}</div>
          )}
        </div>
      )}

      {/* Booking */}
      {(bookingDraft && Object.keys(bookingDraft).length > 0) || (bookings && bookings.length > 0) ? (
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <CalendarCheck size={13} color="var(--text-muted)" />
            <span style={labelStyle}>Booking</span>
          </div>

          {bookings && bookings.length > 0 ? (
            bookings.map((b) => (
              <div key={b.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                background: "#e8f8f6", borderRadius: 8, marginBottom: 8,
              }}>
                <CheckCircle size={15} color="#1d7a70" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1d7a70" }}>{b.service}</div>
                  <div style={{ fontSize: 11, color: "#2a8a7f" }}>
                    {new Date(b.scheduledAt).toLocaleString()} · {b.status}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              {(Object.keys(BOOKING_FIELD_LABELS) as (keyof BookingDraft)[]).map((key) => {
                const value = bookingDraft?.[key];
                return (
                  <div key={key} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    gap: 6, padding: "5px 0", borderBottom: "1px solid var(--bg)",
                  }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                      {BOOKING_FIELD_LABELS[key]}
                    </span>
                    <span style={{
                      fontSize: 11, textAlign: "right", maxWidth: 155,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      color: value ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: value ? 600 : 400,
                    }}>
                      {value
                        ? key === "scheduledAt"
                          ? new Date(value).toLocaleString()
                          : value
                        : "pending"}
                    </span>
                  </div>
                );
              })}

              {bookingDraft?.customerName && bookingDraft?.customerEmail && bookingDraft?.service && bookingDraft?.scheduledAt && (
                <>
                  <button
                    onClick={createBookingFromDraft}
                    disabled={creatingBooking}
                    style={{
                      width: "100%", marginTop: 10, padding: 8, borderRadius: 8,
                      fontSize: 12, fontWeight: 600, border: "none",
                      background: "var(--primary)", color: "white",
                      cursor: creatingBooking ? "not-allowed" : "pointer",
                    }}
                  >
                    {creatingBooking ? "Creating…" : "Create Booking"}
                  </button>
                  {bookingError && (
                    <div style={{ fontSize: 10, color: "#dc2626", marginTop: 6 }}>{bookingError}</div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* Submitted */}
      {profile?.care360ApplicantId && (
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid var(--border-light)",
          background: "#e8f8f6", display: "flex", alignItems: "center", gap: 8,
        }}>
          <CheckCircle size={16} color="#1d7a70" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1d7a70" }}>Submitted to Care360</div>
            <div style={{ fontSize: 11, color: "#2a8a7f", marginTop: 1 }}>
              ID {profile.care360ApplicantId}
              {profile.care360SubmittedAt && ` · ${new Date(profile.care360SubmittedAt).toLocaleString()}`}
            </div>
          </div>
        </div>
      )}

      {/* Last submission failure */}
      {!profile?.care360ApplicantId && profile?.lastSubmitError && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)", background: "#fef2f2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <AlertTriangle size={14} color="#dc2626" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>Last submission failed</span>
          </div>
          <div style={{ fontSize: 11, color: "#991b1b", lineHeight: 1.4, wordBreak: "break-word" }}>
            {profile.lastSubmitError}
          </div>
        </div>
      )}

      {/* Application form */}
      {profile && (
        <div style={{ padding: 16, borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ClipboardList size={13} color="var(--text-muted)" />
              <span style={labelStyle}>Application</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: missing.length === 0 ? "#55c0af" : "var(--text-muted)" }}>
              {percent}%
            </span>
          </div>

          <div style={{ height: 5, background: "var(--bg)", borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
            <div style={{
              height: "100%", width: `${percent}%`,
              background: missing.length === 0 ? "#55c0af" : "var(--primary)",
              borderRadius: 99, transition: "width 0.4s ease",
            }} />
          </div>

          {locked && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, color: "var(--text-muted)", fontSize: 10 }}>
              <Lock size={10} /> Locked — already submitted to Care360
            </div>
          )}

          {fieldError && (
            <div style={{ fontSize: 10, color: "#dc2626", marginBottom: 8, lineHeight: 1.4 }}>{fieldError}</div>
          )}

          {FIELD_SECTIONS.map((section) => {
            // A conditional field that is not currently in play is hidden entirely,
            // matching what the applicant was actually asked.
            const visible = section.fields.filter(
              (f) => isRequired(f, formData) || isFilled(formData[f])
            );
            if (visible.length === 0) return null;

            return (
              <div key={section.title} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, opacity: 0.75 }}>
                  {section.title}
                </div>

                {visible.map((key) => {
                  const filled = isFilled(formData[key]);
                  const editing = editingField === key;
                  const shown = displayValue(key);

                  return (
                    <div
                      key={key}
                      onClick={() => !editing && startEdit(key)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        gap: 6, padding: "5px 0", borderBottom: "1px solid var(--bg)",
                        cursor: locked ? "default" : "pointer",
                      }}
                    >
                      <span style={{
                        fontSize: 11, color: filled ? "var(--text-secondary)" : "var(--text-muted)",
                        fontWeight: filled ? 500 : 400, flexShrink: 0,
                      }}>
                        {FIELD_LABELS[key]}
                      </span>

                      {editing ? (
                        renderInput(key)
                      ) : (
                        <span
                          title={shown}
                          style={{
                            fontSize: 11,
                            color: filled ? "var(--text-primary)" : locked ? "var(--text-muted)" : "var(--primary)",
                            fontWeight: filled ? 600 : 400,
                            maxWidth: 155, textAlign: "right",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            opacity: locked && !filled ? 0.4 : 1,
                          }}
                        >
                          {filled ? shown : locked ? "—" : "tap to add"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Internal notes */}
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <FileText size={13} color="var(--text-muted)" />
          <span style={labelStyle}>Internal Notes</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add private notes about this applicant..."
          style={{
            flex: 1, minHeight: 100, resize: "vertical",
            border: "1px solid var(--border-light)", borderRadius: 8,
            padding: "8px 10px", fontSize: 13, color: "var(--text-primary)",
            background: "var(--bg)", fontFamily: "inherit", lineHeight: 1.5,
            outline: "none",
          }}
        />
        <button onClick={saveNotes} disabled={savingNotes} style={{
          marginTop: 8, padding: 7, borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: "1px solid var(--border-light)", background: "var(--bg)",
          color: "var(--text-secondary)", cursor: savingNotes ? "not-allowed" : "pointer",
        }}>
          {savingNotes ? "Saving..." : "Save Notes"}
        </button>
      </div>
    </div>
  );
}
