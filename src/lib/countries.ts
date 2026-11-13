/**
 * Countries and currencies. Prices are set in Kuwaiti dinars (the base currency, and what Tap charges);
 * other currencies are shown as a rounded «≈» guide, converted through the US dollar using today's rates
 * (lib/server/rates.ts, refreshed daily) or the fallbacks below. Every visitor starts on Kuwait and the dinar.
 * Shared by server and browser code.
 */
export type CurrencyCode =
  | "KWD" | "SAR" | "AED" | "QAR" | "BHD" | "OMR"
  | "EGP" | "JOD" | "LBP" | "SYP" | "IQD" | "YER" | "SDG" | "LYD" | "TND" | "DZD" | "MAD" | "MRU" | "SOS" | "DJF" | "KMF"
  | "USD";
/** digits = accepted lengths of the local number (without 0 and without the country code). sample = an example local number. */
export type Country = { code: string; ar: string; en: string; flag: string; dial: string; currency: CurrencyCode; dialect: string; digits: number[]; sample: string };

/** The 22 Arab League countries: the Gulf first (Kuwait at the top), then the rest in Arabic alphabetical order. */
export const COUNTRIES: Country[] = [
  { code: "KW", ar: "الكويت", en: "Kuwait", flag: "🇰🇼", dial: "+965", currency: "KWD", dialect: "kuwaiti", digits: [8], sample: "50000000" },
  { code: "SA", ar: "السعودية", en: "Saudi Arabia", flag: "🇸🇦", dial: "+966", currency: "SAR", dialect: "saudi", digits: [9], sample: "500000000" },
  { code: "AE", ar: "الإمارات", en: "UAE", flag: "🇦🇪", dial: "+971", currency: "AED", dialect: "emirati", digits: [9], sample: "500000000" },
  { code: "QA", ar: "قطر", en: "Qatar", flag: "🇶🇦", dial: "+974", currency: "QAR", dialect: "qatari", digits: [8], sample: "33000000" },
  { code: "BH", ar: "البحرين", en: "Bahrain", flag: "🇧🇭", dial: "+973", currency: "BHD", dialect: "bahraini", digits: [8], sample: "33000000" },
  { code: "OM", ar: "عُمان", en: "Oman", flag: "🇴🇲", dial: "+968", currency: "OMR", dialect: "omani", digits: [8], sample: "90000000" },
  { code: "JO", ar: "الأردن", en: "Jordan", flag: "🇯🇴", dial: "+962", currency: "JOD", dialect: "levantine", digits: [9], sample: "790000000" },
  { code: "DZ", ar: "الجزائر", en: "Algeria", flag: "🇩🇿", dial: "+213", currency: "DZD", dialect: "maghrebi", digits: [9], sample: "550000000" },
  { code: "SD", ar: "السودان", en: "Sudan", flag: "🇸🇩", dial: "+249", currency: "SDG", dialect: "sudanese", digits: [9], sample: "910000000" },
  { code: "SO", ar: "الصومال", en: "Somalia", flag: "🇸🇴", dial: "+252", currency: "SOS", dialect: "msa", digits: [8, 9], sample: "610000000" },
  { code: "IQ", ar: "العراق", en: "Iraq", flag: "🇮🇶", dial: "+964", currency: "IQD", dialect: "iraqi", digits: [10], sample: "7700000000" },
  { code: "MA", ar: "المغرب", en: "Morocco", flag: "🇲🇦", dial: "+212", currency: "MAD", dialect: "maghrebi", digits: [9], sample: "600000000" },
  { code: "YE", ar: "اليمن", en: "Yemen", flag: "🇾🇪", dial: "+967", currency: "YER", dialect: "yemeni", digits: [9], sample: "770000000" },
  { code: "TN", ar: "تونس", en: "Tunisia", flag: "🇹🇳", dial: "+216", currency: "TND", dialect: "maghrebi", digits: [8], sample: "20000000" },
  { code: "KM", ar: "جزر القمر", en: "Comoros", flag: "🇰🇲", dial: "+269", currency: "KMF", dialect: "msa", digits: [7], sample: "3200000" },
  { code: "DJ", ar: "جيبوتي", en: "Djibouti", flag: "🇩🇯", dial: "+253", currency: "DJF", dialect: "msa", digits: [8], sample: "77000000" },
  { code: "SY", ar: "سوريا", en: "Syria", flag: "🇸🇾", dial: "+963", currency: "SYP", dialect: "levantine", digits: [9], sample: "930000000" },
  { code: "PS", ar: "فلسطين", en: "Palestine", flag: "🇵🇸", dial: "+970", currency: "JOD", dialect: "levantine", digits: [9], sample: "590000000" },
  { code: "LB", ar: "لبنان", en: "Lebanon", flag: "🇱🇧", dial: "+961", currency: "LBP", dialect: "levantine", digits: [7, 8], sample: "70000000" },
  { code: "LY", ar: "ليبيا", en: "Libya", flag: "🇱🇾", dial: "+218", currency: "LYD", dialect: "libyan", digits: [9], sample: "910000000" },
  { code: "EG", ar: "مصر", en: "Egypt", flag: "🇪🇬", dial: "+20", currency: "EGP", dialect: "egyptian", digits: [10], sample: "1000000000" },
  { code: "MR", ar: "موريتانيا", en: "Mauritania", flag: "🇲🇷", dial: "+222", currency: "MRU", dialect: "msa", digits: [8], sample: "22000000" },
];
export const OTHER_COUNTRY: Country = { code: "XX", ar: "دولة أخرى", en: "Other country", flag: "🌍", dial: "", currency: "USD", dialect: "msa", digits: [], sample: "" };

