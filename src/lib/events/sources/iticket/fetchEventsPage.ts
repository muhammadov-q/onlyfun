const ITICKET_EVENTS_URL = "https://iticket.kg/en/events";

export async function fetchITicketEventsPage(): Promise<string> {
  const res = await fetch(ITICKET_EVENTS_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OnlyFun/1.0; Bishkek city feed aggregator)",
      Accept: "text/html",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`iTicket events fetch failed: ${res.status}`);
  }

  return res.text();
}
