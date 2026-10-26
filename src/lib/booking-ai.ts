import { GoogleGenAI } from "@google/genai";
import { DEFAULT_AI_MODEL } from "@/lib/models";
import type { MessageInput } from "@/lib/ai";

// One Gemini call per turn does both jobs: decide what to say, AND read any
// booking fields out of the customer's latest message. The fields are simple
// enough (3 of them) that a dedicated regex extractor isn't worth it — unlike
// the 28-field applicant form, we let the model return structured JSON directly.

export interface BookingDraft {
  customerName?: string;
  customerEmail?: string;
  service?: string;
  /** ISO 8601, e.g. "2026-11-05T14:30:00" */
  scheduledAt?: string;
  notes?: string;
}

export interface ComposeBookingResult {
  message: string;
  booking?: BookingDraft;
  ready_to_book?: boolean;
  needs_human?: boolean;
  needs_human_reason?: string;
}

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  // The SDK retries 5xx/network errors up to 5 times by default, and on a
  // sustained "model overloaded" 503 that can silently stretch a
  // webhook-triggered reply to minutes. One attempt + a 20s cap keeps the
  // worst case short enough to fit inside the webhook route's 60s
  // maxDuration alongside our own manual retry in ai-processor.ts.
  return new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } },
  });
}

export async function composeBookingReply(
  history: MessageInput[],
  systemPrompt: string,
  model = DEFAULT_AI_MODEL
): Promise<ComposeBookingResult> {
  const contents = history
    .filter((m) => m.senderType !== "SYSTEM")
    .map((m) => ({
      role: m.senderType === "CLIENT" ? ("user" as const) : ("model" as const),
      parts: [{ text: (m.transcript?.trim() || m.content) ?? "" }],
    }))
    .filter((m) => m.parts[0].text !== "");

  if (contents.length === 0) throw new Error("No messages to process");
  if (contents[contents.length - 1].role !== "user") {
    throw new Error("Conversation must end with a customer message");
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
          booking: {
            type: "object",
            properties: {
              customerName: { type: "string" },
              customerEmail: { type: "string" },
              service: { type: "string" },
              scheduledAt: { type: "string" },
              notes: { type: "string" },
            },
          },
          ready_to_book: { type: "boolean" },
          needs_human: { type: "boolean" },
          needs_human_reason: { type: "string" },
        },
        required: ["message"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response");

  return JSON.parse(text) as ComposeBookingResult;
}
