import * as cheerio from "cheerio";
import type { RawEventItem, EventLink } from "@/types/events";

const ITICKET_BASE = "https://iticket.kg";

/** Known garbage strings that are NOT real event titles */
const GARBAGE_LABELS = new Set([
  "all events",
  "concerts",
  "festivals",
  "stand-up",
  "sport",
  "art",
  "contacts",
  "load more",
  "show more",
  "see all",
  "view all",
  "buy tickets",
  "buy",
  "cart",
  "favorites",
  "login",
  "sign in",
  "register",
  "search",
  "menu",
  "home",
  "about",
  "faq",
  "help",
  "privacy",
  "terms",
  "kg",
  "ru",
  "en",
]);

/** URL path patterns that are navigation/category pages, NOT event detail pages */
const NAV_PATH_PATTERNS = [
  /^\/[a-z]{2}\/events\/?$/, // /en/events or /ru/events
  /^\/[a-z]{2}\/events\/\?/, // /en/events?page=2
  /^\/[a-z]{2}\/?$/, // /en/ or /ru/
  /^\/[a-z]{2}\/contacts/, // /en/contacts
  /^\/[a-z]{2}\/venues/, // /en/venues
  /^\/[a-z]{2}\/about/, // /en/about
  /^\/#/, // hash links
];

/** Patterns that indicate a real event detail URL */
const EVENT_DETAIL_PATTERNS = [
  /^\/[a-z]{2}\/events\/[a-z0-9-]+\/[a-z0-9-]+/, // /en/events/concerts/some-slug
  /^\/[a-z]{2}\/events\/[a-z0-9][a-z0-9-]{2,}/, // /en/events/some-event-slug (min 3 chars)
];

/** Category-only slugs that are NOT event slugs */
const CATEGORY_SLUGS = new Set([
  "concerts",
  "festivals",
  "stand-up",
  "standup",
  "sport",
  "art",
  "theatre",
  "theater",
  "cinema",
  "kids",
  "all",
]);

const isDev = process.env.NODE_ENV === "development";

function debugLog(msg: string, data?: unknown) {
  if (isDev) {
    console.log(`[iticket-parser] ${msg}`, data ?? "");
  }
}

/**
 * Check if a text string is likely a garbage/navigation label
 * rather than a real event title.
 */
export function isLikelyGarbageEventText(text: string): boolean {
  if (!text) return true;

  const normalized = text.trim().toLowerCase();

  // Too short to be a real event title
  if (normalized.length < 3) return true;

  // Exact match against known garbage
  if (GARBAGE_LABELS.has(normalized)) return true;

  // Pure number or whitespace
  if (/^\d+$/.test(normalized)) return true;
  if (/^\s*$/.test(normalized)) return true;

  // Single common word that is likely a UI label
  if (normalized.split(/\s+/).length === 1 && normalized.length < 5) {
    return true;
  }

  return false;
}

/**
 * Check if a URL path looks like a real event detail page.
 */
function isEventDetailUrl(path: string): boolean {
  // Must not match navigation patterns
  for (const pattern of NAV_PATH_PATTERNS) {
    if (pattern.test(path)) return false;
  }

  // Check if the last segment is a category-only slug
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (lastSegment && CATEGORY_SLUGS.has(lastSegment)) return false;

  // Must match at least one event detail pattern
  for (const pattern of EVENT_DETAIL_PATTERNS) {
    if (pattern.test(path)) return true;
  }

  return false;
}

/**
 * Parse the iTicket events listing page.
 *
 * Strategy 1: Extract structured event data from __NUXT__ payload.
 * Strategy 2: Extract event detail links from HTML for two-step scraping.
 *
 * Both strategies filter out navigation/category labels.
 */
export function parseITicketEventsPage(html: string): RawEventItem[] {
  // Strategy 1: Extract from __NUXT__ payload (best quality)
  const nuxtEvents = extractFromNuxtPayload(html);
  if (nuxtEvents.length > 0) {
    debugLog(`Nuxt payload yielded ${nuxtEvents.length} events`);
    return nuxtEvents;
  }

  debugLog("No events from Nuxt payload, falling back to HTML link extraction");
  return [];
}

