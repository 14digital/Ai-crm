// Assisted Lives / Care360 applicant registration form.
//
// This is the single source of truth for:
//   - what we collect from the applicant on WhatsApp
//   - which fields are required, and which only become required conditionally
//   - how each value is validated
//   - how the whole thing is turned into the multipart payload for
//     POST /non-auth/applicant-store

// ---------------------------------------------------------------------------
// Enums (exact values the Care360 form posts)
// ---------------------------------------------------------------------------

export const TITLES = ["Mr", "Ms", "Mrs", "Miss", "Dr", "Others"] as const;
export const GENDERS = ["Male", "Female", "Unspecified"] as const;
export const AVAILABILITIES = ["Full Time", "Part Time", "16 Hours", "Weekends"] as const;
export const YES_NO = ["yes", "no"] as const;
export const DRIVER_FLAGS = ["1", "0"] as const; // 1 = Yes, 0 = No

export type Title = (typeof TITLES)[number];
export type Gender = (typeof GENDERS)[number];
export type Availability = (typeof AVAILABILITIES)[number];
export type YesNo = (typeof YES_NO)[number];
export type DriverFlag = (typeof DRIVER_FLAGS)[number];

// Free-text answers must be at least this long (enforced by the web form too).
export const MIN_LONG_TEXT = 100;

// ---------------------------------------------------------------------------
// Collected data
// ---------------------------------------------------------------------------

export interface ApplicantFormData {
  // --- Step 1: Personal Information ---
  carerTitle?: Title;
  carerForename?: string;
  carerSurname?: string;
  carerDOB?: string; // YYYY-MM-DD
  niNumber?: string;
  carerGender?: Gender;
  carerAvailability?: Availability;
  referredForJob?: YesNo;
  carerReferredBy?: string; // only when referredForJob === "yes"
  /** The "Non-availability" textarea — times the applicant is NOT available.
   *  Counter-intuitively the web form posts this into `availabilityJson`. */
  availabilityJson?: string;
  carerEthnicGroup?: string; // Care360 id from /get/ethnicities
  carerEthnicGroupOther?: string; // free text when "Any Other" is chosen
  carerReligiousGroup?: string; // Care360 id from /get/religions
  carerReligiousGroupOther?: string; // free text when "Other" is chosen

  // --- Step 1: Contact Details ---
  carerPostcode?: string;
  carerAddress1?: string; // Street Address
  carerAddress2?: string; // City
  carerAddressTown?: string; // County
  carerMobileNumber?: string;
  carerEmail?: string;
  carerCountryId?: string; // Care360 id from /get/nationalities
  languageSkillsJson?: string;

  // --- Step 2: Area / Position ---
  carerBranchId?: string; // Care360 id from /get/branches
  positionAppliedFor?: string;
  canStart?: string; // YYYY-MM-DD

  // --- Step 3: Employment History ---
  employmentHistoryDetails?: string;

  // --- Step 4: Education and Training ---
  educationTraining?: string;

  // --- Step 5: Supporting Information ---
  hasUkDrivingLicense?: YesNo;
  carerIsDriver?: DriverFlag; // only when hasUkDrivingLicense === "yes"
  eligibleToWorkUk?: YesNo;
  carerCommunication?: string; // min 100 chars

  // --- Step 6: Disclosure & Convictions ---
  criminalRecord?: YesNo;
  criminalRecordDetails?: string; // min 100 chars, only when criminalRecord === "yes"
}

export type ApplicantField = keyof ApplicantFormData;

