// Twilio WhatsApp helpers.
// All outgoing messages are sent from TWILIO_WHATSAPP_NUMBER.

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

/** Twilio addresses WhatsApp endpoints as "whatsapp:+E164". */
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

/**
 * Send a plain text message.
 * @returns the Twilio message SID
 */
export async function sendTextMessage(
  toNumber: string,
  text: string
): Promise<string> {
  return postMessage({
    From: getFromNumber(),
    To: waAddress(toNumber),
    Body: text,
  });
}

/**
 * Send a template message.
 *
 * Twilio templates are Content SIDs. If templateName looks like a Content SID
 * (HX...) it is sent as one with the params as ordered variables; otherwise the
 * params are substituted into the template text and sent as a normal body.
 */
export async function sendTemplateMessage(
  toNumber: string,
  templateName: string,
  params: string[],
  buttonUrlParam?: string
): Promise<string> {
  const all = buttonUrlParam ? [...params, buttonUrlParam] : params;

  if (/^HX[0-9a-f]{32}$/i.test(templateName)) {
    const variables: Record<string, string> = {};
    all.forEach((p, i) => {
      variables[String(i + 1)] = p;
    });
    return postMessage({
      From: getFromNumber(),
      To: waAddress(toNumber),
      ContentSid: templateName,
      ContentVariables: JSON.stringify(variables),
    });
  }

  let body = templateName;
  all.forEach((p, i) => {
    body = body.split(`{{${i + 1}}}`).join(p);
  });

  return postMessage({
    From: getFromNumber(),
    To: waAddress(toNumber),
    Body: body,
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