/**
 * Extract event detail links from the HTML page.
 * Used for the two-step scraping flow when Nuxt payload parsing works
 * but we want to supplement with detail pages, or as a fallback.
 */
export function extractEventLinks(html: string): EventLink[] {
  const $ = cheerio.load(html);
  const links: EventLink[] = [];
  const seen = new Set<string>();

  let totalLinks = 0;
  let keptLinks = 0;
  let rejectedNav = 0;

  $('a[href*="/events/"]').each((_, el) => {
    totalLinks++;
    const href = $(el).attr("href");
    if (!href) return;

    // Normalize the path
    const path = href.startsWith("http") ? new URL(href).pathname : href.split("?")[0];

    // Deduplicate
    if (seen.has(path)) return;

    // Check if this is a real event detail URL
    if (!isEventDetailUrl(path)) {
      rejectedNav++;
      return;
    }

    seen.add(path);

    const text = $(el).text().trim();
    links.push({ href: path, text });
    keptLinks++;
  });

  debugLog("Link extraction stats", {
    totalLinks,
    keptLinks,
    rejectedNav,
  });

  return links;
}

// ─── Nuxt payload extraction ────────────────────────────────────────

/**
 * Parse the IIFE argument map from a Nuxt payload like:
 *   (function(a,b,c,...){return {...}})(val1,val2,val3,...)
 * Returns a map from parameter name → string value.
 */
function buildArgMap(payload: string): Map<string, string> {
  const map = new Map<string, string>();

  try {
    // Extract parameter names: (function(a,b,c,...){
    const paramMatch = payload.match(/^\(function\(([^)]*)\)/);
    if (!paramMatch) return map;

    const paramNames = paramMatch[1].split(",").map((s) => s.trim());

    // The IIFE can be either:
    //   (function(...){return {...}})(args)   — split on )(
    //   (function(...){return {...}}(args))   — split on }(
    // Find the argument list after the function body
    let argsStart = payload.lastIndexOf(")(");
    let argsEnd = payload.length - 1;
    if (argsStart !== -1) {
      argsStart += 2;
    } else {
      // Try }( pattern: (function(...){...}(args))
      argsStart = payload.lastIndexOf("}(");
      if (argsStart === -1) return map;
      argsStart += 2;
      // Strip trailing ))
      if (payload.endsWith("))")) argsEnd = payload.length - 2;
    }

    const argsStr = payload.slice(argsStart, argsEnd);

    // Parse argument values — they can be strings, numbers, null, true, false
    const args: string[] = [];
    let i = 0;
    while (i < argsStr.length) {
      const ch = argsStr[i];
      if (ch === "," || ch === " ") {
        i++;
        continue;
      }
      if (ch === '"') {
        // Quoted string
        let end = i + 1;
        while (end < argsStr.length && argsStr[end] !== '"') {
          if (argsStr[end] === "\\") end++; // skip escaped char
          end++;
        }
        args.push(argsStr.slice(i + 1, end));
        i = end + 1;
      } else {
        // Unquoted value (number, null, true, false, identifier)
        let end = i;
        while (end < argsStr.length && argsStr[end] !== ",") end++;
        args.push(argsStr.slice(i, end).trim());
        i = end + 1;
      }
    }

    for (let j = 0; j < paramNames.length && j < args.length; j++) {
      if (paramNames[j] && args[j] !== "null" && args[j] !== "void 0") {
        map.set(paramNames[j], args[j]);
      }
    }
  } catch {
    // Best effort
  }

  debugLog(`Built arg map with ${map.size} entries`);
  return map;
}