type CurrencyInfo = { ar: string; en: string; name: string; nameEn: string; perUsd: number; decimals: number; flag: string };
/**
 * perUsd = fallback units per one US dollar (used only if today's live rates can't be fetched).
 * Pegged currencies are exact; the others are from the UK government's official rates table, November 2026.
 */
export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  KWD: { ar: "د.ك", en: "KWD", name: "دينار كويتي", nameEn: "Kuwaiti dinar", perUsd: 0, decimals: 3, flag: "🇰🇼" },
  SAR: { ar: "ر.س", en: "SAR", name: "ريال سعودي", nameEn: "Saudi riyal", perUsd: 3.75, decimals: 0, flag: "🇸🇦" },
  AED: { ar: "د.إ", en: "AED", name: "درهم إماراتي", nameEn: "UAE dirham", perUsd: 3.6725, decimals: 0, flag: "🇦🇪" },
  QAR: { ar: "ر.ق", en: "QAR", name: "ريال قطري", nameEn: "Qatari riyal", perUsd: 3.64, decimals: 0, flag: "🇶🇦" },
  BHD: { ar: "د.ب", en: "BHD", name: "دينار بحريني", nameEn: "Bahraini dinar", perUsd: 0.376, decimals: 1, flag: "🇧🇭" },
  OMR: { ar: "ر.ع", en: "OMR", name: "ريال عُماني", nameEn: "Omani rial", perUsd: 0.3845, decimals: 1, flag: "🇴🇲" },
  JOD: { ar: "د.أ", en: "JOD", name: "دينار أردني", nameEn: "Jordanian dinar", perUsd: 0.709, decimals: 1, flag: "🇯🇴" },
  EGP: { ar: "ج.م", en: "EGP", name: "جنيه مصري", nameEn: "Egyptian pound", perUsd: 57, decimals: 0, flag: "🇪🇬" },
  IQD: { ar: "د.ع", en: "IQD", name: "دينار عراقي", nameEn: "Iraqi dinar", perUsd: 1310, decimals: 0, flag: "🇮🇶" },
  LBP: { ar: "ل.ل", en: "LBP", name: "ليرة لبنانية", nameEn: "Lebanese pound", perUsd: 89500, decimals: 0, flag: "🇱🇧" },
  SYP: { ar: "ل.س", en: "SYP", name: "ليرة سورية", nameEn: "Syrian pound", perUsd: 119, decimals: 0, flag: "🇸🇾" },
  YER: { ar: "ر.ي", en: "YER", name: "ريال يمني", nameEn: "Yemeni rial", perUsd: 237, decimals: 0, flag: "🇾🇪" },
  SDG: { ar: "ج.س", en: "SDG", name: "جنيه سوداني", nameEn: "Sudanese pound", perUsd: 4820, decimals: 0, flag: "🇸🇩" },
  LYD: { ar: "د.ل", en: "LYD", name: "دينار ليبي", nameEn: "Libyan dinar", perUsd: 6.4, decimals: 0, flag: "🇱🇾" },
  TND: { ar: "د.ت", en: "TND", name: "دينار تونسي", nameEn: "Tunisian dinar", perUsd: 2.99, decimals: 0, flag: "🇹🇳" },
  DZD: { ar: "د.ج", en: "DZD", name: "دينار جزائري", nameEn: "Algerian dinar", perUsd: 135, decimals: 0, flag: "🇩🇿" },
  MAD: { ar: "د.م", en: "MAD", name: "درهم مغربي", nameEn: "Moroccan dirham", perUsd: 9.78, decimals: 0, flag: "🇲🇦" },
  MRU: { ar: "أ.م", en: "MRU", name: "أوقية موريتانية", nameEn: "Mauritanian ouguiya", perUsd: 40.4, decimals: 0, flag: "🇲🇷" },
  SOS: { ar: "ش.ص", en: "SOS", name: "شلن صومالي", nameEn: "Somali shilling", perUsd: 568, decimals: 0, flag: "🇸🇴" },
  DJF: { ar: "ف.ج", en: "DJF", name: "فرنك جيبوتي", nameEn: "Djiboutian franc", perUsd: 177.72, decimals: 0, flag: "🇩🇯" },
  KMF: { ar: "ف.ق", en: "KMF", name: "فرنك قمري", nameEn: "Comorian franc", perUsd: 439, decimals: 0, flag: "🇰🇲" },
  USD: { ar: "$", en: "$", name: "دولار أمريكي", nameEn: "US dollar", perUsd: 1, decimals: 0, flag: "🌍" },
};
/** Header list order: the dinar first, the Gulf, then the rest as in COUNTRIES, then the dollar. */
export const CURRENCY_ORDER: CurrencyCode[] = [...new Set<CurrencyCode>([...COUNTRIES.map((c) => c.currency), "USD"])];
/** Today's rates (units per dollar), overriding the fallbacks above. KWD = dinars per dollar. */
export type Rates = Partial<Record<CurrencyCode, number>>;

