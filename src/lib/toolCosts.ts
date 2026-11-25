/**
 * Our real cost in US dollars for ONE price unit of each tool (the unit written in the tool's «لكل» field),
 * measured from real jobs in «تكلفة كل طلب» (see the project log, section 19). Editable by hand in
 * admin → الأدوات والأسعار → «ملخص كل أداة»; what is saved there overrides these numbers.
 */
export const TOOL_COST_USD: Record<string, number> = {
  image: 0.134, "product-photo": 0.134, post: 0.07, "ad-design": 0.025, carousel: 0.011, "business-cards": 0.013,
  invitations: 0.021, cv: 0.013, presentations: 0.036,
  "free-post": 0.108, "free-ad": 0.131, "free-invite": 0.104, "free-card": 0.114, "free-carousel": 0.181, "free-deck": 0.0415, "free-cv": 0.095,
  "motion-video": 0.105, "site-video": 0.044, "real-scenes": 2.625, "free-motion": 0.825, "anim-video": 0.4825, "site-free": 0.14,
  "free-montage": 1.04, "video-editing": 0.064, "product-video": 0.355, "avatar-video": 3, "quran-video": 0,
  voice: 0.093, nasheed: 0.09,
};

/** Seconds-based tools: how many price units make one minute (so the per-minute cost can be shown). null = not a time unit. */
export function unitsPerMinute(id: string, unit: string): number | null {
  if (id === "free-montage") return 1; // the label says 15 s but the engine charges per started minute
  const u = unit.replace(/\s+/g, " ");
  if (/دقيقة/.test(u)) return 1;
  if (/15 ثانية/.test(u)) return 4;
  if (/30 ثانية/.test(u)) return 2;
  if (/5 ثواني/.test(u)) return 12;
  return null;
}
