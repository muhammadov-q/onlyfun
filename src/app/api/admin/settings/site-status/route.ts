import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [underConstruction, countdownEnabled, countdownDate] = await Promise.all([
    getSetting("under_construction"),
    getSetting("launch_countdown_enabled"),
    getSetting("launch_countdown_date"),
  ]);

  return NextResponse.json({
    underConstruction: underConstruction === "true",
    launchCountdown: countdownEnabled === "true",
    launchDate: countdownDate || "",
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { underConstruction, launchCountdown, launchDate } = body as {
    underConstruction: boolean;
    launchCountdown: boolean;
    launchDate: string;
  };

  if (typeof underConstruction !== "boolean") {
    return NextResponse.json({ error: "underConstruction must be a boolean" }, { status: 400 });
  }

  if (typeof launchCountdown !== "boolean") {
    return NextResponse.json({ error: "launchCountdown must be a boolean" }, { status: 400 });
  }

  if (launchCountdown && !launchDate) {
    return NextResponse.json(
      { error: "Launch date is required when countdown is enabled" },
      { status: 400 }
    );
  }

  let storedDate = "";
  if (launchDate) {
    const parsed = new Date(launchDate);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid launch date format" }, { status: 400 });
    }
    storedDate = parsed.toISOString();
  }

  await Promise.all([
    setSetting("under_construction", underConstruction ? "true" : "false"),
    setSetting("launch_countdown_enabled", launchCountdown ? "true" : "false"),
    setSetting("launch_countdown_date", storedDate),
  ]);

  return NextResponse.json({ success: true });
}
