import { voiceGender } from "@/lib/voiceGender";
import type { VoiceSettings } from "@/lib/providers/elevenlabs";

/** A narrator voice as the admin registers it (site content → voices). Everything except id/name is optional. */
export type VoiceItem = {
  id: string; name?: string; note?: string; model?: string; settings?: VoiceSettings;
  gender?: string;            // "m" | "f"
  age?: string;               // "young" | "adult" | "senior"
  dialects?: string[];        // dialect ids it speaks well (kuwaiti, saudi, egyptian…), "any" = fine for all
};
export const VOICE_AGES: [string, string][] = [["young", "شاب / شابة"], ["adult", "عمر متوسط"], ["senior", "كبير بالعمر"]];
export const TONES: [string, string][] = [["auto", "تلقائي حسب الفيديو"], ["calm", "هادي"], ["energetic", "متحمس"], ["happy", "مبسوط"], ["confident", "واثق"], ["formal", "رسمي"], ["warm", "ودود"]];

/** One list for the customer: gender and age together. */
export const VOICE_TYPES: [string, string, string?, string?][] = [["auto", "تلقائي"], ["man", "رجل", "m", "adult"], ["woman", "امرأة", "f", "adult"], ["young_m", "شاب", "m", "young"], ["young_f", "شابة", "f", "young"], ["senior_m", "رجل كبير بالسن", "m", "senior"], ["senior_f", "امرأة كبيرة بالسن", "f", "senior"]];
export const typeToGA = (t?: string) => { const r = VOICE_TYPES.find((x) => x[0] === t); return { gender: r?.[2] ?? "", age: r?.[3] ?? "" }; };

const ageOf = (v: VoiceItem) => (["young", "adult", "senior"].includes(v.age ?? "") ? v.age : /(شاب|شابة|young)/i.test(`${v.name} ${v.note}`) ? "young" : /(كبير|مسن|senior|old)/i.test(`${v.name} ${v.note}`) ? "senior" : undefined);
const speaks = (v: VoiceItem, d: string) => !v.dialects?.length ? undefined : v.dialects.includes(d) ? "yes" : v.dialects.includes("any") || (v.dialects.includes("gulf") && ["kuwaiti", "saudi", "emirati", "qatari", "bahraini", "omani"].includes(d)) ? "ok" : "no";

/** Best voice for what the customer asked: dialect first, then gender, then age. Returns undefined when nothing was registered. */
export function pickVoice(voices: VoiceItem[], want: { dialect?: string; gender?: string; age?: string }): VoiceItem | undefined {
  if (!voices.length) return undefined;
  const score = (v: VoiceItem) => {
    let s = 0;
    const sp = want.dialect ? speaks(v, want.dialect) : undefined;
    if (sp === "yes") s += 8; else if (sp === "ok") s += 4; else if (sp === "no") s -= 6;
    const g = voiceGender(v);
    if (want.gender === "m" || want.gender === "f") s += g === want.gender ? 6 : g ? -8 : 0;
    if (want.age && want.age !== "any") s += ageOf(v) === want.age ? 3 : 0;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

/** Tone of the narration. «auto» reads it from the kind of video: ads are lively, explainers and health are calm. */
export function toneFor(tone: string | undefined, goal: "ad" | "edu", group?: string): "calm" | "energetic" | "happy" | "confident" | "formal" | "warm" {
  if (tone === "calm" || tone === "energetic" || tone === "happy" || tone === "confident" || tone === "formal" || tone === "warm") return tone;
  if (group === "صحة ورياضة" && goal === "edu") return "calm";
  if (group === "خدمات" && goal === "edu") return "formal";
  return goal === "edu" ? "calm" : group === "جمال وأزياء" || group === "أكل وشرب" ? "warm" : "energetic";
}
export const TONE_HINT: Record<string, string> = {
  calm: "نبرة هادئة وواضحة ومطمئنة، جمل مرتبة وبدون مبالغة",
  energetic: "نبرة متحمسة وحيوية وسريعة، جمل قصيرة وحماس واضح",
  happy: "نبرة مبسوطة ومشرقة وإيجابية، فيها ابتسامة",
  confident: "نبرة واثقة وثابتة ومقنعة، جمل حاسمة",
  formal: "نبرة رسمية ومهنية محترمة",
  warm: "نبرة ودودة ودافئة كأنك تكلم صديق",
};
const TONE_SET: Record<string, VoiceSettings> = {
  calm: { stability: 0.7, style: 0, speed: 0.96 },
  energetic: { stability: 0.3, style: 0.5, speed: 1.08 },
  happy: { stability: 0.35, style: 0.55, speed: 1.05 },
  confident: { stability: 0.6, style: 0.35, speed: 1 },
  formal: { stability: 0.8, style: 0, speed: 0.97 },
  warm: { stability: 0.5, style: 0.3, speed: 1 },
};
/** The voice's own saved sliders are the base; the tone only moves stability, style and speed. */
export const withTone = (base: VoiceSettings | undefined, tone: string): VoiceSettings => ({ ...(base ?? {}), ...TONE_SET[tone] });

/** Names the text writer / speech editor understands, per dialect id. */
export const DIALECT_NAME: Record<string, string> = { kuwaiti: "لهجة كويتية بيضاء واضحة", saudi: "لهجة سعودية بيضاء واضحة", emirati: "لهجة إماراتية بيضاء واضحة", qatari: "لهجة قطرية بيضاء واضحة", bahraini: "لهجة بحرينية بيضاء واضحة", omani: "لهجة عُمانية بيضاء واضحة", iraqi: "لهجة عراقية بيضاء واضحة", levantine: "لهجة شامية بيضاء واضحة", egyptian: "لهجة مصرية بيضاء واضحة", sudanese: "لهجة سودانية بيضاء واضحة", yemeni: "لهجة يمنية بيضاء واضحة", libyan: "لهجة ليبية بيضاء واضحة", maghrebi: "لهجة مغاربية مفهومة (دارجة مبسطة)", msa: "عربية فصحى مبسطة", en: "English (simple, clear, natural spoken)" };
