import { NextResponse } from "next/server";
import { generateIceBreakers } from "@/lib/gemini/generateIceBreakers";
import { generateFallbackQuestions } from "@/lib/iceBreakers/fallbackGenerator";
import { ROOM_MODES_MAP } from "@/config/roomModes";
import type { RoomModeId } from "@/types/room";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      topic,
      mode,
      lang = "en",
    } = body as {
      topic?: string;
      mode?: string;
      lang?: "en" | "ru";
    };

    if (!topic || typeof topic !== "string" || topic.trim().length < 2) {
      return NextResponse.json({ error: "Topic is required (min 2 chars)" }, { status: 400 });
    }

    if (!mode || !ROOM_MODES_MAP[mode]) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const modeId = mode as RoomModeId;
    const normalizedLang = lang === "ru" ? "ru" : "en";

    try {
      const questions = await generateIceBreakers(topic.trim(), modeId, normalizedLang);
      return NextResponse.json({ questions });
    } catch {
      // Gemini failed — use deterministic fallback
      const questions = generateFallbackQuestions(topic.trim(), modeId, normalizedLang);
      return NextResponse.json({ questions, fallback: true });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
