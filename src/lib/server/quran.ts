import "server-only";
import { plain } from "@/remotion/quran";

/** Ayat [from..to] of a surah: Uthmani text (+ English Sahih International). The basmala printed at the start of ayah 1 is removed (it has its own line). */
export async function fetchVerses(surah: number, from: number, to: number, en: boolean) {
  const eds = en ? "quran-uthmani,en.sahih" : "quran-uthmani";
  const r = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/editions/${eds}?offset=${from - 1}&limit=${to - from + 1}`, { next: { revalidate: 60 * 60 * 24 * 30 } });
  if (!r.ok) throw new Error(`quran api ${r.status}`);
  const d = (await r.json()) as { data: { ayahs: { numberInSurah: number; text: string }[] }[] };
  const ar = d.data[0]?.ayahs ?? [], tr = d.data[1]?.ayahs ?? [];
  return ar.map((a, i) => {
    let text = a.text.trim();
    if (surah !== 1 && surah !== 9 && a.numberInSurah === 1) {
      const w = text.split(/\s+/);
      if (plain(w[0] ?? "") === "بسم" && plain(w[1] ?? "").includes("لله")) text = w.slice(4).join(" ");
    }
    return { n: a.numberInSurah, text, en: tr[i]?.text };
  });
}