// Human-readable labels for the inbox panel and for the AI's questions.
export const FIELD_LABELS: Record<ApplicantField, string> = {
  carerTitle: "Title",
  carerForename: "First Name",
  carerSurname: "Last Name",
  carerDOB: "Date of Birth",
  niNumber: "National Insurance Number",
  carerGender: "Gender",
  carerAvailability: "Availability",
  referredForJob: "Referred for this job?",
  carerReferredBy: "Referred by",
  availabilityJson: "Non-availability (times NOT available)",
  carerEthnicGroup: "Ethnic Classification",
  carerEthnicGroupOther: "Ethnic Classification (other)",
  carerReligiousGroup: "Religion",
  carerReligiousGroupOther: "Religion (other)",
  carerPostcode: "Postcode",
  carerAddress1: "Street Address",
  carerAddress2: "City",
  carerAddressTown: "County",
  carerMobileNumber: "Mobile Number",
  carerEmail: "Email",
  carerCountryId: "Nationality",
  languageSkillsJson: "Language Skills",
  carerBranchId: "Area applying for",
  positionAppliedFor: "Position applied for",
  canStart: "Earliest start date",
  employmentHistoryDetails: "Employment History Details",
  educationTraining: "Qualifications and Training",
  hasUkDrivingLicense: "Full UK Driving Licence",
  carerIsDriver: "Access to a vehicle for work",
  eligibleToWorkUk: "Eligible to work in the UK",
  carerCommunication: "Why you are a good candidate",
  criminalRecord: "Criminal convictions / cautions",
  criminalRecordDetails: "Criminal record details",
};

// Which of the 6 form steps each field belongs to — drives the inbox panel grouping.
export const FIELD_SECTIONS: { title: string; fields: ApplicantField[] }[] = [
  {
    title: "Personal Information",
    fields: [
      "carerTitle",
      "carerForename",
      "carerSurname",
      "carerDOB",
      "niNumber",
      "carerGender",
      "carerAvailability",
      "referredForJob",
      "carerReferredBy",
      "availabilityJson",
      "carerEthnicGroup",
      "carerEthnicGroupOther",
      "carerReligiousGroup",
      "carerReligiousGroupOther",
    ],
  },
  {
    title: "Contact Details",
    fields: [
      "carerPostcode",
      "carerAddress1",
      "carerAddress2",
      "carerAddressTown",
      "carerMobileNumber",
      "carerEmail",
      "carerCountryId",
      "languageSkillsJson",
    ],
  },
  {
    title: "Area & Position",
    fields: ["carerBranchId", "positionAppliedFor", "canStart"],
  },
  { title: "Employment History", fields: ["employmentHistoryDetails"] },
  { title: "Education and Training", fields: ["educationTraining"] },
  {
    title: "Supporting Information",
    fields: ["hasUkDrivingLicense", "carerIsDriver", "eligibleToWorkUk", "carerCommunication"],
  },
  {
    title: "Disclosure & Convictions",
    fields: ["criminalRecord", "criminalRecordDetails"],
  },
];

// ---------------------------------------------------------------------------
// Required / conditional rules
// ---------------------------------------------------------------------------

// Always required — every one of these must be filled before we can submit.
const ALWAYS_REQUIRED: ApplicantField[] = [
  "carerTitle",
  "carerForename",
  "carerSurname",
  "carerDOB",
  "niNumber",
  "carerGender",
  "carerAvailability",
  "referredForJob",
  "availabilityJson",
  "carerEthnicGroup",
  "carerReligiousGroup",
  "carerPostcode",
  "carerAddress1",
  "carerAddress2",
  "carerAddressTown",
  "carerMobileNumber",
  "carerEmail",
  "carerCountryId",
  "languageSkillsJson",
  "carerBranchId",
  "positionAppliedFor",
  "canStart",
  "employmentHistoryDetails",
  "educationTraining",
  "hasUkDrivingLicense",
  "eligibleToWorkUk",
  "carerCommunication",
  "criminalRecord",
];

/**
 * Is this field required given what has been answered so far?
 *
 * Three conditional fields exist. Each only becomes required once its gate
 * question is answered "yes" — and while the gate is "no" it must never be asked.
 */
export function isRequired(field: ApplicantField, data: ApplicantFormData): boolean {
  if (ALWAYS_REQUIRED.includes(field)) return true;

  switch (field) {
    // Only asked when the applicant said they were referred.
    case "carerReferredBy":
      return data.referredForJob === "yes";
    // Only asked when they hold a full UK driving licence.
    case "carerIsDriver":
      return data.hasUkDrivingLicense === "yes";
    // Only asked when they declared a conviction.
    case "criminalRecordDetails":
      return data.criminalRecord === "yes";
    default:
      return false;
  }
}

