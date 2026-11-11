import { notFound } from "next/navigation";
import { MontageStudio } from "@/components/app/MontageStudio";
import type { MontageSpec } from "@/remotion/montage";

// Local design preview only — never served in production.
export default async function Page({ searchParams }: { searchParams: Promise<{ split?: string; dark?: string; layout?: string; cap?: string; tr?: string; board?: string; edu?: string }> }) {
  const sp = await searchParams;
  if (process.env.NODE_ENV === "production") notFound();
  const words: MontageSpec["words"] = [];
  let t = 0.3;
  for (const w of "اليوم بنحكي عن أهم سر بالتسويق وهو إنك تفهم عميلك قبل ما تبيعه أي شي وهذا اللي بيفرق بين المحل الناجح والعادي".split(" ")) { words.push({ t: w, s: +t.toFixed(2), e: +(t + 0.42).toFixed(2) }); t += w === "عميلك" ? 1.7 : 0.5; }
  const spec: MontageSpec = {
    src: "http://localhost:8765/src.mp4", srcPath: "x", srcW: 1280, srcH: 720, aspect: "9:16", font: "Cairo",
    colors: { text: "#FFFFFF", accent: "#C9A45C", bg: "#0B2A4A" }, captions: { on: true, style: (sp.cap as MontageSpec["captions"]["style"]) ?? "karaoke" },
    segments: [{ s: 6.2, e: 8.6 }, { s: 0.2, e: 5.8 }, { s: 7.2, e: 11.5 }], words,
    titles: [{ text: "أهم سر بالتسويق", at: 2.6, dur: 2.5, pos: "top" }], zooms: [{ at: 5.5, dur: 2, scale: 1.18 }],
    layout: (sp.layout as MontageSpec["layout"]) ?? (sp.split ? "split" : "full"), transition: (sp.tr as MontageSpec["transition"]) ?? "none", panel: sp.dark ? "dark" : "light",
    board: (sp.board as MontageSpec["board"]) ?? undefined,
    graphics: sp.edu ? [
      { kind: "definition", at: 0.2, dur: 1.4, text: "التمثيل الضوئي", sub: "طريقة النبات لصنع غذائه من الضوء", hl: "تعريف" },
      { kind: "quiz", at: 1.7, dur: 1.6, text: "وش يحتاج النبات؟", items: [{ label: "ضوء وماء" }, { label: "ملح" }, { label: "رمل" }], value: 1 },
      { kind: "truefalse", at: 3.4, dur: 1.2, text: "النبات ينام بالليل", value: 0, sub: "النبات يتنفس طول الوقت" },
      { kind: "timeline", at: 4.7, dur: 1.2, text: "مراحل النمو", items: [{ label: "بذرة" }, { label: "نبتة" }, { label: "شجرة" }] },
      { kind: "cycle", at: 6.0, dur: 1.2, text: "دورة الماء", items: [{ label: "تبخر", icon: "drop" }, { label: "تكاثف" }, { label: "مطر" }, { label: "جريان" }] },
      { kind: "mindmap", at: 7.3, dur: 1.0, text: "النبات", items: [{ label: "جذور" }, { label: "ساق" }, { label: "أوراق" }, { label: "أزهار" }] },
      { kind: "proscons", at: 8.4, dur: 0.9, items: [{ label: "سريع", value: 1 }, { label: "رخيص", value: 1 }, { label: "يحتاج ماء", value: 0 }] },
      { kind: "equation", at: 9.4, dur: 0.6, text: "6 × 7 = 42" },
      { kind: "fraction", at: 10.1, dur: 0.6, values: [3, 4], text: "ثلاثة أرباع" },
      { kind: "vocab", at: 10.8, dur: 0.5, text: "Plant", hl: "plænt", sub: "نبات", good: "The plant needs water." },
      { kind: "pyramid", at: 11.4, dur: 0.4, text: "الهرم الغذائي", items: [{ label: "حبوب" }, { label: "خضار" }, { label: "بروتين" }, { label: "حلويات" }] },
      { kind: "fillblank", at: 11.85, dur: 0.4, text: "النبات يحتاج ___ ليعيش", good: "الماء" },
    ] : [
      { kind: "timer", at: 0.2, dur: 2.2, text: "في أقل من دقيقة", hl: "دقيقة", sub: "هعرفك إزاي" },
      { kind: "flow", at: 2.6, dur: 1.4, text: "يمنتج لك أي فيديو", hl: "أي فيديو", items: [{ icon: "video", label: "فيديوك" }, { icon: "scissors", label: "مونتاج" }, { icon: "sparkle", label: "شاهين" }] },
      { kind: "counter", at: 4.2, dur: 1.5, value: 87, suffix: "٪", text: "من العملاء يرجعون" },
      { kind: "steps", at: 5.8, dur: 1.6, text: "ثلاث خطوات", items: [{ label: "افهم عميلك" }, { label: "قدّم قيمة" }, { label: "اطلب البيع" }] },
      { kind: "compare", at: 7.5, dur: 1.4, bad: "تبيع لكل الناس", good: "تبيع للعميل الصح" },
      { kind: "icon", at: 9.0, dur: 1.0, icon: "bulb", text: "فكرة ذكية", sub: "جرّبها اليوم" },
      { kind: "bars", at: 10.2, dur: 0.9, text: "المبيعات", suffix: "٪", items: [{ label: "قبل", value: 40 }, { label: "بعد", value: 95 }] },
      { kind: "donut", at: 11.2, dur: 0.6, value: 75, text: "من العملاء راضين" },
      { kind: "headline", at: 11.9, dur: 0.6, text: "السر هو الثقة", hl: "الثقة", fx: "circle" },
    ],
    intro: { on: false, title: "محل الديرة", subtitle: "نصيحة اليوم" }, outro: { on: true, title: "تابعنا للمزيد", subtitle: "@aldeira.kw" }, music: null,
  };
  return <main dir="rtl" className="mx-auto max-w-6xl p-4 sm:p-6"><MontageStudio jobId="demo" initial={spec} editCost={3} tracks={[]} /></main>;
}
