import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { isValidTimeFormat } from "@/lib/operating-hours";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [enabled, startTime, endTime] = await Promise.all([
    getSetting("night_mode_enabled"),
    getSetting("operating_start_time"),
    getSetting("operating_end_time"),
  ]);

  return NextResponse.json({
    nightModeEnabled: enabled === "true",
    startTime: startTime || "19:00",
    endTime: endTime || "04:00",
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { nightModeEnabled, startTime, endTime } = body as {
    nightModeEnabled: boolean;
    startTime: string;
    endTime: string;
  };

  if (typeof nightModeEnabled !== "boolean") {
    return NextResponse.json({ error: "nightModeEnabled must be a boolean" }, { status: 400 });
  }

  if (!isValidTimeFormat(startTime)) {
    return NextResponse.json({ error: "startTime must be in HH:mm format" }, { status: 400 });
  }

  if (!isValidTimeFormat(endTime)) {
    return NextResponse.json({ error: "endTime must be in HH:mm format" }, { status: 400 });
  }

  await Promise.all([
    setSetting("night_mode_enabled", nightModeEnabled ? "true" : "false"),
    setSetting("operating_start_time", startTime),
    setSetting("operating_end_time", endTime),
  ]);

  return NextResponse.json({ success: true });
}
