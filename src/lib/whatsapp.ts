// WhatsApp Cloud API (Meta) helpers.
// All outgoing messages are sent from WHATSAPP_PHONE_NUMBER_ID via graph.facebook.com.

const GRAPH_API_VERSION = "v21.0";

function getAccessToken(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN not set");
  return token;
}

function getPhoneNumberId(): string {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error("WHATSAPP_PHONE_NUMBER_ID not set");
  return id;
}

/** Meta wants digits only (no "+", no "whatsapp:" prefix). */
function toE164Digits(number: string): string {
  return number.trim().replace(/[^\d]/g, "");
}

export function authHeader(): string {
  return `Bearer ${getAccessToken()}`;
}

async function postMessage(payload: Record<string, unknown>): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${getPhoneNumberId()}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    console.error("WhatsApp Cloud API error:", response.status, err);
    throw new Error(`WhatsApp Cloud API error: ${response.status}`);
  }

  const data = (await response.json()) as { messages?: { id?: string }[] };
  return data.messages?.[0]?.id || "";
}

/**
 * Send a plain text message.
 * @returns the WhatsApp message id
 */
export async function sendTextMessage(
  toNumber: string,
  text: string
): Promise<string> {
  return postMessage({
    to: toE164Digits(toNumber),
    type: "text",
    text: { body: text },
  });
}

/**
 * Send a template message. templateName must match a Meta-approved template
 * name (as created in WhatsApp Manager), not a Twilio Content SID.
 */
export async function sendTemplateMessage(
  toNumber: string,
  templateName: string,
  params: string[],
  buttonUrlParam?: string
): Promise<string> {
  const components: Record<string, unknown>[] = [];

  if (params.length > 0) {
    components.push({
      type: "body",
      parameters: params.map((p) => ({ type: "text", text: p })),
    });
  }

  if (buttonUrlParam) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: buttonUrlParam }],
    });
  }

  return postMessage({
    to: toE164Digits(toNumber),
    type: "template",
    template: {
      name: templateName,
      language: { code: "en_US" },
      ...(components.length > 0 ? { components } : {}),
    },
  });
}

/**
 * Check if the 24-hour messaging window is still open
 */
export function isWindowOpen(lastClientMessageAt: Date | null): boolean {
  if (!lastClientMessageAt) return false;
  const elapsed = Date.now() - lastClientMessageAt.getTime();
  return elapsed < 24 * 60 * 60 * 1000; // 24 hours in ms
}

/* ===========================================================================
 * LEGACY — Twilio WhatsApp helpers (commented out, kept for reference/rollback)
 * ===========================================================================

const TWILIO_API_URL = "https://api.twilio.com/2010-04-01";

function getAccountSid(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  if (!sid) throw new Error("TWILIO_ACCOUNT_SID not set");
  return sid;
}

function getAuthToken(): string {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) throw new Error("TWILIO_AUTH_TOKEN not set");
  return token;
}

function waAddress(number: string): string {
  const trimmed = number.trim();
  const e164 = trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/[^\d]/g, "")}`;
  return `whatsapp:${e164}`;
}

export function authHeader(): string {
  return "Basic " + Buffer.from(`${getAccountSid()}:${getAuthToken()}`).toString("base64");
}

function getFromNumber(): string {
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!from) throw new Error("TWILIO_WHATSAPP_NUMBER not set");
  return waAddress(from);
}

async function postMessage(params: Record<string, string>): Promise<string> {
  const response = await fetch(
    `${TWILIO_API_URL}/Accounts/${getAccountSid()}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    console.error("Twilio API error:", response.status, err);
    throw new Error(`Twilio API error: ${response.status}`);
  }

  const data = (await response.json()) as { sid?: string };
  return data.sid || "";
}

export async function sendTextMessage(toNumber: string, text: string): Promise<string> {
  return postMessage({ From: getFromNumber(), To: waAddress(toNumber), Body: text });
}

export async function sendTemplateMessage(
  toNumber: string,
  templateName: string,
  params: string[],
  buttonUrlParam?: string
): Promise<string> {
  const all = buttonUrlParam ? [...params, buttonUrlParam] : params;

  if (/^HX[0-9a-f]{32}$/i.test(templateName)) {
    const variables: Record<string, string> = {};
    all.forEach((p, i) => { variables[String(i + 1)] = p; });
    return postMessage({
      From: getFromNumber(),
      To: waAddress(toNumber),
      ContentSid: templateName,
      ContentVariables: JSON.stringify(variables),
    });
  }

  let body = templateName;
  all.forEach((p, i) => { body = body.split(`{{${i + 1}}}`).join(p); });

  return postMessage({ From: getFromNumber(), To: waAddress(toNumber), Body: body });
}

export function isWindowOpen(lastClientMessageAt: Date | null): boolean {
  if (!lastClientMessageAt) return false;
  const elapsed = Date.now() - lastClientMessageAt.getTime();
  return elapsed < 24 * 60 * 60 * 1000;
}

 * =========================================================================== */
