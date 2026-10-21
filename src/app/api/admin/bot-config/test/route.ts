import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_AI_MODEL } from "@/lib/models";
import { composeReply, extractFormData } from "@/lib/ai";
import { APPLICANT_INTAKE_PROMPT } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { message, systemPrompt, model } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const config = await prisma.whatsAppConfig.findFirst({ where: { isActive: true } });
  const prompt = systemPrompt?.trim() || config?.aiSystemPrompt || APPLICANT_INTAKE_PROMPT;
  const aiModel = model || config?.aiModel || DEFAULT_AI_MODEL;

  const history = [{ senderType: "CLIENT", content: message }];

  try {
    const [reply, extracted] = await Promise.all([
      composeReply(history, prompt, aiModel),
      extractFormData(history, {}),
    ]);
    return NextResponse.json({ ...reply, form_updates: extracted });
  } catch (err) {
    console.error("Bot test error:", err);
    return NextResponse.json({ error: "AI call failed. Check GEMINI_API_KEY and model name." }, { status: 500 });
  }
}
