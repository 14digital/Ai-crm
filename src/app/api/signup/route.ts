import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createStaffAccount, UserExistsError } from "@/lib/users";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = signupSchema.parse(body);
    const user = await createStaffAccount(data);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof UserExistsError) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
