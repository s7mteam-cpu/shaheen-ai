/** Gender of a narrator voice: the admin can set "gender": "m" | "f" on a voice, otherwise it is read from the name or note. */
export function voiceGender(v?: { name?: string; note?: string; gender?: string } | null): "m" | "f" | null {
  if (!v) return null;
  if (v.gender === "m" || v.gender === "f") return v.gender;
  const t = `${v.name ?? ""} ${v.note ?? ""}`.toLowerCase();
  if (/(نسائ|نساء|امرأ|إمرأ|حرم|بنت|انثى|أنثى|female|woman|girl|lady)/.test(t)) return "f";
  if (/(رجال|رجل|ولد|ذكر|\bmale\b|\bman\b|\bboy\b)/.test(t)) return "m";
  return null;
}