function extractFromNuxtPayload(html: string): RawEventItem[] {
  const items: RawEventItem[] = [];

  try {
    // The __NUXT__ payload can be either:
    //   window.__NUXT__ = { ... }           (plain object)
    //   window.__NUXT__ = (function(...){ return {...} })(...) (IIFE)
    // We grab everything between the assignment and </script>.
    const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*([\s\S]*?)\s*<\/script>/);
    if (!nuxtMatch) return [];

    const payload = nuxtMatch[1];

    // Build argument map for resolving variable references in IIFE
    const argMap = buildArgMap(payload);

    // Match event_starts_at with both quoted and unquoted keys
    const eventStartMatches = [...payload.matchAll(/(?:"|)event_starts_at(?:"|)\s*:\s*"([^"]*)"/g)];

    // Fallback: try poster_url
    const anchors =
      eventStartMatches.length > 0
        ? eventStartMatches
        : [...payload.matchAll(/(?:"|)poster_url(?:"|)\s*:\s*"([^"]*)"/g)];

    const seen = new Set<string>();

    for (const match of anchors) {
      const pos = match.index!;
      const objBounds = findEnclosingObject(payload, pos);
      if (!objBounds) continue;

      const block = payload.slice(objBounds.start, objBounds.end + 1);
      const evt = parseEventBlock(block, argMap);
      if (!evt || !evt.name) continue;

      // Filter out garbage titles
      if (isLikelyGarbageEventText(evt.name)) {
        debugLog(`Rejected garbage title from Nuxt: "${evt.name}"`);
        continue;
      }

      const key = evt.slug || evt.name;
      if (seen.has(key)) continue;
      seen.add(key);

      // Build price text
      let price: string | undefined;
      if (evt.min_price != null && evt.max_price != null && evt.min_price !== evt.max_price) {
        price = `${evt.min_price} – ${evt.max_price} KGS`;
      } else if (evt.min_price != null) {
        price = `from ${evt.min_price} KGS`;
      }

      const item: RawEventItem = {
        source: "iticket",
        title: evt.name,
        slug: evt.slug,
        eventId: evt.id,
        url: evt.slug
          ? evt.category_slug
            ? `${ITICKET_BASE}/en/events/${evt.category_slug}/${evt.slug}`
            : `${ITICKET_BASE}/en/events/${evt.slug}`
          : undefined,
        category: evt.category_name,
        categorySlug: evt.category_slug,
        venue: evt.venue_name,
        city: evt.city_name,
        imageUrl: evt.poster_url,
        minPrice: evt.min_price,
        maxPrice: evt.max_price,
        ageLimit: evt.age_limit,
        price,
      };

      if (evt.event_starts_at) {
        item.dateText = formatEventDate(evt.event_starts_at, evt.event_ends_at);
        item.startDate = evt.event_starts_at;
        item.endDate = evt.event_ends_at;
      }

      // Validate: must have title plus at least one metadata field
      if (!item.dateText && !item.price && !item.venue) {
        debugLog(`Rejected event missing metadata: "${item.title}"`);
        continue;
      }

      items.push(item);
    }
  } catch {
    // Payload parsing failed
  }

  debugLog(`Final parsed events from Nuxt: ${items.length}`);
  return items;
}

interface NuxtEventData {
  id?: number;
  name?: string;
  slug?: string;
  category_name?: string;
  category_slug?: string;
  venue_name?: string;
  city_name?: string;
  event_starts_at?: string;
  event_ends_at?: string;
  poster_url?: string;
  min_price?: number;
  max_price?: number;
  age_limit?: string;
}

function findEnclosingObject(str: string, fromPos: number): { start: number; end: number } | null {
  let depth = 0;
  let start = -1;
  for (let i = fromPos; i >= 0; i--) {
    if (str[i] === "}") depth++;
    if (str[i] === "{") {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return null;

  depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === "{") depth++;
    if (str[i] === "}") {
      depth--;
      if (depth === 0) return { start, end: i };
    }
  }
  return null;
}

