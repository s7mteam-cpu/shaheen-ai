/** «مدة حفظ الملفات»: results are kept `days` days after they are made, then deleted; the customer is told `warn` days before. */
export type Retention = { enabled: boolean; days: number; warn: number };
export const RETENTION_DEFAULT: Retention = { enabled: false, days: 45, warn: 7 };

export function cleanRetention(v: unknown): Retention {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const num = (x: unknown, d: number, lo: number, hi: number) => { const n = Math.round(Number(x)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
  const days = num(o.days, RETENTION_DEFAULT.days, 14, 365);
  const warn = Math.min(num(o.warn, RETENTION_DEFAULT.warn, 1, 30), days - 1);
  return { enabled: o.enabled === true, days, warn };
}

/** whole days left until a file made at `created` is deleted (computed on the server, so the page never differs between server and browser) */
export function daysLeft(created: string, days: number, now = Date.now()): number {
  return Math.ceil((new Date(created).getTime() + days * 86_400_000 - now) / 86_400_000);
}
