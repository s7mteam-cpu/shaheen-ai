"use client";
import Link from "next/link";
import { L } from "@/lib/i18n/ui";

/** «مجالك» lives only in هويتي. Tools read it from there; when it is not set yet they show this one line (no picker). */
export function IndustryNote({ industry }: { industry?: string | null }) {
  if (industry) return null;
  return <p className="text-[13px] text-subtle">{L("حدد مجالك مرة وحدة من")} <Link href="/app/brand" className="font-semibold text-navy-700 underline">{L("هويتي التجارية")}</Link> {L("وشاهين يضبط النبرة والمشاهد والألوان بكل الأدوات. وإذا تخطيته يخمّنه من كلامك.")}</p>;
}
