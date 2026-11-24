import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { dbReady } from "@/lib/data";
import { cleanAgent, publicAgent } from "@/lib/agents";
import { getMine, getTeam, saveMine } from "@/lib/server/chatTeam";
import { guardContent } from "@/lib/server/moderation";

/** «أضف موظفك»: a signed-in customer adds a team member of his own (when the admin allows it). What he writes is a DESCRIPTION of that member's field and tone:
 *  it is checked like any content, kept short, and given to the model as data, never as instructions. Only he sees this member. */
export async function POST(req: Request) {
  if (!dbReady()) return NextResponse.json({ error: "غير متاح" }, { status: 400 });
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const team = await getTeam();
  if (!team.allowCustom) return NextResponse.json({ error: "إضافة الموظفين غير متاحة حالياً." }, { status: 403 });
  const mine = await getMine(user.id);
  if (mine.length >= team.maxCustom) return NextResponse.json({ error: `تقدر تضيف ${team.maxCustom} موظفين بالكثير. احذف واحد أولاً.` }, { status: 400 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const a = cleanAgent({ name: b.name, role: b.role, focus: b.focus, line: b.role, color: b.color, look: b.look }, `u_${randomBytes(5).toString("hex")}`, true);
  if (!a) return NextResponse.json({ error: "اكتب اسم الموظف (حرفين وأكثر)." }, { status: 400 });
  if (a.focus.length < 10) return NextResponse.json({ error: "اكتب بسطر أو سطرين شنو شغل هالموظف." }, { status: 400 });
  const blocked = await guardContent(user.id, { text: `${a.name} ${a.role} ${a.focus}` }, "chat-agent");
  if (blocked) return blocked;
  await saveMine(user.id, [...mine, a]);
  return NextResponse.json({ agent: publicAgent(a) });
}

export async function DELETE(req: Request) {
  if (!dbReady()) return NextResponse.json({ ok: true });
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ ok: true });
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const mine = await getMine(user.id);
  if (mine.some((a) => a.key === key)) await saveMine(user.id, mine.filter((a) => a.key !== key));
  return NextResponse.json({ ok: true });
}
