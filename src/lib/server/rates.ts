import "server-only";
import { CURRENCIES, type CurrencyCode, type Rates } from "@/lib/countries";

/**
 * Today's exchange rates (units per US dollar) from ExchangeRate-API's free open endpoint, cached by Next for
 * 12 hours. If it's down or slow, the built-in rates in lib/countries.ts are used — prices never break.
 * Rates By Exchange Rate API: https://www.exchangerate-api.com
 */
let failedAt = 0; // after a failure, don't wait on the rates service again for 10 minutes

export async function liveRates(): Promise<{ rates: Rates; at: string | null }> {
  if (Date.now() - failedAt < 10 * 60 * 1000) return { rates: {}, at: null };
  const fail = () => { failedAt = Date.now(); return { rates: {} as Rates, at: null }; };
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 43200 }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return fail();
    const j = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
    if (j.result !== "success" || !j.rates) return fail();
    const rates: Rates = {};
    for (const code of Object.keys(CURRENCIES) as CurrencyCode[]) {
      const v = Number(j.rates[code]);
      if (Number.isFinite(v) && v > 0) rates[code] = v;
    }
    // sanity: the dinar must be near its peg basket (0.25–0.40 per dollar), else ignore everything
    if (!(rates.KWD && rates.KWD > 0.25 && rates.KWD < 0.4)) return fail();
    return { rates, at: j.time_last_update_utc ?? null };
  } catch {
    return fail();
  }
}
