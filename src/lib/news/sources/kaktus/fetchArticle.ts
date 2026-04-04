export async function fetchKaktusArticle(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OnlyFun/1.0; Bishkek city feed aggregator)",
      Accept: "text/html",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Kaktus article fetch failed: ${res.status} for ${url}`);
  }

  return res.text();
}
