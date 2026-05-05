// FX rates service.
//
// Source: Frankfurter API (https://api.frankfurter.dev) — public, free, no API key.
// It serves the European Central Bank (ECB) daily reference rates, which are the
// official institutional reference rates for the eurozone, published every TARGET
// business day around 16:00 CET. This is the most reliable free source for an
// EUR-centric app.
//
// We cache responses in memory for 12h to avoid hammering the upstream API.

type RateBundle = {
  base: string;
  date: string; // ECB reference date, e.g. "2026-05-05"
  rates: Record<string, number>; // code -> units per 1 unit of base
  fetchedAt: number;
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const cache = new Map<string, RateBundle>();

const ENDPOINT = 'https://api.frankfurter.dev/v1/latest';

export async function getRates(base = 'EUR'): Promise<RateBundle> {
  const key = base.toUpperCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const url = `${ENDPOINT}?base=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'SplitWISER/1.0' },
  });

  if (!res.ok) {
    if (cached) return cached; // serve stale on upstream failure
    throw new Error(`FX upstream error: ${res.status}`);
  }

  const json = (await res.json()) as { base: string; date: string; rates: Record<string, number> };
  const bundle: RateBundle = {
    base: json.base,
    date: json.date,
    rates: { ...json.rates, [json.base]: 1 },
    fetchedAt: Date.now(),
  };
  cache.set(key, bundle);
  return bundle;
}

export async function convert(amount: number, from: string, to: string): Promise<number> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return amount;
  const bundle = await getRates(f);
  const rate = bundle.rates[t];
  if (!rate) throw new Error(`Unsupported target currency: ${t}`);
  return amount * rate;
}
