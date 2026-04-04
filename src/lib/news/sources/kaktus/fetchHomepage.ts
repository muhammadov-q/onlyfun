const KAKTUS_URL = "https://kaktus.media";

export async function fetchKaktusHomepage(): Promise<string> {
  const res = await fetch(KAKTUS_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OnlyFun/1.0; Bishkek city feed aggregator)",
      Accept: "text/html",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Kaktus homepage fetch failed: ${res.status}`);
  }

  return res.text();
}
