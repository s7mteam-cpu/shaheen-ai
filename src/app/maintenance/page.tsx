import Image from "next/image";

export const metadata = { title: "شاهين — قريباً", robots: { index: false, follow: false } };

/** Shown to every visitor (except the admin team) while «وضع الصيانة» is on: only the logo, the name and «قريباً». */
export default function Maintenance() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-navy-900 px-6 text-center">
      <Image src="/brand/eagle.png" alt="" width={120} height={120} priority />
      <h1 className="text-[40px] font-bold text-gold-500 sm:text-[52px]">شاهين</h1>
   
      <p className="mt-2 rounded-full border border-gold-500/60 px-6 py-2 text-[18px] font-bold text-gold-500 sm:text-[20px]">قريباً</p>
    </main>
  );
}