export function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

/** Every field that is required right now and still empty, in question order. */
export function missingRequired(data: ApplicantFormData): ApplicantField[] {
  const ordered = FIELD_SECTIONS.flatMap((s) => s.fields);
  return ordered.filter((f) => isRequired(f, data) && !isFilled(data[f]));
}

export function allRequiredFilled(data: ApplicantFormData): boolean {
  return missingRequired(data).length === 0;
}

/** 0–100, for the inbox progress bar. */
export function progressPercent(data: ApplicantFormData): number {
  const required = FIELD_SECTIONS.flatMap((s) => s.fields).filter((f) => isRequired(f, data));
  if (required.length === 0) return 0;
  const filled = required.filter((f) => isFilled(data[f])).length;
  return Math.round((filled / required.length) * 100);
}

/**
 * Fields that stop being relevant once their gate flips to "no".
 * Clearing them keeps stale answers from an earlier correction out of the payload.
 */
export function clearDeadConditionals(data: ApplicantFormData): ApplicantFormData {
  const out = { ...data };
  if (out.referredForJob === "no") delete out.carerReferredBy;
  if (out.hasUkDrivingLicense === "no") delete out.carerIsDriver;
  if (out.criminalRecord === "no") delete out.criminalRecordDetails;
  return out;
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/** UK NI numbers are stored without spaces and uppercased. */
export function normaliseNi(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** "sw1a1aa" → "SW1A 1AA". Leaves unrecognisable input uppercased but untouched. */
export function normalisePostcode(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  const m = compact.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]}` : compact;
}

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Strip everything that is not a digit or a leading +. */
export function normalisePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface FieldError {
  field: ApplicantField;
  message: string;
}

// Shape check only: two letters, six digits, an optional suffix letter.
//
// Deliberately NOT the full HMRC rule (which bars D/F/I/Q/U/V as the first letter
// and allows only A–D as the suffix). Care360 does not enforce it either — its own
// sample data uses "PH123456S" — so the strict rule would reject applicants the
// backend would happily accept. This still catches real typos.
const NI_RE = /^[A-Z]{2}\d{6}[A-Z]?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Whole years between a date of birth and today. */
export function ageOn(dob: string, on: Date = new Date()): number | null {
  if (!ISO_DATE_RE.test(dob)) return null;
  const d = new Date(`${dob}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  let age = on.getUTCFullYear() - d.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - d.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

/**
 * Validate a single field's value. Returns null when valid.
 * Called on every extraction so a bad value is re-asked instead of stored.
 */
export function validateField(
  field: ApplicantField,
  value: unknown,
  data: ApplicantFormData
): string | null {
  if (!isFilled(value)) return null; // emptiness is handled by missingRequired()
  const s = typeof value === "string" ? value.trim() : String(value);

  switch (field) {
    case "carerTitle":
      return (TITLES as readonly string[]).includes(s) ? null : `Title must be one of: ${TITLES.join(", ")}`;
    case "carerGender":
      return (GENDERS as readonly string[]).includes(s) ? null : `Gender must be one of: ${GENDERS.join(", ")}`;
    case "carerAvailability":
      return (AVAILABILITIES as readonly string[]).includes(s)
        ? null
        : `Availability must be one of: ${AVAILABILITIES.join(", ")}`;
    case "referredForJob":
    case "hasUkDrivingLicense":
    case "eligibleToWorkUk":
    case "criminalRecord":
      return (YES_NO as readonly string[]).includes(s) ? null : `Must be "yes" or "no"`;
    case "carerIsDriver":
      return (DRIVER_FLAGS as readonly string[]).includes(s) ? null : `Must be "1" (yes) or "0" (no)`;

    case "carerDOB": {
      if (!ISO_DATE_RE.test(s)) return "Date of birth must be a real date (YYYY-MM-DD).";
      const age = ageOn(s);
      if (age === null) return "Date of birth must be a real date (YYYY-MM-DD).";
      if (age < 18) return "You must be at least 18 years old to apply.";
      if (age > 100) return "That date of birth does not look right — please check it.";
      return null;
    }

    case "canStart": {
      if (!ISO_DATE_RE.test(s)) return "Start date must be a real date (YYYY-MM-DD).";
      const d = new Date(`${s}T00:00:00Z`);
      if (isNaN(d.getTime())) return "Start date must be a real date (YYYY-MM-DD).";
      const today = new Date();
      const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      if (d.getTime() < todayUtc) return "Start date cannot be in the past.";
      return null;
    }

    case "niNumber":
      return NI_RE.test(normaliseNi(s))
        ? null
        : "That does not look like a valid National Insurance number (e.g. QQ123456A).";

    case "carerEmail":
      return EMAIL_RE.test(s) ? null : "That email address does not look valid.";

    case "carerPostcode":
      return POSTCODE_RE.test(normalisePostcode(s)) ? null : "That does not look like a valid UK postcode.";

    case "carerMobileNumber": {
      const digits = normalisePhone(s).replace(/^\+/, "");
      return digits.length >= 7 && digits.length <= 15 ? null : "That mobile number does not look valid.";
    }

    case "carerCommunication":
      return s.length >= MIN_LONG_TEXT
        ? null
        : `Please give a bit more detail — ${s.length} of ${MIN_LONG_TEXT} characters so far.`;

    case "criminalRecordDetails":
      if (data.criminalRecord !== "yes") return null;
      return s.length >= MIN_LONG_TEXT
        ? null
        : `Please give a bit more detail — ${s.length} of ${MIN_LONG_TEXT} characters so far.`;

    default:
      return null;
  }
}

/** Validate everything currently stored. Used as the final gate before submitting. */
export function validateAll(data: ApplicantFormData): FieldError[] {
  const errors: FieldError[] = [];
  for (const [key, value] of Object.entries(data)) {
    const field = key as ApplicantField;
    const message = validateField(field, value, data);
    if (message) errors.push({ field, message });
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

/**
 * Merge extracted updates into stored data. Empty values never overwrite a
 * stored answer — the AI omitting a field must not wipe it.
 */
export function mergeFormData(
  current: ApplicantFormData,
  updates: Partial<ApplicantFormData> | undefined | null
): ApplicantFormData {
  if (!updates) return current;
  const merged: ApplicantFormData = { ...current };
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    (merged as Record<string, unknown>)[k] = typeof v === "string" ? v.trim() : v;
  }
  return clearDeadConditionals(merged);
}

// ---------------------------------------------------------------------------
// Payload builder
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  return v === undefined || v === null ? "" : String(v);
}

/**
 * Build the exact multipart body Care360's POST /non-auth/applicant-store expects.
 *
 * Every key from the known-good request is always present. Fields we do not
 * collect are sent as empty strings rather than omitted, because the PHP backend
 * reads them positionally and 500s on a missing key.
 */
export function buildApplicantPayload(raw: ApplicantFormData): Record<string, string> {
  const data = clearDeadConditionals(raw);

  // Replicated byte-for-byte from the working request so json_decode never breaks.
  const employmentHistory = JSON.stringify({
    employer_1_address: "",
    job_title: "",
    salary: "",
    responsibilities: "",
    reason_for_leaving: "",
    carer_employment_gaps: "",
    dates_of_employment: { start_date: "", end_date: new Date().toISOString() },
  });

  const previousEmployment = JSON.stringify([
    {
      employment_status: "",
      experience_years: "",
      care_experience: "",
      employer_name: "",
      position: "",
      start_date: "",
      end_date: "",
      salary: "",
      address: "",
      responsibilities: "",
      employment_gaps: "",
      reason_for_leaving: "",
    },
  ]);

  return {
    // --- nested JSON blocks (not collected) ---
    employmentHistory,
    previousEmployment,

    // --- education breakdown (not collected — free text goes in educationTraining) ---
    gcseInstitution: "",
    gcseCourse: "",
    gcseDateFrom: "",
    gcseDateTo: "",
    collegeInstitution: "",
    collegeCourse: "",
    collegeDateFrom: "",
    collegeDateTo: "",
    universityInstitution: "",
    universityCourse: "",
    universityDateFrom: "",
    universityDateTo: "",
    additionalQualifications: "",
    educationGapReason: "",

    // --- personal information ---
    clientGender: str(data.carerGender), // mirrors carerGender in the known-good request
    carerTitle: str(data.carerTitle),
    carerForename: str(data.carerForename),
    carerSurname: str(data.carerSurname),
    carerDOB: str(data.carerDOB),
    niNumber: data.niNumber ? normaliseNi(data.niNumber) : "",
    carerAvailability: str(data.carerAvailability),
    carerGender: str(data.carerGender),
    referredForJob: str(data.referredForJob),
    carerReferredBy: str(data.carerReferredBy),
    carerEthnicGroup: str(data.carerEthnicGroup),
    carerEthnicGroupOther: str(data.carerEthnicGroupOther),
    carerReligiousGroup: str(data.carerReligiousGroup),
    carerReligiousGroupOther: str(data.carerReligiousGroupOther),

    // --- contact details ---
    // NOTE the mapping: City → carerAddress2, County → carerAddressTown.
    carerPostcode: data.carerPostcode ? normalisePostcode(data.carerPostcode) : "",
    carerAddress1: str(data.carerAddress1),
    carerAddress2: str(data.carerAddress2),
    carerAddressTown: str(data.carerAddressTown),
    carerMobileNumber: data.carerMobileNumber ? normalisePhone(data.carerMobileNumber) : "",
    carerEmail: str(data.carerEmail),
    carerCountryId: str(data.carerCountryId),

    // --- area / position ---
    carerBranchId: str(data.carerBranchId),
    positionAppliedFor: str(data.positionAppliedFor),
    canStart: str(data.canStart),

    // --- employment history ---
    employmentHistoryDetails: str(data.employmentHistoryDetails),
    cvFileName: "", // CV upload is explicitly out of scope

    // --- fields the web form posts but we never collect ---
    carerExperienceFrom: "",
    carerExperienceTo: "",
    // Care360 rejects the request with "field is required" if these two are empty,
    // so they cannot be blanked even though we never ask for them separately.
    // Both are duplicates of a value we already hold.
    carerIsParentBranch: str(data.carerBranchId),
    carerPositionAppliedFor: str(data.positionAppliedFor),
    carerPreviousEmployerJobRole: "",
    carerStatus: "NC", // "new candidate" — as sent by the working request
    carerAddress3: "",
    carerRagDetails: "",
    nonAvailability: "", // the Non-availability text goes into availabilityJson below
    carerGenderOther: "",
    carerIsMother: "",

    // --- availability & languages ---
    availabilityJson: str(data.availabilityJson),
    languageSkillsJson: str(data.languageSkillsJson),

    // --- education and training (posted twice by the web form) ---
    educationTraining: str(data.educationTraining),
    oldEducationTraining: str(data.educationTraining),

    // --- supporting information ---
    hasUkDrivingLicense: str(data.hasUkDrivingLicense),
    carerIsDriver: str(data.carerIsDriver),
    eligibleToWorkUk: str(data.eligibleToWorkUk),
    carerCommunication: str(data.carerCommunication),

    // --- acknowledgements: always pre-accepted, never asked ---
    VERIFIED1: "Table A",
    VERIFIED2: "Table A",
    VERIFIED3: "Table A",
    VERIFIED4: "Table A",
    VERIFIED5: "Table A",

    // --- disclosure & convictions ---
    criminalRecord: str(data.criminalRecord),
    criminalRecordDetails: str(data.criminalRecordDetails),
  };
}
