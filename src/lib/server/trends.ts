import { createAdminClient } from "@/lib/supabase/admin";
import { cachedSystem } from "@/lib/providers/text";
import { INDUSTRIES } from "@/design/industries";

export type Scope = "all" | "post" | "ads" | "carousel" | "motion" | "montage" | "lesson";
export const SCOPES: [Scope, string][] = [["all", "الكل"], ["post", "البوستات"], ["carousel", "الكاروسيل"], ["ads", "الإعلانات"], ["motion", "الموشن جرافيك"], ["montage", "المونتاج"], ["lesson", "الفيديو التعليمي"]];
export const GROUPS = [...new Set(INDUSTRIES.map((i) => i.group))];
const DROP_DAYS = 90;               // …and is ignored after three

/** Approved, still-fresh trends for one job, as one block for the AI's instructions. */
export async function trendsFor(industry: string | undefined, scope: Scope) {
  try {
    const ind = INDUSTRIES.find((i) => i.id === industry);
    const keys = ["all", ...(ind ? [ind.id, ind.group] : [])];
    const since = new Date(Date.now() - DROP_DAYS * 864e5).toISOString();
    const { data } = await createAdminClient().from("trends").select("title,instruction,scope,industry,approved_at")
      .eq("status", "approved").in("industry", keys).in("scope", ["all", scope]).gte("approved_at", since)
      .order("approved_at", { ascending: false }).limit(12);
    if (!data?.length) return "";
    return `أحدث الترندات المعتمدة (طبّقها إذا تناسب طلب العميل، وطلب العميل وهويته أهم):\n${data.map((t) => `- ${t.title}: ${t.instruction}`).join("\n")}`;
  } catch { return ""; }
}

type Found = { title?: string; insight?: string; instruction?: string; scope?: string; industry?: string; sources?: { title?: string; url?: string }[] };

/** Weekly research for one group of fields: Claude searches the web for what performs best now. */
export async function researchGroup(group: string) {
  const fields = INDUSTRIES.filter((i) => i.group === group);
  const system = `أنت باحث ترندات تسويق ومحتوى خليجي. تبحث بالإنترنت عن أقوى المحتوى انتشاراً وأداءً هالفترة (البوستات، الإعلانات، الكاروسيل، الموشن جرافيك، المونتاج والريلز) لمجالات: ${fields.map((f) => `${f.id} (${f.label})`).join("، ")}.
المصادر الأهم: TikTok Creative Center (Top Ads والترندات، الكويت والخليج)، Meta Ad Library، تقارير ترندات Canva وAdobe وFigma، مواقع التسويق والتصميم المعروفة، وأي تحليل لإعلانات خليجية ناجحة.
استخرج الأنماط اللي تتكرر عند الأقوى أداءً (الهوك، الطول، ترتيب المشاهد، الألوان، الخطوط، أسلوب النص، الترجمة، الملصقات، التخطيط) — لا تنسخ تصميم أو نص أحد، فقط الأسلوب.
ركّز على اللي يناسب السوق الخليجي والكويتي. لا تخترع أرقام ولا مصادر: كل اقتراح لازم له مصدر حقيقي فتحته.
أعد JSON فقط: [{"title": "عنوان قصير", "insight": "وش لاحظت ولماذا ينجح (جملتين)", "instruction": "تعليمات عملية مباشرة للمصمم الآلي (جملة أو جملتين)", "scope": "all|post|ads|carousel|motion|montage|lesson", "industry": "id المجال أو ${group}", "sources": [{"title": "...", "url": "https://..."}]}] — من 3 إلى 6 اقتراحات.`;
  const ask = `ابحث الحين (${new Date().toISOString().slice(0, 10)}) عن أحدث وأقوى المحتوى لمجالات «${group}» وأعد الاقتراحات.`;
  // Works with whichever AI the site has: Claude (web search) or Gemini (Google Search). Nothing here is tied to one provider.
  // Cheapest first: Gemini (Google Search has a free daily allowance), then Claude's small model.
  // Set TRENDS_PROVIDER=claude in Vercel to always use Claude.
  let text: string;
  const geminiFirst = !!process.env.GEMINI_API_KEY && process.env.TRENDS_PROVIDER !== "claude";
  try { text = geminiFirst ? await viaGemini(system, ask) : await viaClaude(system, ask); }
  catch (e) {
    const other = geminiFirst ? !!process.env.ANTHROPIC_API_KEY : !!process.env.GEMINI_API_KEY;
    if (!other) throw e;
    console.error("trends: first provider failed, trying the other", e);
    text = geminiFirst ? await viaClaude(system, ask) : await viaGemini(system, ask);
  }
  const a = text.indexOf("["), b = text.lastIndexOf("]");
  const list = (a >= 0 && b > a ? JSON.parse(text.slice(a, b + 1)) : []) as Found[];
  return save(list, "research", group);
}

