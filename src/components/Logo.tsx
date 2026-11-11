import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/", size = 40, sub = true }: { href?: string; size?: number; sub?: boolean }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-1.5 sm:gap-2.5" aria-label="Shaheen — home">
      <Image src="/brand/eagle.png" alt="" width={size} height={size} priority className="h-7 w-7 sm:h-auto sm:w-auto" />
      <span className="flex flex-col leading-none">
        <span className="text-[18px] font-bold text-gold-500 sm:text-[22px]">شاهين</span>
        {sub && <span className="mt-1 hidden font-latin text-[11px] tracking-[3px] text-white/70 min-[400px]:block">S7M</span>}
      </span>
    </Link>
  );
}
