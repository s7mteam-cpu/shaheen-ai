/** WhatsApp numbers: Arabic/Persian digits → Latin, "00" → "+", 8 local digits → Kuwait (+965). Returns null when it isn't a phone number. */
export function normalizePhone(raw: string): string | null {
  const latin = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  let p = latin.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+")) p = p.length === 8 ? "+965" + p : "+" + p;
  const digits = p.slice(1);
  return /^\d{8,15}$/.test(digits) ? p : null;
}

export const waLink = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
