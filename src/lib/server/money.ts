import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { CURRENCIES, CURRENCY_COOKIE, COUNTRY_COOKIE, convertKwd, countryOf, formatMoney, isCurrency, type CurrencyCode } from "@/lib/countries";
import { financeSettings } from "@/lib/server/finance";
import { getLang } from "@/lib/server/lang";
import { liveRates } from "@/lib/server/rates";

/**
 * Prices on the site: the currency the visitor chose from the header, else the Kuwaiti dinar (everyone starts on it).
 * money(40) → { main: "≈ 489 ر.س", kwd: "40 د.ك", approx: true }. What Tap charges is always the dinar amount.
 */
export const getMoney = cache(async () => {
  const jar = await cookies();
  const chosen = jar.get(CURRENCY_COOKIE)?.value;
  const cur: CurrencyCode = isCurrency(chosen) ? chosen : "KWD";
  const lang = await getLang();
  const live = cur === "KWD" ? { rates: {}, at: null } : await liveRates();
  const { usd_kwd } = await financeSettings().catch(() => ({ usd_kwd: 0.307 }));
  const rate = live.rates.KWD ?? usd_kwd;
  const money = (kwd: number) => {
    const approx = cur !== "KWD";
    const value = convertKwd(Number(kwd) || 0, cur, rate, live.rates);
    const number = value.toLocaleString("en", { maximumFractionDigits: cur === "KWD" ? 3 : CURRENCIES[cur].decimals });
    const symbol = cur === "USD" ? "$" : lang === "en" ? CURRENCIES[cur].en : CURRENCIES[cur].ar;
    return { approx, value, cur, number, symbol, main: `${approx ? "≈ " : ""}${formatMoney(value, cur, lang)}`, kwd: formatMoney(Number(kwd) || 0, "KWD", lang) };
  };
  return { cur, lang, rate, ratesAt: live.at, money, country: countryOf(jar.get(COUNTRY_COOKIE)?.value ?? "KW") };
});
