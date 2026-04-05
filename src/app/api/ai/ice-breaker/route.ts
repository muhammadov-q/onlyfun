import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini/getClient";

export async function POST(req: Request) {
  try {
    const { topic, lang } = await req.json();
    const isRu = lang === "ru";

    const model = await getGeminiModel();

    const prompt = isRu
      ? `Придумай один короткий, весёлый вопрос-айсбрейкер для голосовой комнаты с темой: "${topic}". Вопрос должен быть на разговорном русском, дружелюбный и провоцирующий обсуждение. Максимум 80 символов. Верни ТОЛЬКО вопрос, без кавычек и пояснений.`
      : `Generate one short, fun ice-breaker question for a voice chat room with the topic: "${topic}". Keep it casual, friendly, and discussion-provoking. Max 80 characters. Return ONLY the question, no quotes or explanation.`;

    const result = await model.generateContent(prompt);
    const question = result.response.text().trim();

    return NextResponse.json({ question });
  } catch (err) {
    if (err instanceof Error && err.message === "AI_DISABLED") {
      return NextResponse.json({ error: "AI features are disabled" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to generate ice breaker" }, { status: 500 });
  }
}
