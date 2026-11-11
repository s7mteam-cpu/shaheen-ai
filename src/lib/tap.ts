import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Tap Payments (https://developers.tap.company) — the Kuwaiti/Gulf payment gateway.
 * Turned on simply by adding TAP_SECRET_KEY in Vercel (sk_test_… for testing, sk_live_… for real money).
 */
const API = "https://api.tap.company/v2";

export const tapEnabled = () => Boolean(process.env.TAP_SECRET_KEY);
export const tapTestMode = () => (process.env.TAP_SECRET_KEY ?? "").startsWith("sk_test");

export type TapCharge = {
  id: string;
  status: string;                       // INITIATED, CAPTURED, DECLINED, FAILED, CANCELLED, ABANDONED, …
  amount: number;
  currency: string;
  customer_initiated?: boolean;
  metadata?: Record<string, string>;
  reference?: { transaction?: string; order?: string; gateway?: string; payment?: string };
  transaction?: { url?: string; created?: string };
  source?: { id?: string; payment_method?: string; payment_type?: string };
  card?: { id?: string; brand?: string; scheme?: string; last_four?: string; first_six?: string };
  customer?: { id?: string };
  payment_agreement?: { id?: string };
  response?: { code?: string; message?: string };
  errors?: { code: string; description: string }[];
};

async function tap<T>(path: string, init?: { method?: string; body?: unknown; lang?: "ar" | "en" }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`,
      "Content-Type": "application/json",
      accept: "application/json",
      lang_code: init?.lang ?? "ar",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & { errors?: { code: string; description: string }[] };
  if (!res.ok || json.errors?.length) {
    const msg = json.errors?.map((e) => `${e.code}: ${e.description}`).join(" | ") || `HTTP ${res.status}`;
    throw new Error(`Tap ${path}: ${msg}`);
  }
  return json;
}

export const createCharge = (body: Record<string, unknown>) => tap<TapCharge>("/charges", { body });
export const getCharge = (id: string) => tap<TapCharge>(`/charges/${encodeURIComponent(id)}`);
export const tokenFromSavedCard = (cardId: string, customerId: string) =>
  tap<{ id: string }>("/tokens", { body: { saved_card: { card_id: cardId, customer_id: customerId } } });

/** Tap signs every webhook: HMAC-SHA256 of the charge fields with our secret key, sent in the `hashstring` header. */
export function verifyTapHash(c: TapCharge, header: string | null) {
  if (!header || !process.env.TAP_SECRET_KEY) return false;
  const decimals = ["KWD", "BHD", "OMR", "JOD"].includes(c.currency) ? 3 : 2;
  const s = `x_id${c.id}x_amount${Number(c.amount).toFixed(decimals)}x_currency${c.currency}`
    + `x_gateway_reference${c.reference?.gateway ?? ""}x_payment_reference${c.reference?.payment ?? ""}`
    + `x_status${c.status}x_created${c.transaction?.created ?? ""}`;
  const mine = createHmac("sha256", process.env.TAP_SECRET_KEY).update(s).digest("hex");
  return mine.length === header.length && timingSafeEqual(Buffer.from(mine), Buffer.from(header));
}

/** "+96550000000" → { country_code: 965, number: 50000000 } (Tap wants them apart). */
export function tapPhone(phone?: string | null) {
  const d = (phone ?? "").replace(/\D/g, "");
  // Our numbers are saved as +<country><number>; the Gulf country codes are all 3 digits (965, 966, 971, 973, 974, 968).
  if (d.length >= 10) return { country_code: Number(d.slice(0, 3)), number: Number(d.slice(3)) };
  return { country_code: 965, number: Number(d || "0") };
}

/** How the customer paid, in plain words. */
export function methodOf(c: TapCharge) {
  const m = (c.source?.payment_method || c.card?.brand || c.card?.scheme || "").toUpperCase();
  if (m.includes("KNET")) return "KNET";
  if (m.includes("APPLE")) return "APPLE_PAY";
  return m || "CARD";
}
