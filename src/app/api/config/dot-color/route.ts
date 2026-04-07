import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

export async function GET() {
  const mode = (await getSetting("dot_color_mode")) || "random";
  const color = (await getSetting("dot_uniform_color")) || "#6366f1";
  return NextResponse.json({ mode, color });
}
