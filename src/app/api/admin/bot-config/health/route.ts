import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GoogleGenAI } from "@google/genai";

interface ServiceStatus {
  ok: boolean;
  error?: string;
}

async function checkGemini(): Promise<ServiceStatus> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY is not set" };

  try {
    const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: 10000 } });
    await client.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/API key not valid|API_KEY_INVALID/i.test(message)) {
      return { ok: false, error: "Gemini API key is invalid" };
    }
    if (/quota|429|RESOURCE_EXHAUSTED/i.test(message)) {
      return { ok: false, error: "Gemini quota exhausted for today" };
    }
    if (/402|billing|prepayment/i.test(message)) {
      return { ok: false, error: "Gemini billing/credits issue" };
    }
    if (/503|overloaded|UNAVAILABLE/i.test(message)) {
      return { ok: false, error: "Gemini is temporarily overloaded — try again shortly" };
    }
    return { ok: false, error: `Gemini error: ${message.slice(0, 160)}` };
  }
}

async function checkWhatsApp(): Promise<ServiceStatus> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token) return { ok: false, error: "WHATSAPP_ACCESS_TOKEN is not set" };
  if (!phoneId) return { ok: false, error: "WHATSAPP_PHONE_NUMBER_ID is not set" };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}?fields=id&access_token=${token}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data.error?.message || "Unknown WhatsApp API error";
      if (/session has expired|session.*expired/i.test(msg)) {
        return { ok: false, error: "WhatsApp access token has expired" };
      }
      if (/Invalid OAuth access token/i.test(msg)) {
        return { ok: false, error: "WhatsApp access token is invalid" };
      }
      return { ok: false, error: `WhatsApp error: ${msg}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Could not reach WhatsApp API: ${message.slice(0, 160)}` };
  }
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [gemini, whatsapp] = await Promise.all([checkGemini(), checkWhatsApp()]);
  return NextResponse.json({ gemini, whatsapp });
}
