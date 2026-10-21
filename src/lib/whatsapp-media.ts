// Downloading media the applicant sends on WhatsApp.
//
// Twilio gives the webhook a MediaUrl directly, so this is a single fetch with
// the account's basic auth.

import { authHeader } from "@/lib/whatsapp";

export const MAX_MEDIA_BYTES = 15 * 1024 * 1024;

export const SUPPORTED_MIME_PREFIXES = ["audio/", "image/"] as const;
export const SUPPORTED_MIME_EXACT = ["application/pdf"] as const;

export function isSupportedMime(mime: string): boolean {
  const base = mime.split(";")[0].trim().toLowerCase();
  if ((SUPPORTED_MIME_EXACT as readonly string[]).includes(base)) return true;
  return SUPPORTED_MIME_PREFIXES.some((p) => base.startsWith(p));
}

export interface DownloadedMedia {
  buffer: Buffer;
  mimeType: string;
  bytes: number;
}

export class MediaTooLargeError extends Error {
  constructor(public readonly bytes: number) {
    super(`Media is ${Math.round(bytes / 1024 / 1024)} MB, over the ${MAX_MEDIA_BYTES / 1024 / 1024} MB limit`);
    this.name = "MediaTooLargeError";
  }
}

export class UnsupportedMediaError extends Error {
  constructor(public readonly mimeType: string) {
    super(`Unsupported media type: ${mimeType}`);
    this.name = "UnsupportedMediaError";
  }
}

/**
 * Download a Twilio media URL.
 * Throws MediaTooLargeError / UnsupportedMediaError so the caller can reply with
 * a specific message rather than a generic failure.
 */
export async function downloadWhatsAppMedia(
  mediaUrl: string,
  contentType: string
): Promise<DownloadedMedia> {
  const mimeType = (contentType || "application/octet-stream").split(";")[0].trim().toLowerCase();
  if (!isSupportedMime(mimeType)) throw new UnsupportedMediaError(mimeType);

  const res = await fetch(mediaUrl, {
    headers: { Authorization: authHeader() },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Twilio media download failed: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_MEDIA_BYTES) throw new MediaTooLargeError(buffer.byteLength);

  return { buffer, mimeType, bytes: buffer.byteLength };
}
