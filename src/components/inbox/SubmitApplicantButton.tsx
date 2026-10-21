"use client";

import { useState } from "react";
import { CheckCircle, Send } from "lucide-react";
import { ApplicantFormData, allRequiredFilled, missingRequired, FIELD_LABELS } from "@/lib/applicant-form";

export interface ApplicantProfileLite {
  formData: ApplicantFormData;
  formComplete: boolean;
  care360ApplicantId: string | null;
  care360SubmittedAt: Date | string | null;
  lastSubmitError?: string | null;
}

/**
 * Manual submit. The bot normally submits by itself once the applicant confirms —
 * this is the retry path when that failed, and the override for a recruiter who
 * filled in the last gaps by hand.
 */
export function SubmitApplicantButton({
  conversationId,
  profile,
  onSubmitted,
}: {
  conversationId: string;
  profile: ApplicantProfileLite | null;
  onSubmitted: (care360ApplicantId: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadySubmitted = !!profile?.care360ApplicantId;
  const ready = !!profile && allRequiredFilled(profile.formData) && !alreadySubmitted;
  const missing = profile ? missingRequired(profile.formData) : [];

  async function handleClick() {
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/submit-applicant`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        const extra: string[] = [
          ...(data.missingFields ?? []),
          ...(data.fieldErrors ?? []),
        ];
        setError(data.error + (extra.length ? ` — ${extra.join(", ")}` : ""));
        return;
      }
      onSubmitted(data.care360ApplicantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadySubmitted) {
    return (
      <button
        disabled
        title={`Care360 applicant id: ${profile!.care360ApplicantId}`}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "#e8f8f6", color: "#1d7a70",
          border: "1px solid #b8e6df", cursor: "default",
        }}
      >
        <CheckCircle size={13} /> Submitted
      </button>
    );
  }

  const title = ready
    ? "Submit this application to Care360"
    : `Still needed: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        onClick={handleClick}
        disabled={!ready || submitting}
        title={title}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: ready ? "var(--primary)" : "var(--bg)",
          color: ready ? "white" : "var(--text-muted)",
          border: ready ? "none" : "1px solid var(--border-light)",
          cursor: ready && !submitting ? "pointer" : "not-allowed",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        <Send size={13} />
        {submitting ? "Submitting…" : ready ? "Submit Applicant" : `${missing.length} left`}
      </button>
      {error && (
        <div style={{ fontSize: 10, color: "#dc2626", maxWidth: 220, lineHeight: 1.4 }}>{error}</div>
      )}
    </div>
  );
}
