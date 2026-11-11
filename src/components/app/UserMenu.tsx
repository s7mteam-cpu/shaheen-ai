"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/LangProvider";

export function UserMenu({ name }: { name: string }) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.replace("/"); router.refresh();
  }
  return (
    <div className="relative">
      <button type="button" aria-label={T("قائمة الحساب", "Account menu")} aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold-500 bg-navy-700 text-[15px] font-bold text-white">
        {name.trim().charAt(0) || "؟"}
      </button>
      {open && (
        <div className="card absolute end-0 top-12 z-40 flex w-52 flex-col p-2 shadow-lg">
          <Link href="/app/account" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm hover:bg-tint">{T("الحساب والاشتراك", "Account & plan")}</Link>
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm text-red-700 hover:bg-red-50"><Icon name="logout" size={16} />{T("تسجيل الخروج", "Sign out")}</button>
        </div>
      )}
    </div>
  );
}
