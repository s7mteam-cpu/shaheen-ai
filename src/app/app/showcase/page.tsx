import Link from "next/link";
import { ShowcaseGrid } from "@/components/Showcase";
import { getShowcase } from "@/lib/data";
import { getL } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";
import { getLang } from "@/lib/server/lang";

export async function generateMetadata() { return { title: (await getL())("أعمال صنعت بشاهين") }; }

/** «معرض شاهين / صُنع بأيادي شاهين»: what the platform can make, uploaded by the admin. */
export default async function Showcase() {
  const L = await getL();
  const items = await localize(await getShowcase(), await getLang());
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold text-navy-900">{L("أعمال صنعت بشاهين")}</h1>
        <p className="text-[15px] leading-7 text-muted">{L("بوستات، كاروسيل، ريلز وفيديوهات سوّيناها بأدوات المنصة. اضغط على أي عمل عشان تشوفه كامل.")}</p>
      </div>
      {items.length > 0
        ? <ShowcaseGrid items={items} filter />
        : <p className="card p-10 text-center text-muted">{L("قريباً نضيف هنا نماذج من شغل شاهين.")}</p>}
      <div className="card flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-start">
        <b className="text-navy-900">{L("عجبك؟ سوّ مثله الحين بأدوات شاهين.")}</b>
        <Link href="/app/tools" className="btn btn-gold px-6 py-3 font-bold">{L("ابدأ من الأدوات")}</Link>
      </div>
    </div>
  );
}
