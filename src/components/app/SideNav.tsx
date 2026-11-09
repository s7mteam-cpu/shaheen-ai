"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

const items = [
  { href: "/app", label: "الرئيسية", icon: "home" },
  { href: "/app/tools", label: "كل الأدوات", icon: "grid" },
  { href: "/app/works", label: "أعمالي", icon: "folder" },
  { href: "/app/brand", label: "هويتي التجارية", icon: "palette" },
  { href: "/app/account", label: "الحساب والاشتراك", icon: "card" },
];

export function SideNav({ isAdmin, support }: { isAdmin: boolean; support?: string }) {
  const path = usePathname();
  const active = (h: string) => (h === "/app" ? path === "/app" : path.startsWith(h));
  return (
    <nav aria-label="قائمة المنصة" className="card flex flex-col gap-1 self-start p-3.5 lg:sticky lg:top-24">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] ${active(i.href) ? "bg-navy-800 font-semibold text-white" : "text-ink hover:bg-tint"}`}>
          <Icon name={i.icon} size={18} className={active(i.href) ? "text-gold-500" : "text-navy-700"} />{i.label}
        </Link>
      ))}
      <div className="mx-1 my-2 h-px bg-line" />
      {support && (
        <a href={support} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] hover:bg-tint">
          <Icon name="chat" size={18} className="text-navy-700" />تواصل مع الدعم
        </a>
      )}
      {isAdmin && (
        <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-navy-700 hover:bg-tint">
          <Icon name="settings" size={18} />لوحة الإدارة
        </Link>
      )}
    </nav>
  );
}
