"use client";
import { L } from "@/lib/i18n/ui";
import { voicesFor, type VoiceItem } from "@/lib/voiceMatch";

/** The voices that exist for the chosen dialect, by name. Nothing registered for it → a clear «قريبًا» note. */
export function VoicePick({ voices, dialect, value, onChange, auto = "تلقائي (الأنسب)" }: { voices: VoiceItem[]; dialect: string; value: string; onChange: (id: string) => void; auto?: string }) {
  if (!dialect) return null;
  const list = voicesFor(voices, dialect);
  if (!list.length) return <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{L("عذرًا، ما فيه أصوات متوفرة لهالهجة الحين. قريبًا بإذن الله ✨")}</p>;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[13px] font-semibold text-subtle">{L("الأصوات المتوفرة")}</legend>
      <div className="flex flex-wrap gap-2">
        {[{ id: "", name: L(auto), note: "" } as VoiceItem, ...list].map((v) => (
          <button key={v.id || "auto"} type="button" aria-pressed={value === v.id} onClick={() => onChange(v.id)}
            className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${value === v.id ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-navy-900 hover:border-gold-500"}`}>
            {v.name || L("صوت")}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
