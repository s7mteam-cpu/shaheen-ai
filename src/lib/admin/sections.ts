/** Every admin section. Staff see only the ones the owner ticks for them; «فريق الإدارة» is for full admins only. */
export const SECTIONS = [
  { key: "overview", path: "/admin", label: "نظرة عامة" },
  { key: "finance", path: "/admin/finance", label: "المالية" },
  { key: "transfers", path: "/admin/transfers", label: "الدفع بالتحويل" },
  { key: "content", path: "/admin/content", label: "نصوص وصور الموقع" },
  { key: "tools", path: "/admin/tools", label: "الأدوات والأسعار" },
  { key: "ai", path: "/admin/ai", label: "الذكاء الاصطناعي" },
  { key: "plans", path: "/admin/plans", label: "الباقات" },
  { key: "customers", path: "/admin/customers", label: "العملاء" },
  { key: "leads", path: "/admin/leads", label: "طلبات الإدارة" },
  { key: "jobs", path: "/admin/jobs", label: "الطلبات" },
  { key: "gallery", path: "/admin/gallery", label: "أعمال صُنعت بشاهين" },
  { key: "packs", path: "/admin/packs", label: "مكتبة المجالات" },
  { key: "trends", path: "/admin/trends", label: "الترندات" },
  { key: "changes", path: "/admin/changes", label: "آخر التعديلات" },
  { key: "reset", path: "/admin/reset", label: "تصفير المنصة" },
] as const;
export const TEAM = { key: "team", path: "/admin/team", label: "فريق الإدارة" } as const;
/** «كلمات السر»: a second password on any admin section. Full admins only, like «فريق الإدارة». */
export const PASSWORDS = { key: "passwords", path: "/admin/passwords", label: "كلمات السر" } as const;
/** «ربط Google Sheets»: sends all the data to the owner's Google file, so full admins only. */
export const SHEETS = { key: "sheets", path: "/admin/sheets", label: "ربط Google Sheets" } as const;
export type SectionKey = (typeof SECTIONS)[number]["key"] | "team" | "passwords" | "sheets";
/** Once an admin password exists, «كلمات السر» itself always needs it (everything else is the owner's choice). */
export const ALWAYS_LOCKED: SectionKey[] = ["passwords"];

/** Which section a URL belongs to (longest matching path wins). */
export function sectionOf(path: string): SectionKey | null {
  if (!path.startsWith("/admin")) return null;
  const all = [...SECTIONS, TEAM, PASSWORDS, SHEETS].sort((a, b) => b.path.length - a.path.length);
  for (const s of all) if (s.path === "/admin" ? path === "/admin" || path === "/admin/" : path === s.path || path.startsWith(s.path + "/")) return s.key;
  return "overview";
}

export const OWNER_EMAILS = ["s7m.team@gmail.com"];
