import { getSetting } from "./settings";

/** Bishkek timezone (UTC+6, no DST) */
const TIMEZONE = "Asia/Bishkek";

export interface OperatingHoursStatus {
  /** Whether the night-mode restriction is enabled at all */
  isRestricted: boolean;
  /** Whether the app is currently open (always true when isRestricted is false) */
  isOpenNow: boolean;
  /** Configured start time, e.g. "19:00" */
  startTime: string;
  /** Configured end time, e.g. "04:00" */
  endTime: string;
  /** Milliseconds until the app opens (0 when open). Based on server Bishkek time. */
  opensInMs: number;
}

/**
 * Check if a given HH:mm time falls within a start→end range.
 * Supports overnight ranges like 19:00→04:00.
 */
export function isWithinOperatingHours(
  currentHHMM: string,
  startHHMM: string,
  endHHMM: string
): boolean {
  const cur = toMinutes(currentHHMM);
  const start = toMinutes(startHHMM);
  const end = toMinutes(endHHMM);

  if (start <= end) {
    // Normal range: e.g. 09:00 → 18:00
    return cur >= start && cur < end;
  } else {
    // Overnight range: e.g. 19:00 → 04:00
    return cur >= start || cur < end;
  }
}

/** Convert "HH:mm" to minutes since midnight */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Compute ms from current Bishkek time until the target HH:mm */
function msUntil(targetHHMM: string): number {
  const now = new Date();
  // Build a Date for "today at targetHHMM" in Bishkek (UTC+6)
  const bishkekNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bishkek" }));
  const [h, m] = targetHHMM.split(":").map(Number);
  const target = new Date(bishkekNow);
  target.setHours(h, m, 0, 0);
  let diff = target.getTime() - bishkekNow.getTime();
  if (diff <= 0) diff += 24 * 60 * 60 * 1000; // next day
  return diff;
}

/** Get current time in Bishkek as "HH:mm" */
export function getBishkekTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Validate HH:mm format */
export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/** Fetch operating hours settings from DB and compute current status */
export async function getOperatingHoursStatus(): Promise<OperatingHoursStatus> {
  const [enabled, startTime, endTime] = await Promise.all([
    getSetting("night_mode_enabled"),
    getSetting("operating_start_time"),
    getSetting("operating_end_time"),
  ]);

  const isRestricted = enabled === "true";
  const start = startTime || "19:00";
  const end = endTime || "04:00";

  if (!isRestricted) {
    return { isRestricted: false, isOpenNow: true, startTime: start, endTime: end, opensInMs: 0 };
  }

  const currentTime = getBishkekTime();
  const isOpenNow = isWithinOperatingHours(currentTime, start, end);
  const opensInMs = isOpenNow ? 0 : msUntil(start);

  return { isRestricted, isOpenNow, startTime: start, endTime: end, opensInMs };
}
