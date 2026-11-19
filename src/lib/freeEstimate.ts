/** «تصميم مبتكر» · automatic length: read the customer's idea and say how long the video should be (steps of 15 s, 15 s to 2 min). */
export const AUTO_MAX = 120;

export function estimateSeconds(idea: string): { seconds: number; scenes: number; condensed: boolean } {
  const text = String(idea ?? "");
  const AR = "٠١٢٣٤٥٦٧٨٩";
  const norm = text.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
  const numbered = (norm.match(/(?:^|[\n\r]|\s)\d{1,2}\s*[).\-–:،]\s*\S/g) ?? []).length;
  const named = (text.match(/مشهد/g) ?? []).length;
  const scenes = Math.max(numbered, named);
  const words = text.split(/\s+/).filter(Boolean).length;
  const raw = scenes >= 2 ? scenes * 8 : words * 0.45;
  const up = Math.ceil(Math.max(15, raw) / 15) * 15;
  return { seconds: Math.min(AUTO_MAX, up), scenes, condensed: up > AUTO_MAX };
}
