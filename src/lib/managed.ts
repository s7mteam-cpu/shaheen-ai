import type { SiteContent } from "@/lib/defaults";

export type ManagedPkg = { id: string; enabled: boolean; title: string; price_kwd: string; period: string; features: string[]; cta: string; whatsapp: string; whatsapp_message: string; thanks: string };
type MS = SiteContent["managed_service"];

/** The management packages. Before the first one is added by hand there is just the original single package («main»). */
export function managedPackages(ms: MS): ManagedPkg[] {
  const base = { whatsapp: ms.whatsapp, thanks: ms.thanks, period: ms.period, cta: ms.cta };
  if (ms.packages?.length) return ms.packages.map((p) => ({ ...base, ...p, features: p.features ?? [] }));
  return [{ id: "main", enabled: ms.enabled, title: ms.title, price_kwd: ms.price_kwd, period: ms.period, features: ms.features, cta: ms.cta, whatsapp: ms.whatsapp, whatsapp_message: ms.whatsapp_message, thanks: ms.thanks }];
}

/** One package by id; with no id (the old payment links) it is the first one. */
export function managedPackage(ms: MS, id?: string | null): ManagedPkg {
  const all = managedPackages(ms);
  return all.find((p) => p.id === id) ?? all[0];
}
