"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

export function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.replace("/"); router.refresh();
  }
  return (
    <div className="relative">
      <button type="button" aria-label="قائمة الحساب" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold-500 bg-navy-700 text-[15px] font-bold text-white">
        {name.trim().charAt(0) || "؟"}
      </button>
      {open && (
        <div className="card absolute left-0 top-12 z-40 flex w-52 flex-col p-2 shadow-lg">
          <Link href="/app/account" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm hover:bg-tint">الحساب والاشتراك</Link>
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-right text-sm text-red-700 hover:bg-red-50"><Icon name="logout" size={16} />تسجيل الخروج</button>
        </div>
      )}
    </div>
  );
}
