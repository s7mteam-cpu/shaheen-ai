import { getContent } from "@/lib/data";

export const metadata = { title: "سياسة الاسترجاع والإلغاء" };
export const revalidate = 60;

export default async function Page() {
  const c = await getContent();
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-8 text-3xl font-bold text-navy-900">سياسة الاسترجاع والإلغاء</h1>
      <div className="whitespace-pre-line text-[16px] leading-8 text-muted">{c.legal.refund}</div>
    </main>
  );
}
