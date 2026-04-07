import { NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";

export const revalidate = 0;

export async function GET() {
  const [underConstruction, countdownEnabled, countdownDate] = await Promise.all([
    getSetting("under_construction"),
    getSetting("launch_countdown_enabled"),
    getSetting("launch_countdown_date"),
  ]);

  return NextResponse.json({
    underConstruction: underConstruction === "true",
    launchCountdown: countdownEnabled === "true",
    launchDate: countdownDate || null,
  });
}
