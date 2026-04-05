import type { RawEventItem } from "@/types/events";

const ITICKET_BASE = "https://iticket.kg";

/**
 * Parse the IIFE argument map from a Nuxt payload.
 */
function buildArgMap(payload: string): Map<string, string> {
  const map = new Map<string, string>();

  try {
    const paramMatch = payload.match(/^\(function\(([^)]*)\)/);
    if (!paramMatch) return map;

    const paramNames = paramMatch[1].split(",").map((s) => s.trim());

    let argsStart = payload.lastIndexOf(")(");
    let argsEnd = payload.length - 1;
    if (argsStart !== -1) {
      argsStart += 2;
    } else {
      argsStart = payload.lastIndexOf("}(");
      if (argsStart === -1) return map;
      argsStart += 2;
      if (payload.endsWith("))")) argsEnd = payload.length - 2;
    }

    const argsStr = payload.slice(argsStart, argsEnd);

    const args: string[] = [];
    let i = 0;
    while (i < argsStr.length) {
      const ch = argsStr[i];
      if (ch === "," || ch === " ") {
        i++;
        continue;
      }
      if (ch === '"') {
        let end = i + 1;
        while (end < argsStr.length && argsStr[end] !== '"') {
          if (argsStr[end] === "\\") end++;
          end++;
        }
        args.push(argsStr.slice(i + 1, end));
        i = end + 1;
      } else {
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

  return map;
}

/**
 * Parse event metadata from an iTicket detail page HTML.
 * Extracts data from the __NUXT__ payload embedded in the page.
 */
export function parseITicketEventDetail(html: string, sourceUrl: string): RawEventItem | null {
  try {
    // The __NUXT__ payload can be a plain object or an IIFE.
    // Grab everything between the assignment and </script>.
    const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*([\s\S]*?)\s*<\/script>/);
    if (!nuxtMatch) return null;

    const payload = nuxtMatch[1];

    // Build argument map for IIFE variable resolution
    const argMap = buildArgMap(payload);

    // Extract event fields — handles both quoted and unquoted keys,
    // and resolves IIFE variable references via argMap.
    const extract = (key: string): string | undefined => {
      // Try literal string value
      const m = payload.match(new RegExp(`(?:"|)${key}(?:"|)\\s*:\\s*"([^"]*)"`));
      if (m) return m[1];

      // Try variable reference
      const varMatch = payload.match(
        new RegExp(`(?:"|)${key}(?:"|)\\s*:\\s*([a-zA-Z_$][a-zA-Z0-9_$]*)`)
      );
      if (varMatch) {
        const resolved = argMap.get(varMatch[1]);
        if (resolved !== undefined) return resolved;
      }

      return undefined;
    };

    const extractNum = (key: string): number | undefined => {
      const m = payload.match(new RegExp(`(?:"|)${key}(?:"|)\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
      if (m) return parseFloat(m[1]);

      const varMatch = payload.match(
        new RegExp(`(?:"|)${key}(?:"|)\\s*:\\s*([a-zA-Z_$][a-zA-Z0-9_$]*)`)
      );
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
    if (!name || name.length < 3) return null;

    // Extract venue from nested venues array
    let venueName: string | undefined;
    const venuesMatch = payload.match(/venues\s*:\s*\[([\s\S]*?)\]/);
    if (venuesMatch) {
      const venuesBlock = venuesMatch[1];
      const venueNameLit = venuesBlock.match(/(?:"|)name(?:"|)\s*:\s*"([^"]*)"/);
      if (venueNameLit) {
        venueName = venueNameLit[1];
      } else {
        const venueNameVar = venuesBlock.match(/(?:"|)name(?:"|)\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (venueNameVar) {
          venueName = argMap.get(venueNameVar[1]);
        }
      }
    }

    const slug = extract("slug");
    const categorySlug = extract("category_slug");
    const categoryName = extract("category_name");
    const startsAt = extract("event_starts_at");
    const endsAt = extract("event_ends_at");
    const posterUrl = extract("poster_url");
    const minPrice = extractNum("min_price");
    const maxPrice = extractNum("max_price");
    const ageLimit = extract("age_limit");
    const cityName = extract("city_name") || extract("city");

    // Build price text
    let price: string | undefined;
    if (minPrice != null && maxPrice != null && minPrice !== maxPrice) {
      price = `${minPrice} – ${maxPrice} KGS`;
    } else if (minPrice != null) {
      price = `from ${minPrice} KGS`;
    } else if (maxPrice != null) {
      price = `${maxPrice} KGS`;
    }

    // Format date
    let dateText: string | undefined;
    if (startsAt) {
      dateText = formatEventDate(startsAt, endsAt);
    }
    const startDate = startsAt;
    const endDate = endsAt;

    // Resolve image URL
    let imageUrl: string | undefined;
    if (posterUrl) {
      imageUrl = posterUrl.startsWith("http") ? posterUrl : `https://cdn.iticket.kg${posterUrl}`;
    }

    return {
      source: "iticket",
      title: name,
      slug,
      url: sourceUrl.startsWith("http") ? sourceUrl : `${ITICKET_BASE}${sourceUrl}`,
      category: categoryName,
      categorySlug,
      venue: venueName,
      city: cityName,
      dateText,
      startDate,
      endDate,
      imageUrl,
      minPrice,
      maxPrice,
      ageLimit,
      price,
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
