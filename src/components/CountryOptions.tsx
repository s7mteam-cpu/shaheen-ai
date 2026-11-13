import { COUNTRIES, OTHER_COUNTRY } from "@/lib/countries";

/** <option>s for a country <select>: the Gulf, then the other Arab countries, then «دولة أخرى». Kuwait is first. */
export function CountryOptions({ lang }: { lang: "ar" | "en" }) {
  const name = (x: { ar: string; en: string }) => (lang === "en" ? x.en : x.ar);
  const opt = (x: (typeof COUNTRIES)[number]) => <option key={x.code} value={x.code}>{x.flag} {name(x)}</option>;
  return (
    <>
      <optgroup label={lang === "en" ? "Gulf countries" : "دول الخليج"}>{COUNTRIES.slice(0, 6).map(opt)}</optgroup>
      <optgroup label={lang === "en" ? "Other Arab countries" : "الدول العربية"}>{COUNTRIES.slice(6).map(opt)}</optgroup>
      <option value="XX">{OTHER_COUNTRY.flag} {name(OTHER_COUNTRY)}</option>
    </>
  );
}
