"use client";
import { useEffect, useState } from "react";
import { LT } from "@/lib/i18n/ui";

type R = { enabled: boolean; days: number };
let cached: Promise<R> | null = null;

/** «ملفاتك تُحفظ N يوماً»: shown under a finished result, only while the auto-delete is switched on. */
export function RetentionNote({ className = "" }: { className?: string }) {
  const [r, setR] = useState<R | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/retention").then((x) => x.json() as Promise<R>).catch(() => ({ enabled: false, days: 45 }));
    cached.then(setR);
  }, []);
  if (!r?.enabled) return null;
  return <p className={`text-[12.5px] leading-6 text-subtle ${className}`}>🕒 {LT(`ملفاتك تُحفظ ${r.days} يوماً من تاريخ إنشائها ثم تُحذف تلقائياً. نزّل اللي تحتاجه قبل ذلك.`, `Your files are kept for ${r.days} days after they are made, then deleted automatically. Download what you need before then.`)}</p>;
}
