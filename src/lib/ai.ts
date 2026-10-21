import { GoogleGenAI } from "@google/genai";
import { DEFAULT_AI_MODEL } from "@/lib/models";
import type { ApplicantField, ApplicantFormData } from "@/lib/applicant-form";
import { TITLES, GENDERS, AVAILABILITIES } from "@/lib/applicant-form";

// Two things happen per turn:
//   composeReply()    — what do we say back? (Gemini)
//   extractFormData() — what did the applicant just tell us? (plain patterns)
//
// Extraction is deliberately simple. When a pattern does not match, the field is
// left empty and the bot asks for it again on the next turn.

export interface MessageInput {
  senderType: string;
  content: string;
  /** Voice transcript / image OCR / PDF text — read instead of `content`. */
  transcript?: string | null;
}

export interface ComposeResult {
  message: string;
  ready_to_submit?: boolean;
  needs_human?: boolean;
  needs_human_reason?: string;
}

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey });
}

// NO is always tested first: "I do not have one" starts with "i do", so a
// yes-first check would read it as a yes.
const NO_RE = /^((n|no|nope|nah|none|false|never)\b|i (do|am|have|did)\s*(n[o’']?t|not)\b)/i;
const YES_RE = /^((y|yes|yeah|yep|yup|ok|okay|sure|correct|true)\b|i (do|am|have|did)\b(?!\s*n[o’']?t\b)(?!\s+not\b))/i;

const YES_NO_FIELDS: ApplicantField[] = [
  "referredForJob",
  "hasUkDrivingLicense",
  "eligibleToWorkUk",
  "criminalRecord",
];

const DATE_FIELDS: ApplicantField[] = ["carerDOB", "canStart"];

const LONG_TEXT_FIELDS: ApplicantField[] = [
  "availabilityJson",
  "employmentHistoryDetails",
  "educationTraining",
  "carerCommunication",
  "criminalRecordDetails",
];

const FREE_TEXT_FIELDS: ApplicantField[] = [
  "carerReferredBy",
  "carerEthnicGroup",
  "carerReligiousGroup",
  "carerAddress1",
  "carerAddress2",
  "carerAddressTown",
  "carerCountryId",
  "languageSkillsJson",
  "carerBranchId",
  "positionAppliedFor",
];

/** Turn "14/03/1992" or "1992-03-14" into YYYY-MM-DD. Returns null if neither. */
function parseDate(text: string): string | null {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // UK format: day first.
  const uk = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (uk) {
    const day = uk[1].padStart(2, "0");
    const month = uk[2].padStart(2, "0");
    return `${uk[3]}-${month}-${day}`;
  }

  return null;
}

/**
 * Read what the applicant said.
 *
 * `pending` is the field (or fields) the bot just asked about. Anything that
 * cannot be identified on its own — a bare "yes", a date, a name, a line of free
 * text — is only stored when it answers a question we actually asked. Without
 * that, a "yes" has nothing to attach to and is dropped.
 */
function tryExtractSimple(
  text: string,
  pending: ApplicantField[]
): Partial<ApplicantFormData> {
  const result: Partial<ApplicantFormData> = {};
  const trimmed = text.trim();
  const lines = trimmed
    .split(/[\n;,]/)
    .map((l) => l.trim())
    .filter(Boolean);
  const lower = lines.map((l) => l.toLowerCase());
  const isPending = (f: ApplicantField) => pending.includes(f);

  // --- self-identifying values: safe to read from anywhere in the message ---

  const email = trimmed.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i);
  if (email) result.carerEmail = email[0].toLowerCase();

  const postcode = trimmed.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i);
  if (postcode) result.carerPostcode = `${postcode[1]} ${postcode[2]}`.toUpperCase();

  // NI numbers and postcodes look alike, so skip whatever the postcode claimed.
  const niHaystack = postcode ? trimmed.replace(postcode[0], " ") : trimmed;
  const ni = niHaystack.match(/\b([A-Z]{2})\s?(\d{6})\s?([A-Z])?\b/i);
  if (ni) result.niNumber = (ni[1] + ni[2] + (ni[3] || "")).toUpperCase();

  // --- fixed-choice values: the whole line has to be the answer ---

  const title = TITLES.find((t) => lower.includes(t.toLowerCase()));
  if (title) result.carerTitle = title;

  const gender = GENDERS.find((g) => lower.includes(g.toLowerCase()));
  if (gender) result.carerGender = gender;

  const availability = AVAILABILITIES.find((a) => lower.includes(a.toLowerCase()));
  if (availability) result.carerAvailability = availability;

  // --- everything else only counts as an answer to what we just asked ---

  // A bare yes/no belongs to whichever yes/no question is outstanding.
  const yesNoField = pending.find((f) => YES_NO_FIELDS.includes(f));
  if (yesNoField) {
    if (NO_RE.test(trimmed)) {
      (result as Record<string, unknown>)[yesNoField] = "no";
    } else if (YES_RE.test(trimmed)) {
      (result as Record<string, unknown>)[yesNoField] = "yes";
    }
  }
  // "Do you have use of a vehicle?" is posted as 1/0 rather than yes/no.
  if (isPending("carerIsDriver")) {
    if (NO_RE.test(trimmed)) result.carerIsDriver = "0";
    else if (YES_RE.test(trimmed)) result.carerIsDriver = "1";
  }

  // A date belongs to whichever date question is outstanding — we cannot tell a
  // date of birth from a start date by looking at it.
  const dateField = pending.find((f) => DATE_FIELDS.includes(f));
  if (dateField) {
    const date = parseDate(trimmed);
    if (date) (result as Record<string, unknown>)[dateField] = date;
  }

  // Phone numbers: only when asked, so an NI number or a date is never mistaken
  // for one.
  if (isPending("carerMobileNumber")) {
    const phone = trimmed.match(/\+?\d[\d\s\-()]{8,}\d/);
    if (phone) {
      const digits = phone[0].replace(/[^\d+]/g, "");
      if (digits.replace(/^\+/, "").length >= 10) result.carerMobileNumber = digits;
    }
  }

  // Names: only when asked. "Full Time" and "Care Assistant" are two capitalised
  // words too, so a name is never guessed from an unrelated message.
  if (isPending("carerForename") || isPending("carerSurname")) {
    const words = lines[0]?.split(/\s+/).filter((w) => /^[A-Za-z'-]{2,}$/.test(w)) ?? [];
    if (isPending("carerForename") && isPending("carerSurname") && words.length >= 2) {
      result.carerForename = words[0];
      result.carerSurname = words[words.length - 1];
    } else if (words.length === 1) {
      if (isPending("carerForename")) result.carerForename = words[0];
      else result.carerSurname = words[0];
    }
  }

  // Long free text: store the message as-is against the outstanding question.
  const longField = pending.find((f) => LONG_TEXT_FIELDS.includes(f));
  if (longField && trimmed.length > 0) {
    (result as Record<string, unknown>)[longField] = trimmed;
  }

  // Short free text: a one-line answer to a one-line question.
  const freeField = pending.find((f) => FREE_TEXT_FIELDS.includes(f));
  if (freeField && lines.length === 1 && trimmed.length <= 120) {
    (result as Record<string, unknown>)[freeField] = trimmed;
  }

  return result;
}

/**
 * Extract what the applicant just told us using simple patterns.
 * Returns nothing when nothing matches — the bot then asks again.
 */
export async function extractFormData(
  history: MessageInput[],
  _currentData: ApplicantFormData,
  pending: ApplicantField[] = []
): Promise<Partial<ApplicantFormData>> {
  const latest = history[history.length - 1];
  if (!latest || latest.senderType !== "CLIENT") return {};

  const text = latest.transcript?.trim() || latest.content?.trim() || "";
  if (!text) return {};

  return tryExtractSimple(text, pending);
}

/** Write the reply and ask the next question. */
export async function composeReply(
  history: MessageInput[],
  systemPrompt: string,
  model = DEFAULT_AI_MODEL
): Promise<ComposeResult> {
  const contents = history
    .filter((m) => m.senderType !== "SYSTEM")
    .map((m) => ({
      role: m.senderType === "CLIENT" ? ("user" as const) : ("model" as const),
      parts: [{ text: (m.transcript?.trim() || m.content) ?? "" }],
    }))
    .filter((m) => m.parts[0].text !== "");

  if (contents.length === 0) throw new Error("No messages to process");
  if (contents[contents.length - 1].role !== "user") {
    throw new Error("Conversation must end with an applicant message");
  }

  const response = await client().models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          message: { type: "string" },
          ready_to_submit: { type: "boolean" },
          needs_human: { type: "boolean" },
          needs_human_reason: { type: "string" },
        },
        required: ["message"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response");

  return JSON.parse(text) as ComposeResult;
}
