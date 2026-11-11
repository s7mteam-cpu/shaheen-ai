import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { transcribe } from "@/lib/providers/elevenlabs";

export const maxDuration = 60;
const hits = new Map<string, number[]>();
const MAX_BYTES = 4 * 1024 * 1024; // Vercel accepts ~4.5MB per request; one minute of voice is far less.

/** Mic in «كلّم شاهين»: the recording becomes text in the message box (signed-in customers only, free). */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك عشان تستخدم المايك." }, { status: 401 });
  if (!process.env.ELEVENLABS_API_KEY) return NextResponse.json({ error: "التسجيل الصوتي غير متاح الحين." }, { status: 503 });

  const now = Date.now();
  const list = (hits.get(user.id) ?? []).filter((t) => now - t < 10 * 60_000);
  if (list.length >= 30) return NextResponse.json({ error: "تسجيلات كثيرة خلال وقت قصير، جرّب بعد شوي 🙏" }, { status: 429 });
  list.push(now); hits.set(user.id, list);

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size < 1000) return NextResponse.json({ error: "ما وصلنا صوت. اضغط المايك وتكلّم، وبعدين اضغطه مرة ثانية." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "التسجيل طويل. خلّه أقل من دقيقة." }, { status: 413 });

  try {
    const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
    const text = await transcribe(audio, `voice.${ext}`);
    if (!text) return NextResponse.json({ error: "ما قدرنا نسمع كلام واضح. جرّب مرة ثانية بمكان هادي." });
    return NextResponse.json({ text });
  } catch (e) {
    console.error("voice", e);
    return NextResponse.json({ error: "صار خطأ بتحويل الصوت. جرّب مرة ثانية أو اكتب سؤالك." }, { status: 502 });
  }
}
