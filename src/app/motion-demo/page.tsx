import { notFound } from "next/navigation";
import { MotionStudio } from "@/components/app/MotionStudio";
import { SAMPLE } from "@/remotion/spec";

// Local design preview only — never served in production.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main dir="rtl" className="mx-auto max-w-6xl p-4 sm:p-6">
      <MotionStudio jobId="demo" initial={SAMPLE} editCost={5} demo voices={[{ id: "a", name: "صوت خليجي رجالي" }]}
        tracks={[{ name: "نشيط تجاري", mood: "energetic • pop corporate", url: "/x.mp3" }, { name: "سينمائي ملحمي", mood: "cinematic", url: "/y.mp3" }]} />
    </main>
  );
}
