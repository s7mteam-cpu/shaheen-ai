"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/LangProvider";

/** The five bar pages are the roots; on every other page (a tool, my account, brand kit…) a phone shows «السابق» at the top, on the start side
 *  (top right in Arabic). It goes back one step inside the platform; if the page was opened directly (nothing before it) it goes to the home page. */
const ROOTS = new Set(["/app", "/app/tools", "/app/works", "/app/brand/plan"]);

export function BackBar() {
  const path = usePathname().replace(/\/$/, "") || "/";
  const router = useRouter();
  const T = useT();
  const first = useRef(path);
  const moved = useRef(false); // true once the customer has gone from one page to another inside the platform
  useEffect(() => { if (path !== first.current) moved.current = true; }, [path]);
  if (ROOTS.has(path)) return null;
  return (
    <div className="mb-4 flex lg:hidden">
      <button type="button" onClick={() => (moved.current ? router.back() : router.push("/app"))}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pe-4 ps-1 text-[14px] font-semibold text-navy-900 active:scale-95">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-gold-500"><Icon name="arrow" size={16} className="rtl:rotate-180" /></span>
        {T("السابق", "Back")}
      </button>
    </div>
  );
}
