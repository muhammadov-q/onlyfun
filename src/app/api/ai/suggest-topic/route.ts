import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { lang } = await req.json();
    const isRu = lang === "ru";

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = isRu
      ? "Придумай одну короткую, весёлую и интересную тему для голосовой комнаты в приложении для общения. Тема должна быть неформальной, на разговорном русском. Максимум 60 символов. Верни ТОЛЬКО текст темы, без кавычек и пояснений."
      : "Generate one short, fun, and interesting topic for a voice chat room in a social app. Keep it casual and conversational. Max 60 characters. Return ONLY the topic text, no quotes or explanation.";

    const result = await model.generateContent(prompt);
    const topic = result.response.text().trim();

    return NextResponse.json({ topic });
  } catch {
    return NextResponse.json({ error: "Failed to generate topic" }, { status: 500 });
  }
}