async function viaClaude(system: string, ask: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.TRENDS_MODEL || "claude-haiku-5-5", max_tokens: 4000, system: cachedSystem(system),
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
      messages: [{ role: "user", content: ask }],
    }),
  });
  if (!res.ok) throw new Error(`trends research (claude) ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = (await res.json()) as { content: { type: string; text?: string }[] };
  return d.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
}

async function viaGemini(system: string, ask: string) {
  if (!process.env.GEMINI_API_KEY) throw new Error("no AI key for trends (ANTHROPIC_API_KEY or GEMINI_API_KEY)");
  const model = process.env.TRENDS_GEMINI_MODEL || "gemini-3.8-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: ask }] }], tools: [{ google_search: {} }] }),
  });
  if (!res.ok) throw new Error(`trends research (gemini) ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

async function save(list: Found[], origin: "research" | "customers", fallback: string) {
  const ok = new Set(["all", ...GROUPS, ...INDUSTRIES.map((i) => i.id)]);
  const scopes = SCOPES.map((s) => s[0]) as string[];
  const rows = list.filter((t) => t.title && t.instruction).slice(0, 8).map((t) => ({
    origin, title: String(t.title).slice(0, 120), insight: String(t.insight ?? "").slice(0, 600), instruction: String(t.instruction).slice(0, 500),
    scope: scopes.includes(String(t.scope)) ? t.scope : "all", industry: ok.has(String(t.industry)) ? t.industry : fallback,
    sources: (t.sources ?? []).filter((s) => /^https?:\/\//.test(String(s?.url))).slice(0, 5).map((s) => ({ title: String(s.title ?? s.url).slice(0, 120), url: String(s.url).slice(0, 400) })),
  }));
  if (origin === "research") for (const r of rows) if (!r.sources.length) r.insight = `${r.insight} (بدون مصدر — راجعه بحذر)`;
  if (rows.length) await createAdminClient().from("trends").insert(rows);
  return rows.length;
}

/** What customers actually keep: compare the AI's first design with what they exported. */
export async function learnFromCustomers() {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  const { data } = await admin.from("jobs").select("tool_id, first:input->first, spec:input->spec").in("tool_id", ["post", "carousel", "ad-design", "motion-video", "video-editing", "lesson-video"]).eq("status", "done").gte("created_at", since).limit(2000);
  type Snap = Record<string, unknown> & { industry?: string };
  const stats: Record<string, { n: number; changed: Record<string, number>; finals: Record<string, Record<string, number>> }> = {};
  const keys = ["deco", "frame", "font", "sticker", "layout", "captions", "transition", "grade", "board", "kinds"];
  for (const j of (data ?? []) as { tool_id: string; first: Snap | null; spec: Record<string, unknown> | null }[]) {
    if (!j.first || !j.spec) continue;
    const fin = snapshot(j.spec);
    const ind = String(j.first.industry ?? fin.industry ?? "");
    if (!ind) continue;
    const k = `${ind}|${j.tool_id}`;
    const st = (stats[k] ??= { n: 0, changed: {}, finals: {} });
    st.n++;
    for (const key of keys) {
      if (j.first[key] === undefined && fin[key] === undefined) continue;
      if (JSON.stringify(j.first[key]) !== JSON.stringify(fin[key])) st.changed[key] = (st.changed[key] ?? 0) + 1;
      const v = String(fin[key] ?? "");
      (st.finals[key] ??= {})[v] = (st.finals[key][v] ?? 0) + 1;
    }
  }
  const lines = Object.entries(stats).filter(([, s]) => s.n >= 5).map(([k, s]) => {
    const [ind, tool] = k.split("|");
    const ch = Object.entries(s.changed).map(([key, c]) => `${key} غيّروه ${Math.round((c / s.n) * 100)}%`).join("، ");
    const fav = Object.entries(s.finals).map(([key, m]) => { const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return top && top[0] ? `${key} الأكثر: ${top[0]} (${Math.round((top[1] / s.n) * 100)}%)` : ""; }).filter(Boolean).join("، ");
    return `${ind} / ${tool} (${s.n} عمل): ${ch || "ما غيّروا شي تقريباً"}. النهائي: ${fav}`;
  });
  if (!lines.length) return 0;
  const { aiJson } = await import("@/lib/providers/text");
  const list = await aiJson<Found[]>(
    `أنت محلل منتج. هذي إحصائيات وش يغيّر عملاء منصة تصميم خليجية بعد ما يطلع لهم التصميم الآلي، ووش يختارون بالنهاية. استخرج من 2 إلى 6 اقتراحات تحسّن الاختيارات الأولى للذكاء الاصطناعي لكل مجال (مثلاً: عملاء العطور يغيّرون الإطار للذهبي 70% → ابدأ بالذهبي). اذكر النسبة بالعنوان. أعد JSON: [{"title","insight","instruction","scope":"all|post|ads|carousel|motion|montage|lesson","industry":"id المجال"}].`,
    lines.join("\n").slice(0, 8000), 3000); // the site's own text AI (Claude or Gemini, as set in the admin)
  return save(list, "customers", "all");
}

/** The look the AI chose (first) or the customer kept (final): only the choices worth comparing. */
export function snapshot(spec: Record<string, unknown>) {
  const s = spec as { deco?: string; frame?: string; font?: string; industry?: string; domain?: string; slides?: { layout?: string; sticker?: { kind?: string } | null }[]; layout?: string; captions?: { style?: string }; transition?: string; grade?: string; board?: string; graphics?: { kind: string }[] };
  return {
    industry: s.industry ?? s.domain,
    deco: s.deco, frame: s.frame, font: s.font,
    sticker: s.slides?.map((x) => x.sticker?.kind ?? "").join(",") || undefined,
    layout: s.slides ? s.slides.map((x) => x.layout).join(",") : s.layout,
    captions: s.captions?.style, transition: s.transition, grade: s.grade, board: s.board,
    kinds: s.graphics?.map((g) => g.kind).sort().join(",") || undefined,
  } as Record<string, unknown> & { industry?: string };
}
