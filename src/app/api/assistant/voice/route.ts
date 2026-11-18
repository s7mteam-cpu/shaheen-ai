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
    // ElevenLabs sometimes answers 429 «system_busy» (their side is overloaded, not our balance): wait a moment and try again, up to 3 times.
    let text = "";
    for (let n = 0; ; n++) {
      try { text = await transcribe(audio, `voice.${ext}`); break; }
      catch (err) {
        const busy = /429|system_busy|rate_limit|50[023]/i.test(String(err));
        if (!busy || n >= 2) throw err;
        await new Promise((r) => setTimeout(r, 1500 * (n + 1)));
      }
    }
    if (!text) return NextResponse.json({ error: "ما قدرنا نسمع كلام واضح. جرّب مرة ثانية بمكان هادي." });
    return NextResponse.json({ text });
  } catch (e) {
    console.error("voice", e);
    const busy = /429|system_busy|rate_limit/i.test(String(e));
    return NextResponse.json({ error: busy ? "خدمة الصوت مشغولة الحين. جرّب بعد دقيقة أو اكتب سؤالك." : "صار خطأ بتحويل الصوت. جرّب مرة ثانية أو اكتب سؤالك." }, { status: 502 });
  }
}
