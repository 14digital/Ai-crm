import { prisma } from "@/lib/prisma";
import { ApplicantFormData, buildApplicantPayload } from "@/lib/applicant-form";

// Care360 / Assisted Lives applicant API.
// Every endpoint we use lives under /non-auth — no token, no login, no session.

// No default on purpose. This value decides where real applications are filed, so a
// missing env var must fail loudly rather than quietly posting live applicants into
// staging — a mistake nobody would notice until the records were asked for.
function getBaseUrl(): string {
  const url = process.env.CARE360_API_URL;
  if (!url) {
    throw new Error(
      "CARE360_API_URL is not set. Set it to the Care360 base URL (staging or production) before submitting applications."
    );
  }
  return url.replace(/\/$/, "");
}

interface Care360Envelope<T> {
  data: T;
  errors?: unknown[];
  message?: string;
  status: boolean;
  error_code?: number;
}

async function getJson<T>(path: string): Promise<Care360Envelope<T>> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Care360 GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as Care360Envelope<T>;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export type LookupType = "nationality" | "ethnicity" | "religion";

interface BranchRecord {
  branchID: string;
  branchName: string;
  branchSlug?: string;
}

interface NamedRecord {
  id: string;
  name: string;
}

const LOOKUP_ENDPOINTS: Record<LookupType, string> = {
  nationality: "/non-auth/get/nationalities",
  ethnicity: "/non-auth/get/ethnicities",
  religion: "/non-auth/get/religions",
};

/**
 * Pull branches + all three dropdowns from Care360 into the local cache.
 * The cache is what the resolver matches against — an ID that is not here is
 * never sent, so a stale cache degrades into "ask the applicant to choose"
 * rather than into a rejected submission.
 */
export async function syncCare360Reference(): Promise<{
  branches: number;
  nationalities: number;
  ethnicities: number;
  religions: number;
}> {
  const [branchRes, nationalityRes, ethnicityRes, religionRes] = await Promise.all([
    getJson<{ records: BranchRecord[] }>("/non-auth/get/branches"),
    getJson<{ records: NamedRecord[] }>(LOOKUP_ENDPOINTS.nationality),
    getJson<{ records: NamedRecord[] }>(LOOKUP_ENDPOINTS.ethnicity),
    getJson<{ records: NamedRecord[] }>(LOOKUP_ENDPOINTS.religion),
  ]);

  // Each table is replaced wholesale rather than upserted row by row: the cache is
  // a pure mirror, nothing holds a foreign key into it, and ~200 sequential upserts
  // blow past Prisma's interactive-transaction timeout. An empty response is
  // skipped so a bad fetch can never wipe a working cache.

  const branches = branchRes.data?.records ?? [];
  if (branches.length > 0) {
    await prisma.$transaction([
      prisma.care360Branch.deleteMany({}),
      prisma.care360Branch.createMany({
        data: branches.map((b) => ({
          branchId: String(b.branchID),
          name: b.branchName,
          slug: b.branchSlug ?? null,
        })),
      }),
    ]);
  }

  const counts = { nationality: 0, ethnicity: 0, religion: 0 };
  const byType: [LookupType, NamedRecord[]][] = [
    ["nationality", nationalityRes.data?.records ?? []],
    ["ethnicity", ethnicityRes.data?.records ?? []],
    ["religion", religionRes.data?.records ?? []],
  ];

  for (const [type, records] of byType) {
    if (records.length === 0) continue;
    counts[type] = records.length;
    await prisma.$transaction([
      prisma.care360Lookup.deleteMany({ where: { type } }),
      prisma.care360Lookup.createMany({
        data: records.map((r) => ({ type, refId: String(r.id), name: r.name })),
      }),
    ]);
  }

  return {
    branches: branches.length,
    nationalities: counts.nationality,
    ethnicities: counts.ethnicity,
    religions: counts.religion,
  };
}

export async function getBranches(): Promise<{ refId: string; name: string; slug: string | null }[]> {
  const rows = await prisma.care360Branch.findMany({ orderBy: { name: "asc" } });
  return rows.map((r) => ({ refId: r.branchId, name: r.name, slug: r.slug }));
}

export async function getLookup(type: LookupType): Promise<{ refId: string; name: string }[]> {
  const rows = await prisma.care360Lookup.findMany({
    where: { type },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({ refId: r.refId, name: r.name }));
}

/** Resolve a stored Care360 id back to its display name, for the inbox panel. */
export async function nameForId(type: LookupType | "branch", refId: string): Promise<string | null> {
  if (!refId) return null;
  if (type === "branch") {
    const b = await prisma.care360Branch.findUnique({ where: { branchId: refId } });
    return b?.name ?? null;
  }
  const row = await prisma.care360Lookup.findUnique({
    where: { type_refId: { type, refId } },
  });
  return row?.name ?? null;
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

export interface Care360SubmitResult {
  ok: boolean;
  applicantId?: string;
  message: string;
  errors: string[];
  httpStatus: number;
  rawBody: string;
}

/** Flatten whatever shape Care360 puts in `errors` into readable strings. */
function flattenErrors(errors: unknown): string[] {
  if (!errors) return [];
  if (Array.isArray(errors)) {
    return errors.flatMap((e) => {
      if (typeof e === "string") return [e];
      if (e && typeof e === "object") return Object.values(e as Record<string, unknown>).map(String);
      return [String(e)];
    });
  }
  if (typeof errors === "object") {
    return Object.entries(errors as Record<string, unknown>).map(
      ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`
    );
  }
  return [String(errors)];
}

/**
 * POST the completed form to Care360.
 *
 * Never throws on a business rejection (duplicate NI number, duplicate email,
 * validation failure) — those come back as ok:false with the messages Care360
 * gave us, so the caller can show them to the applicant and to the inbox.
 */
export async function submitApplicant(formData: ApplicantFormData): Promise<Care360SubmitResult> {
  const payload = buildApplicantPayload(formData);

  const body = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    body.append(key, value);
  }

  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}/non-auth/applicant-store`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
    });
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Network error contacting Care360",
      errors: [],
      httpStatus: 0,
      rawBody: "",
    };
  }

  const text = await res.text();
  console.log(`[care360] POST /non-auth/applicant-store → ${res.status}`, text.slice(0, 2000));

  let parsed: Care360Envelope<unknown> | null = null;
  try {
    parsed = JSON.parse(text) as Care360Envelope<unknown>;
  } catch {
    return {
      ok: false,
      message: `Care360 returned a non-JSON response (HTTP ${res.status}).`,
      errors: [],
      httpStatus: res.status,
      rawBody: text,
    };
  }

  const errors = flattenErrors(parsed.errors);

  if (!res.ok || parsed.status !== true) {
    return {
      ok: false,
      message: parsed.message || `Care360 rejected the application (HTTP ${res.status}).`,
      errors,
      httpStatus: res.status,
      rawBody: text,
    };
  }

  // On success `data` is the new applicant id, e.g. "q2z254x2".
  const applicantId = typeof parsed.data === "string" ? parsed.data : undefined;

  return {
    ok: true,
    applicantId,
    message: parsed.message || "Record created successfully",
    errors,
    httpStatus: res.status,
    rawBody: text,
  };
}
