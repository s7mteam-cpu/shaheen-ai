import { notFound } from "next/navigation";
import { MontageStudio } from "@/components/app/MontageStudio";
import type { MontageSpec } from "@/remotion/montage";

// Local design preview only — never served in production.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  const words: MontageSpec["words"] = [];
  let t = 0.3;
  for (const w of "اليوم بنحكي عن أهم سر بالتسويق وهو إنك تفهم عميلك قبل ما تبيعه أي شي وهذا اللي بيفرق بين المحل الناجح والعادي".split(" ")) { words.push({ t: w, s: +t.toFixed(2), e: +(t + 0.42).toFixed(2) }); t += w === "عميلك" ? 1.7 : 0.5; }
  const spec: MontageSpec = {
    src: "http://localhost:8765/src.mp4", srcPath: "x", srcW: 1280, srcH: 720, aspect: "9:16", font: "Cairo",
    colors: { text: "#FFFFFF", accent: "#C9A45C", bg: "#0B2A4A" }, captions: { on: true, style: "karaoke" },
    segments: [{ s: 6.2, e: 8.6 }, { s: 0.2, e: 5.8 }, { s: 7.2, e: 11.5 }], words,
    titles: [{ text: "أهم سر بالتسويق", at: 2.6, dur: 2.5, pos: "top" }], zooms: [{ at: 5.5, dur: 2, scale: 1.18 }],
    intro: { on: true, title: "محل الديرة", subtitle: "نصيحة اليوم" }, outro: { on: true, title: "تابعنا للمزيد", subtitle: "@aldeira.kw" }, music: null,
  };
  return <main dir="rtl" className="mx-auto max-w-6xl p-4 sm:p-6"><MontageStudio jobId="demo" initial={spec} editCost={3} tracks={[]} /></main>;
}
