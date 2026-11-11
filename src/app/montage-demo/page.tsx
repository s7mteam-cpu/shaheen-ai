import { notFound } from "next/navigation";
import { MontageStudio } from "@/components/app/MontageStudio";
import type { MontageSpec } from "@/remotion/montage";

// Local design preview only — never served in production.
export default async function Page({ searchParams }: { searchParams: Promise<{ split?: string; dark?: string; layout?: string; cap?: string; tr?: string }> }) {
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
    graphics: [
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
