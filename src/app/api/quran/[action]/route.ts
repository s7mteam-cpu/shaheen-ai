import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { saveResult, signedResultUrls } from "@/lib/providers/storage";
import { BASMALA, DEFAULT_RECITERS, MAX_AYAT, Q_FONTS, Q_STYLES, SURAHS, ayahAudio, type QAyah, type QuranSpec, type Reciter } from "@/remotion/quran";
import { fetchVerses } from "@/lib/server/quran";

/**
 * «فيديو قرآني»
 *  verses  → the exact Uthmani text (api.alquran.cloud, Tanzil text) — the text is never typed by the customer or the AI
 *  bg      → calm background videos (Pixabay, free for commercial use)
 *  bgadd   → keep our own copy of the chosen background
 *  export  → charge credits and queue the render (the worker re-reads the text and measures the audio itself)
 */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);

async function reciters(): Promise<Reciter[]> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "quran_reciters").maybeSingle();
  const items = (data?.value as { items?: Reciter[] } | null)?.items;
  return Array.isArray(items) && items.length ? items.filter((r) => r?.id && r?.folder && /^[\w.-]+$/.test(r.folder)) : DEFAULT_RECITERS;
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const admin = createAdminClient();

  if (action === "verses") {
    const surah = clamp(Math.round(Number(body.surah) || 1), 1, 114);
    const count = SURAHS[surah - 1][1];
    const from = clamp(Math.round(Number(body.from) || 1), 1, count);
    const to = clamp(Math.round(Number(body.to) || from), from, Math.min(count, from + MAX_AYAT - 1));
    const list = await reciters();
    const rec = list.find((r) => r.id === body.reciter) ?? list[0];
    try {
      const v = await fetchVerses(surah, from, to, true);
      const basmala = body.basmala !== false && surah !== 1 && surah !== 9 && from === 1;
      const ayahs = [
        ...(basmala ? [{ n: 0, text: BASMALA, audio: ayahAudio(rec.folder, 1, 1) }] : []),
        ...v.map((a) => ({ ...a, audio: ayahAudio(rec.folder, surah, a.n) })),
      ];
      return NextResponse.json({ surah, from, to, reciter: rec, ayahs, reciters: list });
    } catch (e) {
      console.error("quran verses", e);
      return NextResponse.json({ error: "تعذّر جلب الآيات الحين، حاول بعد شوي." }, { status: 502 });
    }
  }

  if (action === "bg") {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) return NextResponse.json({ error: "مكتبة الخلفيات مو مفعّلة بعد (تحتاج مفتاح Pixabay)." }, { status: 503 });
    const q = String(body.q ?? "ocean waves").slice(0, 80);
    // calm nature only — no people
    const r = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&video_type=film&safesearch=true&per_page=18`, { next: { revalidate: 86400 } });
    if (!r.ok) return NextResponse.json({ error: "تعذّر البحث، حاول بعد شوي." }, { status: 502 });
    type V = { url: string; width: number; height: number; size: number; thumbnail?: string };
    const d = (await r.json()) as { hits?: { id: number; tags?: string; user: string; duration: number; videos: { large?: V; medium?: V; small?: V; tiny?: V } }[] };
    const hits = (d.hits ?? []).filter((h) => !/\b(people|person|man|woman|girl|boy|child|dance|party|bikini|beach girl|model)\b/i.test(h.tags ?? ""));
    return NextResponse.json({
      videos: hits.map((h) => {
        const big = h.videos.large?.url && (h.videos.large.size ?? 0) < 45 * 1024 * 1024 ? h.videos.large : h.videos.medium ?? h.videos.small;
        return { id: h.id, thumb: h.videos.medium?.thumbnail ?? h.videos.small?.thumbnail ?? h.videos.tiny?.thumbnail ?? "", preview: h.videos.tiny?.url ?? h.videos.small?.url ?? "", full: big?.url ?? "", by: h.user, secs: h.duration };
      }).filter((v) => v.full),
    });
  }

  if (action === "bgadd") {
    const url = String(body.url ?? "");
    let host = "";
    try { host = new URL(url).hostname; } catch { /* invalid */ }
    if (!["cdn.pixabay.com", "pixabay.com"].includes(host)) return NextResponse.json({ error: "الخلفية مو من المكتبة." }, { status: 400 });
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "تعذّر تحميل الخلفية." }, { status: 502 });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 48 * 1024 * 1024) return NextResponse.json({ error: "الخلفية كبيرة، اختر غيرها." }, { status: 400 });
    const path = await saveResult(user.id, "quran", buf, "video/mp4", "mp4");
    const [signed] = await signedResultUrls([path], 60 * 60 * 6);
    return NextResponse.json({ path, url: signed });
  }

  if (action === "export") {
    const s = (body.spec ?? {}) as Partial<QuranSpec>;
    const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", "quran-video").single();
    if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
    const surah = clamp(Math.round(Number(s.surah) || 1), 1, 114);
    const count = SURAHS[surah - 1][1];
    const from = clamp(Math.round(Number(s.from) || 1), 1, count);
    const to = clamp(Math.round(Number(s.to) || from), from, Math.min(count, from + MAX_AYAT - 1));
    const list = await reciters();
    const rec = list.find((r) => r.id === s.reciter) ?? list[0];
    const durs = new Map((Array.isArray(s.ayahs) ? s.ayahs : []).map((a: Partial<QAyah>) => [Number(a.n), clamp(Number(a.dur) || 8, 1, 90)]));
    let verses;
    try { verses = await fetchVerses(surah, from, to, true); } catch { return NextResponse.json({ error: "تعذّر جلب الآيات الحين، حاول بعد شوي." }, { status: 502 }); }
    const basmala = (s.ayahs ?? []).some((a) => a.n === 0) && surah !== 1 && surah !== 9 && from === 1;
    const ayahs: QAyah[] = [
      ...(basmala ? [{ n: 0, text: BASMALA, audio: ayahAudio(rec.folder, 1, 1), dur: durs.get(0) ?? 6 }] : []),
      ...verses.map((a) => ({ ...a, audio: ayahAudio(rec.folder, surah, a.n), dur: durs.get(a.n) ?? 8 })),
    ];
    // background: our copy (results) or the customer's own upload
    const bgIn = s.bg;
    const bg = bgIn?.path && String(bgIn.path).startsWith(`${user.id}/`) && !String(bgIn.path).includes("..")
      ? { kind: bgIn.kind === "image" ? "image" as const : "video" as const, url: "", path: String(bgIn.path), bucket: bgIn.bucket === "uploads" ? "uploads" as const : "results" as const }
      : null;
    const gap = clamp(Number(s.gap) || 0.4, 0, 2);
    const spec: QuranSpec = {
      aspect: s.aspect === "16:9" || s.aspect === "1:1" ? s.aspect : "9:16",
      surah, from, to, reciter: rec.id, reciterName: rec.name, folder: rec.folder, ayahs, bg,
      dim: clamp(Number(s.dim) || 0.35, 0, 0.8),
      style: Q_STYLES.some((x) => x[0] === s.style) ? s.style! : "classic",
      font: Q_FONTS.some((x) => x[0] === s.font) ? s.font! : "Amiri Quran",
      textColor: hex(s.textColor, "#FFFFFF"), accent: hex(s.accent, "#C9A45C"),
      showSurah: s.showSurah !== false, showNumbers: s.showNumbers !== false, showTranslation: !!s.showTranslation, showReciter: s.showReciter !== false,
      gap, quality: s.quality === "4k" ? "4k" : "1080",
    };
    const seconds = ayahs.reduce((a, x) => a + x.dur + gap, 0) + 2.6;
    const cost = Math.max(1, Math.ceil(seconds / 30)) * Math.max(0, tool.credit_cost);
    const name = SURAHS[surah - 1][0];
    const { data: job, error } = await admin.from("jobs")
      .insert({ user_id: user.id, tool_id: "quran-video", title: `سورة ${name} (${from}${to > from ? `-${to}` : ""}) — ${rec.name}`.slice(0, 80), status: "queued", progress: 0, input: { spec, render: true } })
      .select("id").single();
    if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
    if (cost > 0) {
      const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
      if (payErr) {
        await admin.from("jobs").delete().eq("id", job.id);
        return NextResponse.json({ error: payErr.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 });
      }
    }
    return NextResponse.json({ jobId: job.id, cost });
  }

  return NextResponse.json({ error: "طلب غير معروف." }, { status: 400 });
}
