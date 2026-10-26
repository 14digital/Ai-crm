const REQUIRED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "GEMINI_API_KEY",
  "PUSHER_APP_ID",
  "PUSHER_KEY",
  "PUSHER_SECRET",
  "PUSHER_CLUSTER",
  "ENCRYPTION_KEY",
  "API_SECRET_KEY",
  "CARE360_API_URL",
];

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  validated = true;

  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[Glow Studio Desk] Missing required environment variables: ${missing.join(", ")}`);
  }
}
