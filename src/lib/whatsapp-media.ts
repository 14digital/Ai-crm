// Downloading media the applicant sends on WhatsApp.
//
// Meta's Cloud API only gives the webhook a media id, not a direct URL — it
// must be resolved to a short-lived signed URL first (resolveMediaUrl), then
// downloaded with the same bearer auth.

import { authHeader } from "@/lib/whatsapp";

const GRAPH_API_VERSION = "v21.0";

/** Resolve a Meta media id (from a webhook payload) to a short-lived download URL. */
export async function resolveMediaUrl(mediaId: string): Promise<{ url: string; mimeType: string }> {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    throw new Error(`Meta media lookup failed: ${res.status}`);
  }
  const data = (await res.json()) as { url?: string; mime_type?: string };
  if (!data.url) throw new Error("Meta media lookup returned no url");
  return { url: data.url, mimeType: data.mime_type || "application/octet-stream" };
}

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
 * Download a resolved media URL (see resolveMediaUrl for Meta's media ids).
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
    throw new Error(`Media download failed: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_MEDIA_BYTES) throw new MediaTooLargeError(buffer.byteLength);

  return { buffer, mimeType, bytes: buffer.byteLength };
}
