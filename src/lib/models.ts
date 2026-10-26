// The Gemini model used for chat-based Q&A and message composition.
// Media extraction uses simple regex + OCR/STT libraries, not Gemini.
export const DEFAULT_AI_MODEL = "gemini-3.5-flash";

// Offered in the admin bot-config dropdown for chat composition only.
export const AI_MODEL_OPTIONS = [
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash (Default)" }
] as const;
