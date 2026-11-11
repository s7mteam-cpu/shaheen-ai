import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/", size = 40, sub = true }: { href?: string; size?: number; sub?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Shaheen — home">
      <Image src="/brand/eagle.png" alt="" width={size} height={size} priority />
      <span className="flex flex-col leading-none">
        <span className="text-[22px] font-bold text-gold-500">شاهين</span>
        {sub && <span className="font-latin text-[11px] tracking-[3px] text-white/70 mt-1">S7M</span>}
      </span>
    </Link>
  );
}
