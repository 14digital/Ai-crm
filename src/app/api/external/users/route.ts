import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createSalesPerson, UserExistsError } from "@/lib/users";
import { checkRateLimit } from "@/lib/ratelimit";

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per hour per IP
  // Note: in-memory store is per-instance on serverless — for high-volume use, replace with Redis
  const ip = getClientIp(req);
  if (!checkRateLimit(`ext:users:${ip}`, 10, 3_600_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Validate API key using constant-time comparison to prevent timing attacks
  const apiKey = process.env.API_SECRET_KEY;
  if (!apiKey) {
    console.error("[external/users] API_SECRET_KEY is not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const providedKey = req.headers.get("x-api-key") ?? "";
  const keysMatch =
    providedKey.length === apiKey.length &&
    crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(apiKey));

  if (!keysMatch) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createUserSchema.parse(body);
    const user = await createSalesPerson(data);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof UserExistsError) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("[external/users] Create user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
