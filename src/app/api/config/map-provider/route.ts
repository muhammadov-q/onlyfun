import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

export async function GET() {
  const provider = (await getSetting("map_provider")) || "google";
  return NextResponse.json({ provider });
}