/**
 * Parse an event block from the Nuxt payload.
 * Keys can be quoted ("name") or unquoted (name).
 * String values can be quoted literals ("value") or variable references (a, b, ...).
 * Variable references are resolved via the argMap extracted from the IIFE.
 */
function parseEventBlock(block: string, argMap: Map<string, string>): NuxtEventData | null {
  try {
    // Build regex that matches a key at a property boundary (after { or ,)
    // Handles both quoted "key" and unquoted key forms
    const keyPattern = (key: string) => `(?:^|[{,])\\s*(?:"|)${key}(?:"|)\\s*:`;

    const extract = (key: string): string | undefined => {
      // Match with quoted string value
      const m = block.match(new RegExp(`${keyPattern(key)}\\s*"([^"]*)"`));
      if (m) return m[1];

      // Try resolving a variable reference
      const varMatch = block.match(new RegExp(`${keyPattern(key)}\\s*([a-zA-Z_$][a-zA-Z0-9_$]*)`));
      if (varMatch) {
        const resolved = argMap.get(varMatch[1]);
        if (resolved !== undefined) return resolved;
      }

      return undefined;
    };

    const extractNum = (key: string): number | undefined => {
      // Direct numeric value
      const m = block.match(new RegExp(`${keyPattern(key)}\\s*(\\d+(?:\\.\\d+)?)`));
      if (m) return parseFloat(m[1]);

      // Variable reference to a number
      const varMatch = block.match(new RegExp(`${keyPattern(key)}\\s*([a-zA-Z_$][a-zA-Z0-9_$]*)`));
      if (varMatch) {
        const resolved = argMap.get(varMatch[1]);
        if (resolved !== undefined) {
          const num = parseFloat(resolved);
          if (!isNaN(num)) return num;
        }
      }

      return undefined;
    };

    const name = extract("name");
    if (!name) return null;

    // Extract venue name from nested venues array
    let venueName: string | undefined;
    const venuesMatch = block.match(/venues\s*:\s*\[([\s\S]*?)\]/);
    if (venuesMatch) {
      const venuesBlock = venuesMatch[1];
      // Try literal string (match name after { or ,)
      const venueNameLit = venuesBlock.match(/(?:^|[{,])\s*(?:"|)name(?:"|)\s*:\s*"([^"]*)"/);
      if (venueNameLit) {
        venueName = venueNameLit[1];
      } else {
        // Try variable reference
        const venueNameVar = venuesBlock.match(
          /(?:^|[{,])\s*(?:"|)name(?:"|)\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/
        );
        if (venueNameVar) {
          venueName = argMap.get(venueNameVar[1]);
        }
      }
    }

    return {
      id: extractNum("id"),
      name,
      slug: extract("slug"),
      category_name: extract("category_name"),
      category_slug: extract("category_slug"),
      venue_name: venueName,
      city_name: extract("city_name") || extract("city"),
      event_starts_at: extract("event_starts_at"),
      event_ends_at: extract("event_ends_at"),
      poster_url: extract("poster_url"),
      min_price: extractNum("min_price"),
      max_price: extractNum("max_price"),
      age_limit: extract("age_limit"),
    };
  } catch {
    return null;
  }
}

function formatEventDate(startIso: string, endIso?: string): string {
  try {
    const start = new Date(startIso);
    if (isNaN(start.getTime())) return startIso;

    const tz = "Asia/Bishkek";

    const dayName = start.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: tz,
    });
    const day = start.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "2-digit",
      year: "numeric",
      timeZone: tz,
    });
    const [dd, mm, yyyy] = day.split("/");
    const dateStr = `${parseInt(dd)}.${mm}.${yyyy}`;

    const startTime = start.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });

    let result = `${dayName} ${dateStr} ${startTime}`;

    if (endIso) {
      const end = new Date(endIso);
      if (!isNaN(end.getTime())) {
        const endTime = end.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: tz,
        });
        result += ` – ${endTime}`;
      }
    }

    return result;
  } catch {
    return startIso;
  }
}
