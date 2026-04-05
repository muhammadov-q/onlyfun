/**
 * Ensures scraping happens at most once per day, and only before 7 PM Bishkek time (UTC+6).
 *
 * Uses an in-memory record of the last scrape date per source.
 * On server restart the guard resets, allowing one fresh scrape.
 */

const BISHKEK_OFFSET_HOURS = 6;
const CUTOFF_HOUR = 19; // 7 PM

// Track last scrape date string per source (e.g. "2026-04-05")
const lastScrapeDate: Record<string, string> = {};

function getBishkekNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + BISHKEK_OFFSET_HOURS * 60 * 60 * 1000);
}

function toBishkekDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Returns true if scraping should proceed for the given source.
 * - Only allows one scrape per calendar day (Bishkek time).
 * - Blocks scraping after 7 PM Bishkek time.
 */
export function shouldScrapeToday(source: string): boolean {
  const bishkekNow = getBishkekNow();
  const bishkekHour = bishkekNow.getUTCHours();
  const todayStr = toBishkekDateString(bishkekNow);

  // After 7 PM Bishkek time — no scraping
  if (bishkekHour >= CUTOFF_HOUR) {
    return false;
  }

  // Already scraped today
  if (lastScrapeDate[source] === todayStr) {
    return false;
  }

  // Mark as scraped for today
  lastScrapeDate[source] = todayStr;
  return true;
}
