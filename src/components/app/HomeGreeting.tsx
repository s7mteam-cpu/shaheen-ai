"use client";
import { usePathname } from "next/navigation";

/** Greeting shown at the very top of the home page (above the menu on phones). */
export function HomeGreeting({ name }: { name?: string }) {
  if (usePathname() !== "/app") return null;
  return (
    <header className="mx-auto flex max-w-[1400px] flex-col gap-1.5 px-6 pt-6">
      <h1 className="text-[26px] font-bold text-navy-900">{name ? `هلا ${name} 👋` : "هلا فيك 👋"}</h1>
      <p className="text-[16px] text-subtle">شنو تبي تسوّي اليوم؟ اختر أداة وابدأ.</p>
    </header>
  );
}
