import { normalizePhoneFor } from "@/lib/countries";

/** WhatsApp numbers: Arabic/Persian digits → Latin, "00" → "+", local digits get the country code (Kuwait by default). Null when it isn't a phone number. */
export function normalizePhone(raw: string, country?: string | null): string | null {
  return normalizePhoneFor(raw, country);
}
export const waLink = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
