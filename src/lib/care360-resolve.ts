import { getBranches, getLookup, nameForId, LookupType } from "@/lib/care360";
import { ApplicantField, ApplicantFormData, FIELD_LABELS } from "@/lib/applicant-form";

// Turns what an applicant says ("I'm from Pakistan", "Islam", "Birmingham") into
// the Care360 id the API expects.
//
// Two stages, first hit wins:
//   1. normalised exact match against the cached names
//   2. a hand-written alias table (people say country names, the list has demonyms)
//
// When nothing matches we return null and the bot asks the applicant to try again.
// An id that is not in the local cache is never returned.

export interface ResolveResult {
  refId: string | null;
  name: string | null;
  /** How we got there — useful in logs. */
  via: "exact" | "alias" | "none";
  /** Populated when via === "none": a few names to offer. */
  suggestions: string[];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Alias tables — normalised input → the exact Care360 `name`

const NATIONALITY_ALIASES: Record<string, string> = {
  uk: "British",
  "united kingdom": "British",
  britain: "British",
  "great britain": "British",
  gb: "British",
  england: "British",
  english: "British",
  wales: "Welsh",
  scotland: "Scottish",
  "northern ireland": "Northern Irish",
  ireland: "Irish",
  pakistan: "Pakistani",
  india: "Indian",
  bangladesh: "Bangladeshi",
  "sri lanka": "Sri Lankan",
  nepal: "Nepalese",
  nigeria: "Nigerian",
  ghana: "Ghanaian",
  kenya: "Kenyan",
  uganda: "Ugandan",
  tanzania: "Tanzanian",
  zimbabwe: "Zimbabwean",
  zambia: "Zambian",
  "south africa": "South African",
  somalia: "Somali",
  sudan: "Sudanese",
  ethiopia: "Ethiopian",
  eritrea: "Eritrean",
  philippines: "Filipino",
  filipina: "Filipino",
  poland: "Polish",
  romania: "Romanian",
  bulgaria: "Bulgarian",
  hungary: "Hungarian",
  lithuania: "Lithuanian",
  latvia: "Latvian",
  estonia: "Estonian",
  portugal: "Portuguese",
  spain: "Spanish",
  italy: "Italian",
  france: "French",
  germany: "German",
  netherlands: "Dutch",
  holland: "Dutch",
  greece: "Greek",
  albania: "Albanian",
  ukraine: "Ukrainian",
  russia: "Russian",
  turkey: "Turkish",
  iran: "Iranian",
  iraq: "Iraqi",
  syria: "Syrian",
  afghanistan: "Afghan",
  china: "Chinese",
  japan: "Japanese",
  korea: "South Korean",
  "south korea": "South Korean",
  vietnam: "Vietnamese",
  thailand: "Thai",
  malaysia: "Malaysian",
  indonesia: "Indonesian",
  brazil: "Brazilian",
  jamaica: "Jamaican",
  "trinidad": "Trinidadian or Tobagonian",
  "trinidad and tobago": "Trinidadian or Tobagonian",
  usa: "American",
  us: "American",
  "united states": "American",
  america: "American",
  canada: "Canadian",
  australia: "Australian",
  "new zealand": "New Zealander",
  egypt: "Egyptian",
  morocco: "Moroccan",
  algeria: "Algerian",
  tunisia: "Tunisian",
  libya: "Libyan",
};

const RELIGION_ALIASES: Record<string, string> = {
  islam: "Muslim",
  muslim: "Muslim",
  christian: "Christian",
  christianity: "Christian",
  buddhism: "Buddhist",
  buddhist: "Buddhist",
  judaism: "Jewish",
  jewish: "Jewish",
  sikhism: "Sikh",
  sikh: "Sikh",
  hinduism: "Hindu",
  hindu: "Hindu",
  atheism: "Atheism",
  atheist: "Atheism",
  agnostic: "Agnostic",
  none: "None",
};

const ALIAS_TABLES: Record<LookupType | "branch", Record<string, string>> = {
  nationality: NATIONALITY_ALIASES,
  religion: RELIGION_ALIASES,
  ethnicity: {},
  branch: {},
};

// Resolution: exact match or alias

function matchAgainst(
  input: string,
  options: { refId: string; name: string; slug?: string | null }[],
  aliases: Record<string, string>
): ResolveResult | null {
  const n = norm(input);
  if (!n) return null;

  // 1. exact match on name or slug
  const exact = options.find((o) => norm(o.name) === n || (o.slug && norm(o.slug) === n));
  if (exact) return { refId: exact.refId, name: exact.name, via: "exact", suggestions: [] };

  // 2. alias table
  const aliased = aliases[n];
  if (aliased) {
    const hit = options.find((o) => norm(o.name) === norm(aliased));
    if (hit) return { refId: hit.refId, name: hit.name, via: "alias", suggestions: [] };
  }

  // 2b. unambiguous substring match
  const contains = options.filter((o) => norm(o.name).includes(n));
  if (contains.length === 1) {
    return { refId: contains[0].refId, name: contains[0].name, via: "alias", suggestions: [] };
  }

  return null;
}

/** Resolve free text to a nationality / ethnicity / religion id. */
export async function resolveLookup(type: LookupType, input: string): Promise<ResolveResult> {
  const options = await getLookup(type);
  if (options.length === 0) {
    return { refId: null, name: null, via: "none", suggestions: [] };
  }

  const direct = matchAgainst(input, options, ALIAS_TABLES[type]);
  if (direct) return direct;

  // Could not match — offer suggestions
  const suggestions = type === "nationality" ? [] : options.slice(0, 5).map((o) => o.name);
  return { refId: null, name: null, via: "none", suggestions };
}

/** Resolve free text to a branch id. */
export async function resolveBranch(input: string): Promise<ResolveResult> {
  const options = await getBranches();
  if (options.length === 0) {
    return { refId: null, name: null, via: "none", suggestions: [] };
  }

  const direct = matchAgainst(input, options, {});
  if (direct) return direct;

  return { refId: null, name: null, via: "none", suggestions: options.map((o) => o.name) };
}

/**
 * True when a value already looks like a resolved Care360 id rather than free
 * text the applicant typed. Care360 ids are short alphanumeric tokens ("q2w274").
 */
export function looksLikeRefId(value: string): boolean {
  return /^[a-z0-9]{1,10}$/.test(value.trim());
}

const ID_FIELDS: [ApplicantField, LookupType | "branch"][] = [
  ["carerCountryId", "nationality"],
  ["carerEthnicGroup", "ethnicity"],
  ["carerReligiousGroup", "religion"],
  ["carerBranchId", "branch"],
];

/**
 * Convert an extraction's free-text lookup answers into Care360 ids.
 * Anything that cannot be resolved is dropped so the field stays "missing" and
 * gets asked again — with a line explaining why.
 */
export async function resolveFormIds(
  updates: Partial<ApplicantFormData>,
  stored: ApplicantFormData
): Promise<{ resolved: Partial<ApplicantFormData>; unresolved: string[] }> {
  const out = { ...updates };
  const unresolved: string[] = [];

  for (const [field, type] of ID_FIELDS) {
    const raw = out[field];
    if (typeof raw !== "string" || !raw.trim()) continue;

    // Already the stored id, or already a valid id — leave it alone.
    if (raw === stored[field]) continue;
    if (looksLikeRefId(raw) && (await nameForId(type, raw))) continue;

    const result = type === "branch" ? await resolveBranch(raw) : await resolveLookup(type, raw);

    if (result.refId) {
      (out as Record<string, unknown>)[field] = result.refId;
      console.log(`[resolve] ${field}: "${raw}" → ${result.name} (${result.refId}) [${result.via}]`);
    } else {
      delete out[field];
      const options = result.suggestions.length ? ` Try: ${result.suggestions.join(", ")}.` : "";
      unresolved.push(`I didn't match "${raw}" for ${FIELD_LABELS[field]}.${options}`);
    }
  }

  return { resolved: out, unresolved };
}
