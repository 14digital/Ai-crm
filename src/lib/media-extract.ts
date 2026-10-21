import { createWorker } from "tesseract.js";
import { DownloadedMedia } from "@/lib/whatsapp-media";

// Turns a voice note / photo / PDF into plain text.
//
//   image     → Tesseract OCR
//   document  → pdf-parse (embedded text layer only, no OCR)
//   audio     → Deepgram
//
// The output is plain text and is fed back into the normal turn as if the
// applicant had typed it.

export type MediaKind = "audio" | "image" | "document";

export function mediaKindFor(mimeType: string): MediaKind | null {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  if (base.startsWith("audio/")) return "audio";
  if (base.startsWith("image/")) return "image";
  if (base === "application/pdf") return "document";
  return null;
}

export interface MediaExtractResult {
  /** Extracted text, or null when nothing usable came back. */
  text: string | null;
  kind: MediaKind;
}

const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen";

/** Voice note → text, via Deepgram. WhatsApp sends OGG/Opus. */
async function transcribeAudio(media: DownloadedMedia): Promise<string | null> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.warn("[media] DEEPGRAM_API_KEY not set — skipping transcription");
    return null;
  }

  const query = new URLSearchParams({
    model: "nova-2",
    language: "en-GB",
    smart_format: "true",
  });

  const res = await fetch(`${DEEPGRAM_URL}?${query}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": media.mimeType,
    },
    body: new Uint8Array(media.buffer),
  });

  if (!res.ok) {
    console.error("[media] Deepgram failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };

  const text = (data.results?.channels || [])
    .map((c) => c.alternatives?.[0]?.transcript || "")
    .join(" ")
    .trim();

  return text || null;
}

/** Photo → text, via OCR. */
async function ocrImage(media: DownloadedMedia): Promise<string | null> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(media.buffer);
    const text = (data.text || "").replace(/\n{3,}/g, "\n\n").trim();
    return text || null;
  } finally {
    await worker.terminate();
  }
}

/** PDF → text. Only reads an embedded text layer; scanned PDFs come back empty. */
async function readPdf(media: DownloadedMedia): Promise<string | null> {
  const pdfParse = (await import("pdf-parse")).default;
  const parsed = await pdfParse(media.buffer);
  const text = (parsed.text || "").replace(/\n{3,}/g, "\n\n").trim();
  return text || null;
}

/**
 * Read the downloaded media.
 * Returns text:null rather than throwing when nothing could be read, so the bot
 * can ask the applicant to try again instead of dropping the message.
 */
export async function extractFromMedia(
  media: DownloadedMedia
): Promise<MediaExtractResult> {
  const kind = mediaKindFor(media.mimeType);
  if (!kind) return { text: null, kind: "document" };

  try {
    let text: string | null = null;
    if (kind === "audio") text = await transcribeAudio(media);
    else if (kind === "image") text = await ocrImage(media);
    else text = await readPdf(media);

    return { text, kind };
  } catch (err) {
    console.error(`[media] ${kind} extraction failed:`, err);
    return { text: null, kind };
  }
}

/** How the extracted text is presented to the intake model as the applicant's turn. */
export function wrapExtractedText(kind: MediaKind, text: string): string {
  switch (kind) {
    case "audio":
      return `[Voice note transcript]\n${text}`;
    case "image":
      return `[Text read from a photo the applicant sent]\n${text}`;
    case "document":
      return `[Text read from a document the applicant sent]\n${text}`;
  }
}