export const COUNTRY_COOKIE = "sh_country";
export const CURRENCY_COOKIE = "sh_cur";

export const countryOf = (code?: string | null): Country => COUNTRIES.find((c) => c.code === (code ?? "").toUpperCase()) ?? OTHER_COUNTRY;
export const isCurrency = (c?: string | null): c is CurrencyCode => !!c && c in CURRENCIES;

/** Pleasant price: 488.6 → 489, 1,221 → 1,219, 49.04 → 49, 4.9 → 4.9, 11,661,234 → 11,700,000. */
function nice(v: number, decimals: number) {
  if (v >= 10000) { const m = 10 ** (Math.floor(Math.log10(v)) - 2); return Math.round(v / m) * m; }
  if (v >= 100) return Math.max(1, Math.round(v / 10) * 10 - 1);
  if (v >= 20 || decimals === 0) return Math.round(v);
  const f = 10 ** Math.max(1, decimals);
  return Math.round(v * f) / f;
}

/** A dinar amount in another currency (rounded nicely). usdKwd = dinars per one dollar (e.g. 0.307). */
export function convertKwd(kwd: number, to: CurrencyCode, usdKwd: number, rates: Rates = {}) {
  const per = rates[to] && rates[to]! > 0 ? rates[to]! : CURRENCIES[to].perUsd;
  if (to === "KWD" || !(usdKwd > 0) || !(per > 0)) return kwd;
  return nice((kwd / usdKwd) * per, CURRENCIES[to].decimals);
}

export function formatMoney(amount: number, cur: CurrencyCode, lang: "ar" | "en" = "ar") {
  const c = CURRENCIES[cur];
  const n = amount.toLocaleString("en", { maximumFractionDigits: cur === "KWD" ? 3 : c.decimals, minimumFractionDigits: 0 });
  return cur === "USD" ? `$${n}` : `${n} ${lang === "en" ? c.en : c.ar}`;
}

/** Normalises a WhatsApp number for a country: local digits get the country code, "00" becomes "+". */
export function normalizePhoneFor(raw: string, country?: string | null): string | null {
  const latin = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  let p = latin.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+")) {
    const c = countryOf(country);
    const local = p.replace(/^0+/, "");
    if (c.dial && c.digits.includes(local.length)) p = c.dial + local;
    else if (!country && local.length === 8) p = "+965" + local; // old behaviour: 8 digits = Kuwait
    else p = "+" + p;
  }
  return /^\+\d{8,15}$/.test(p) ? p : null;
}

/** Dialects offered in the design, motion and lesson tools (the same list as the post/ad tools). */
export const ARAB_DIALECTS: [string, string, string][] = [
  ["kuwaiti", "كويتية", "Kuwaiti"], ["saudi", "سعودية", "Saudi"], ["emirati", "إماراتية", "Emirati"], ["qatari", "قطرية", "Qatari"],
  ["bahraini", "بحرينية", "Bahraini"], ["omani", "عُمانية", "Omani"], ["gulf", "خليجية بيضاء", "White Gulf"],
  ["iraqi", "عراقية", "Iraqi"], ["levantine", "شامية", "Levantine"], ["egyptian", "مصرية", "Egyptian"], ["sudanese", "سودانية", "Sudanese"],
  ["yemeni", "يمنية", "Yemeni"], ["libyan", "ليبية", "Libyan"], ["maghrebi", "مغاربية", "Maghrebi"], ["msa", "فصحى", "Standard Arabic"],
];
/** @deprecated old name */
export const GULF_DIALECTS = ARAB_DIALECTS;
/** In the browser: the dialect of the customer's country (the country cookie is set from their account), or Kuwaiti. */
export function myDialect(): string {
  if (typeof document === "undefined") return "kuwaiti";
  const m = document.cookie.match(new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([A-Z]{2})`));
  const c = countryOf(m?.[1]);
  return c.code === "XX" ? "msa" : c.dialect;
}
