import Link from "next/link";
import type { ReactNode } from "react";
import type { SiteContent } from "@/lib/defaults";

const SITE = "shaheen-kw.com";
const OWNER_EMAIL = "s7m.team@gmail.com";

/** Values that appear inside the legal texts as {email}, {whatsapp}… — they come from the other settings,
 *  so editing the number/email once updates every page. */
export function legalVars(c: SiteContent): Record<string, string> {
  return {
    email: c.footer?.email?.trim() || OWNER_EMAIL,
    whatsapp: c.footer?.whatsapp?.trim() || "",
    refund_days: String(c.legal?.refund_days || "14"),
    managed_price: String(c.managed_service?.price_kwd || "150"),
    site: SITE,
  };
}

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

function inline(text: string, key: string): ReactNode[] {
  // **bold** and [label](url)
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={`${key}b${i++}`} className="text-navy-900">{m[1]}</strong>);
    else {
      const href = m[3];
      out.push(href.startsWith("/")
        ? <Link key={`${key}a${i++}`} href={href} className="text-navy-700 underline">{m[2]}</Link>
        : <a key={`${key}a${i++}`} href={href} target="_blank" rel="noreferrer" className="text-navy-700 underline">{m[2]}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function blocks(src: string, prefix = ""): ReactNode[] {
  const lines = src.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let i = 0, n = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const k = `${prefix}${n++}`;
    if (!line) { i++; continue; }
    if (line.startsWith(">")) {
      const box: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) box.push(lines[i++].trim().replace(/^>\s?/, ""));
      out.push(<div key={k} className="mb-8 rounded-2xl bg-canvas p-5 text-navy-900">{blocks(box.join("\n"), `${k}-`)}</div>);
    } else if (line.startsWith("## ")) {
      out.push(<h2 key={k} className="mb-3 mt-10 text-[21px] font-bold text-navy-900">{inline(line.slice(3), k)}</h2>);
      i++;
    } else if (/^[-•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•]\s/.test(lines[i].trim())) items.push(lines[i++].trim().slice(2));
      out.push(<ul key={k} className="mb-4 list-disc space-y-2 ps-6">{items.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)}</ul>);
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(##\s|[-•]\s|>)/.test(lines[i].trim())) para.push(lines[i++].trim());
      out.push(<p key={k} className="mb-4">{inline(para.join(" "), k)}</p>);
    }
  }
  return out;
}

/** One legal page: Arabic on top, English below — both straight from «نصوص وصور الموقع ← الصفحات القانونية». */
export function LegalDoc({ c, ar, en, titleAr, titleEn }: { c: SiteContent; ar: string; en: string; titleAr: string; titleEn: string }) {
  const v = legalVars(c);
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[16px] leading-8 text-muted">
      <h1 className="mb-2 text-3xl font-bold text-navy-900">{titleAr}</h1>
      {c.legal?.updated && <p className="mb-8 text-[14px]">آخر تحديث: {c.legal.updated}</p>}
      {blocks(fill(ar, v))}
      {en?.trim() && (
        <>
          <hr className="my-12 border-line" />
          <div dir="ltr" lang="en" className="text-left">
            <h1 className="mb-2 text-3xl font-bold text-navy-900">{titleEn}</h1>
            {c.legal?.updated_en && <p className="mb-8 text-[14px]">Last updated: {c.legal.updated_en}</p>}
            {blocks(fill(en, v), "en")}
          </div>
        </>
      )}
    </main>
  );
}
