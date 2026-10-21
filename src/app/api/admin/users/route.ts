import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createSalesPerson, UserExistsError } from "@/lib/users";

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

// GET — list all sales persons
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { role: "SALES_PERSON" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      rrSequence: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { assignedConversations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

// POST — create new sales person
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
