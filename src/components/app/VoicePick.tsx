"use client";
import { L } from "@/lib/i18n/ui";
import type { VoiceItem } from "@/lib/voiceMatch";

/** Every voice we have registered, by name: the customer just taps one (or leaves «تلقائي»). No gender / age / dialect filters. */
export function VoicePick({ voices, value, onChange, auto = "تلقائي (الأنسب)" }: { voices: VoiceItem[]; dialect?: string; value: string; onChange: (id: string) => void; auto?: string }) {
  const list = voices;
  if (!list.length) return null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[13px] font-semibold text-subtle">{L("🎙 الأصوات المتوفرة")}</legend>
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
