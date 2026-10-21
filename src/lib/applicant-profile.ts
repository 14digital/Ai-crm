import { prisma } from "@/lib/prisma";
import {
  ApplicantFormData,
  allRequiredFilled,
  mergeFormData,
  normaliseEmail,
  normaliseNi,
} from "@/lib/applicant-form";

// The applicant's WhatsApp number is their identity. Everything collected for that
// number lives in one row and survives across conversations, so nothing is re-asked.

export interface ApplicantProfileSnapshot {
  id: string;
  waNumber: string;
  formData: ApplicantFormData;
  formComplete: boolean;
  care360ApplicantId: string | null;
  care360SubmittedAt: Date | null;
  submitInFlightAt: Date | null;
  lastSubmitError: string | null;
}

type ProfileRow = {
  id: string;
  waNumber: string;
  formData: unknown;
  formComplete: boolean;
  care360ApplicantId: string | null;
  care360SubmittedAt: Date | null;
  submitInFlightAt: Date | null;
  lastSubmitError: string | null;
};

function toSnapshot(p: ProfileRow): ApplicantProfileSnapshot {
  return {
    id: p.id,
    waNumber: p.waNumber,
    formData: (p.formData as ApplicantFormData) ?? {},
    formComplete: p.formComplete,
    care360ApplicantId: p.care360ApplicantId,
    care360SubmittedAt: p.care360SubmittedAt,
    submitInFlightAt: p.submitInFlightAt,
    lastSubmitError: p.lastSubmitError,
  };
}

/** A submitted profile is frozen — no further edits from the bot or the inbox. */
export function isLocked(profile: ApplicantProfileSnapshot): boolean {
  return !!profile.care360ApplicantId;
}

export async function getOrCreateProfile(waNumber: string): Promise<ApplicantProfileSnapshot> {
  const existing = await prisma.applicantProfile.findUnique({ where: { waNumber } });
  if (existing) return toSnapshot(existing);

  // Seed the mobile number from the verified WhatsApp sender so the bot only has
  // to confirm it rather than ask for it cold.
  const display = waNumber.startsWith("+") ? waNumber : `+${waNumber}`;
  const created = await prisma.applicantProfile.create({
    data: {
      waNumber,
      formData: { carerMobileNumber: display } as object,
      formComplete: false,
    },
  });
  return toSnapshot(created);
}

export async function getProfile(waNumber: string): Promise<ApplicantProfileSnapshot | null> {
  const p = await prisma.applicantProfile.findUnique({ where: { waNumber } });
  return p ? toSnapshot(p) : null;
}

/**
 * Merge extracted updates into the stored form. `formComplete` is decided here,
 * from the data itself — never from the model's own claim.
 */
export async function mergeProfileUpdates(
  waNumber: string,
  updates: Partial<ApplicantFormData> | undefined | null
): Promise<ApplicantProfileSnapshot> {
  const profile = await getOrCreateProfile(waNumber);
  if (isLocked(profile)) return profile;

  const merged = mergeFormData(profile.formData, updates);

  const updated = await prisma.applicantProfile.update({
    where: { waNumber },
    data: {
      formData: merged as object,
      formComplete: allRequiredFilled(merged),
      niNumberNorm: merged.niNumber ? normaliseNi(merged.niNumber) : null,
      emailNorm: merged.carerEmail ? normaliseEmail(merged.carerEmail) : null,
    },
  });

  return toSnapshot(updated);
}

export interface DuplicateHit {
  field: "niNumber" | "carerEmail";
  waNumber: string;
}

/**
 * Care360 rejects duplicate NI numbers and emails. Catching it locally first
 * means the applicant gets a clear answer instead of a raw backend error, and we
 * never burn a submission on a request we know will fail.
 */
export async function findLocalDuplicate(
  waNumber: string,
  formData: ApplicantFormData
): Promise<DuplicateHit | null> {
  const ni = formData.niNumber ? normaliseNi(formData.niNumber) : null;
  const email = formData.carerEmail ? normaliseEmail(formData.carerEmail) : null;
  if (!ni && !email) return null;

  const clash = await prisma.applicantProfile.findFirst({
    where: {
      waNumber: { not: waNumber },
      care360ApplicantId: { not: null },
      OR: [...(ni ? [{ niNumberNorm: ni }] : []), ...(email ? [{ emailNorm: email }] : [])],
    },
    select: { waNumber: true, niNumberNorm: true, emailNorm: true },
  });

  if (!clash) return null;
  if (ni && clash.niNumberNorm === ni) return { field: "niNumber", waNumber: clash.waNumber };
  return { field: "carerEmail", waNumber: clash.waNumber };
}

const IN_FLIGHT_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Claim the right to submit this profile. Returns false when another submission
 * is already running or has already succeeded — this is what stops a double-tap
 * or a duplicate webhook from creating two applicants.
 */
export async function claimSubmitLock(waNumber: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - IN_FLIGHT_TIMEOUT_MS);
  const result = await prisma.applicantProfile.updateMany({
    where: {
      waNumber,
      care360ApplicantId: null,
      OR: [{ submitInFlightAt: null }, { submitInFlightAt: { lt: staleBefore } }],
    },
    data: { submitInFlightAt: new Date() },
  });
  return result.count === 1;
}

export async function releaseSubmitLock(waNumber: string, error: string | null): Promise<void> {
  await prisma.applicantProfile.update({
    where: { waNumber },
    data: { submitInFlightAt: null, lastSubmitError: error },
  });
}

export async function markSubmitted(
  waNumber: string,
  care360ApplicantId: string
): Promise<ApplicantProfileSnapshot> {
  const updated = await prisma.applicantProfile.update({
    where: { waNumber },
    data: {
      care360ApplicantId,
      care360SubmittedAt: new Date(),
      submitInFlightAt: null,
      lastSubmitError: null,
      formComplete: true,
    },
  });
  return toSnapshot(updated);
}
