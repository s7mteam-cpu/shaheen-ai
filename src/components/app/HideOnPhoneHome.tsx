"use client";
import { usePathname } from "next/navigation";

/** On phones the home page already shows the balance in its big card, so the small balance pill in the top bar is hidden there only (it stays on every other page). */
export function HideOnPhoneHome({ children }: { children: React.ReactNode }) {
  return <span className={usePathname() === "/app" ? "contents max-lg:hidden" : "contents"}>{children}</span>;
}
