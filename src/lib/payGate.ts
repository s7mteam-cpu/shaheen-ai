/** «إغلاق الاشتراك مؤقتاً»: kept as one row in site_content (key «payments_gate», value {on, message}).
 *  While on, a new subscription / plan change shows an apology instead of the payment; the admin team can still test it. */
export const PAYGATE_KEY = "payments_gate";
export const PAYGATE_DEFAULT_MSG = "نعتذر، طرق الدفع لسا ما تفعّلت. خلال أيام تكون متاحة على الموقع، وتقدر تشترك مباشرة من الموقع.";
export type PayGate = { on: boolean; message: string };
export const cleanPayGate = (v: unknown): PayGate => {
  const o = (v ?? {}) as { on?: unknown; message?: unknown };
  const message = String(o.message ?? "").trim().slice(0, 400);
  return { on: o.on === true, message: message || PAYGATE_DEFAULT_MSG };
};
