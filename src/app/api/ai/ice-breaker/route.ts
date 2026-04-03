import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { topic, lang } = await req.json();
    const isRu = lang === "ru";

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = isRu
      ? `Придумай один короткий, весёлый вопрос-айсбрейкер для голосовой комнаты с темой: "${topic}". Вопрос должен быть на разговорном русском, дружелюбный и провоцирующий обсуждение. Максимум 80 символов. Верни ТОЛЬКО вопрос, без кавычек и пояснений.`
      : `Generate one short, fun ice-breaker question for a voice chat room with the topic: "${topic}". Keep it casual, friendly, and discussion-provoking. Max 80 characters. Return ONLY the question, no quotes or explanation.`;

    const result = await model.generateContent(prompt);
    const question = result.response.text().trim();

    return NextResponse.json({ question });
  } catch {
    return NextResponse.json({ error: "Failed to generate ice breaker" }, { status: 500 });
  }
}
