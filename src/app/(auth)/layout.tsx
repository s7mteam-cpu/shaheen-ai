import Image from "next/image";
import Link from "next/link";
import { Circuit } from "@/components/Circuit";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap">
      <main className="flex min-w-0 flex-[1_1_480px] items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-[420px] flex-col gap-7">
          <Link href="/" className="inline-flex items-center gap-2.5 self-start">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800"><Image src="/brand/eagle.png" alt="" width={32} height={32} /></span>
            <span className="text-[22px] font-bold text-navy-900">شاهين</span>
          </Link>
          {children}
        </div>
      </main>
      <aside className="relative hidden min-w-0 flex-[1_1_520px] items-center justify-center overflow-hidden bg-navy-800 p-12 lg:flex">
        <Circuit className="absolute inset-0 h-full w-full opacity-20" />
        <div className="relative flex max-w-md flex-col items-center gap-6 text-center">
          <Image src="/brand/eagle.png" alt="" width={180} height={180} />
          <h2 className="text-[34px] font-bold leading-snug text-white">محتوى مشروعك، <span className="text-gold-500">بلمسة شاهين</span></h2>
          <p className="text-[17px] leading-8 text-white/80">صور، فيديو، إعلانات وأصوات — من فكرة مكتوبة بالعربي إلى عمل جاهز للنشر.</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {["بالعربي وباللهجات", "بهويتك التجارية", "تكلفة واضحة بالريشة"].map((t) => (
              <span key={t} className="rounded-full border border-gold-500/45 px-3.5 py-1.5 text-sm text-gold-500">{t}</span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
