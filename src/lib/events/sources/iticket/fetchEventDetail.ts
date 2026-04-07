const ITICKET_BASE = "https://iticket.kg";

/**
 * Fetch a single iTicket event detail page by its path.
 * @param path - e.g. "/en/events/concerts/polina-gagarina"
 */
export async function fetchITicketEventDetail(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : `${ITICKET_BASE}${path}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OnlyFun/1.0; Bishkek city feed aggregator)",
      Accept: "text/html",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`iTicket detail fetch failed (${res.status}): ${url}`);
  }

  return res.text();
}
