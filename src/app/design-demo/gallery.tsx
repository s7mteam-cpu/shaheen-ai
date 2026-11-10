"use client";
import "@fontsource/cairo/900.css";
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-800.css";
import { useEffect, useState } from "react";
import { DesignView } from "@/components/app/DesignView";
import { DesignStudio } from "@/components/app/DesignStudio";
import { DesignStart } from "@/components/app/DesignStart";
import { LogoCropper } from "@/components/app/LogoCropper";
import { compressVideo } from "@/lib/compressVideo";
import { SAMPLE_ADS, SAMPLE_CAROUSEL, SAMPLE_POST } from "@/design/samples";
import { LAYOUT_IDS, type DesignSpec } from "@/design/spec";

export function DesignGallery() {
  const [m, setM] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [out, setOut] = useState("");
  useEffect(() => { if (new URLSearchParams(location.search).get("crop")) fetch("/dev-sample.jpg").then((r) => r.blob()).then((b) => setFile(new File([b], "x.jpg", { type: "image/jpeg" }))); }, []);
  useEffect(() => setM(true), []);
  if (!m) return null;
  if (new URLSearchParams(location.search).get("squeeze")) return <button id="go" onClick={async () => { const b = await (await fetch("/dev-4k.mp4")).blob(); const t = Date.now(); const f = await compressVideo(new File([b], "x.mp4", { type: "video/mp4" }), (p) => { document.title = String(p); }); setOut(`${b.size} -> ${f.size} in ${Date.now() - t}ms`); }}>go {out}</button>;
  if (new URLSearchParams(location.search).get("crop")) return <div>{file && <LogoCropper file={file} onCancel={() => {}} onDone={(f) => setOut(URL.createObjectURL(f))} />}{out && <img id="out" src={out} alt="" />}</div>;
  if (new URLSearchParams(location.search).get("start")) return <DesignStart toolId="post" cost={3} balance={100} />;
  if (new URLSearchParams(location.search).get("studio")) return <DesignStudio jobId="demo" toolId="carousel" initial={{ ...SAMPLE_CAROUSEL, brand: { ...SAMPLE_CAROUSEL.brand, logo: { path: "x", bucket: "uploads", url: "/dev-sample.jpg" }, box: { x: 0.85, y: 0.09, w: 0.18 } } }} editCost={2} demo kit={{ colors: ["#0B2A4A", "#C9A45C", "#FFFFFF"], font: "Cairo", handle: "@shaheen", name: "شاهين", logo: null }} />;
  const aspect = (typeof location !== "undefined" && new URLSearchParams(location.search).get("a")) || "4:5";
  const post = (layout: string): DesignSpec => ({ ...SAMPLE_POST, aspect: aspect as DesignSpec["aspect"], slides: [{ ...SAMPLE_POST.slides[0], layout: layout as never, photo: ["photo","split","bento","offer"].includes(layout) ? { path: "x", bucket: "uploads", url: "/dev-sample.jpg" } : null }] });
  const sets = [...LAYOUT_IDS.map(post), { ...SAMPLE_CAROUSEL, aspect }, { ...SAMPLE_ADS, aspect }] as DesignSpec[];
  return (
    <div className="grid grid-cols-4 gap-4">
      {sets.flatMap((s, si) => s.slides.map((_, i) => <div key={`${si}-${i}`} data-shot className="w-full"><DesignView spec={s} index={i} /></div>))}
    </div>
  );
}
