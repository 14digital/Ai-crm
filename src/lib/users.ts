import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface CreatedUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  generatedPassword: string;
}

export class UserExistsError extends Error {
  code = "EMAIL_EXISTS";
  constructor() {
    super("Email already exists");
  }
}

export async function createSalesPerson(data: {
  name: string;
  email: string;
}): Promise<CreatedUser> {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new UserExistsError();

  const plainPassword = crypto.randomBytes(6).toString("hex");
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const maxSeq = await prisma.user.aggregate({
    where: { role: "SALES_PERSON" },
    _max: { rrSequence: true },
  });
  const nextSeq = (maxSeq._max.rrSequence ?? -1) + 1;

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "SALES_PERSON",
      rrSequence: nextSeq,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  });

  return { ...user, generatedPassword: plainPassword };
}

// Self-service staff signup — the account creates itself with a
// user-chosen password, always as a SALES_PERSON (never ADMIN).
export async function createStaffAccount(data: {
  name: string;
  email: string;
  password: string;
}) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new UserExistsError();

  const passwordHash = await bcrypt.hash(data.password, 12);

  const maxSeq = await prisma.user.aggregate({
    where: { role: "SALES_PERSON" },
    _max: { rrSequence: true },
  });
  const nextSeq = (maxSeq._max.rrSequence ?? -1) + 1;

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "SALES_PERSON",
      rrSequence: nextSeq,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  });
}
