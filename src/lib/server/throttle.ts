import "server-only";

/** A light per-server-instance limiter for free endpoints (not a hard guarantee across instances, but it stops loops and scripts). */
const hits = new Map<string, number[]>();
export function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}
