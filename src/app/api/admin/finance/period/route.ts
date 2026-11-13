import { requireAdmin } from "@/lib/server/auth";
import { xlsxResponse } from "@/lib/server/xlsx";
import { periodWorkbook } from "@/lib/server/periodBook";

export const dynamic = "force-dynamic";

/** «تقرير Excel للدورة»: revenue, expenses by type, net profit, partner shares and withdrawals, employees — any dates. */
export async function GET(req: Request) {
  if (!(await requireAdmin("finance"))) return new Response("غير مصرّح", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const from = sp.get("from") ?? "", to = sp.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) return new Response("bad dates", { status: 400 });
  const name = (sp.get("name") ?? "دورة").slice(0, 60);
  const { wb } = await periodWorkbook(name, from, to);
  return xlsxResponse(wb, `shaheen-cycle-${from}-${to}.xlsx`, `شاهين-${name}-${from}-${to}.xlsx`);
}
