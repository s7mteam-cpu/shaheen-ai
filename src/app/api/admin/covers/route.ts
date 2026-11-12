import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { geminiImage } from "@/lib/providers/google";
import { falImages, falRun } from "@/lib/providers/fal";
import { config } from "@/lib/tools/run";
import { aiJson } from "@/lib/providers/text";

export const maxDuration = 300;

/** Realistic photo prompts for each tool's card (Gulf / Kuwaiti business feel, no people's faces in focus, no text). */
const PROMPTS: Record<string, string> = {
  post: "a smartphone lying on a white marble café table showing an elegant Instagram post of a latte, a real latte with latte art next to it, warm morning sunlight, shallow depth of field",
  image: "a modern creative studio desk with a large monitor displaying a breathtaking golden-hour desert landscape artwork, soft glowing light, plants and a coffee cup, cinematic",
  carousel: "a hand holding a smartphone swiping through an Instagram carousel of elegant product slides, soft bokeh background of a cosy Kuwaiti café",
  "motion-video": "a laptop on a dark wooden desk playing colourful animated motion graphics on screen, neon purple and gold reflections, creative studio at night",
  "lesson-video": "a tablet on a bright study desk playing an animated educational video with charts and icons, open notebooks, pencils and a cup of tea, daylight from a window",
  "quran-video": "an open Holy Quran resting on a carved wooden rehal stand inside a peaceful mosque at sunset, warm golden light through arches, soft bokeh, serene and respectful",
  "video-editing": "a professional video editing desk with two monitors showing a colourful timeline, a mirrorless camera and headphones on the desk, moody teal and orange lighting",
  "product-video": "a luxury perfume bottle on a slowly rotating display pedestal with dramatic studio lighting and soft smoke, high-end product commercial shoot",
  "avatar-video": "a smartphone on a tripod with a ring light in a modern office, recording a presentation, the presenter softly out of focus in the background wearing a white Kuwaiti dishdasha",
  "ad-design": "a smartphone held up showing a vibrant social media advertisement design, blurred evening city lights of Kuwait City in the background, bold colours",
  voice: "a professional studio microphone with a pop filter and over-ear headphones inside a warm, soundproofed voice-over booth",
  nasheed: "a crescent moon over calm desert sand dunes at night under a starry sky, soft blue and gold glow, peaceful",
  "product-photo": "a professional product photography set: softbox lights and a camera on a tripod shooting an elegant oud perfume bottle on a stone pedestal",
};
const STYLE = "Photorealistic professional photograph, natural colours, high detail, aspect 4:3. Absolutely no text, no letters, no numbers, no logos, no watermark.";

async function draw(prompt: string) {
  const { provider, model } = await config("image");
  if (provider === "google") {
    const r = await geminiImage(model, prompt, [], "4:3");
    return { bytes: r.bytes as ArrayBuffer | Uint8Array, type: r.type };
  }
  const data = await falRun(model.replace(/\/edit$/, ""), { prompt, num_images: 1, aspect_ratio: "4:3" });
  const [url] = falImages(data);
  if (!url) throw new Error("no image");
  const res = await fetch(url);
  return { bytes: await res.arrayBuffer(), type: res.headers.get("content-type") || "image/jpeg" };
}

/** Admin → «الأدوات»: draws realistic card pictures with the site's image AI and saves them as each tool's card picture. */
export async function POST(req: Request) {
  if (!(await requireAdmin("tools"))) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const admin = createAdminClient();
  // ⬆️ a picture from the admin's device → the card picture straight away
  if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    const form = await req.formData();
    const id = String(form.get("id") ?? ""), file = form.get("file") as File | null;
    if (!/^[\w-]+$/.test(id) || !file || !file.type.startsWith("image/")) return NextResponse.json({ error: "اختر صورة." }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "الصورة أكبر من 4 ميجا، صغّرها وحاول مرة ثانية." }, { status: 413 });
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `covers/${id}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const up = await admin.storage.from("site").upload(path, file, { contentType: file.type });
    if (up.error) return NextResponse.json({ error: "تعذّر رفع الصورة." }, { status: 500 });
    await admin.from("tools").update({ cover_url: admin.storage.from("site").getPublicUrl(path).data.publicUrl }).eq("id", id);
    return NextResponse.json({ done: [id], failed: [], skipped: 0 });
  }
  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; replace?: boolean; prompt?: string };
  // ✍️ the admin's own description (any language) → a clear English photo prompt
  let custom = String(body.prompt ?? "").trim().slice(0, 500);
  if (custom && /[\u0600-\u06FF]/.test(custom)) {
    try { custom = (await aiJson<{ en: string }>("Rewrite this picture request as one clear English prompt for a realistic photograph. Return JSON {\"en\":\"...\"}.", custom, 300, { provider: "claude", model: "claude-haiku-5-5" })).en || custom; } catch { /* use as written */ }
  }
  const { data: tools } = await admin.from("tools").select("id,cover_url");
  const todo = (tools ?? []).filter((t) => (PROMPTS[t.id] || (custom && body.ids?.includes(t.id))) && (!body.ids?.length || body.ids.includes(t.id)) && (body.replace || !t.cover_url));
  const done: string[] = [], failed: string[] = [];
  // a few at a time so the image provider isn't flooded
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(todo.slice(i, i + 4).map(async (t) => {
      try {
        const img = await draw(`${custom && body.ids?.length === 1 ? custom : PROMPTS[t.id]}. ${STYLE}`);
        const ext = img.type.includes("png") ? "png" : img.type.includes("webp") ? "webp" : "jpg";
        const path = `covers/${t.id}-ai-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const up = await admin.storage.from("site").upload(path, img.bytes, { contentType: img.type });
        if (up.error) throw new Error(up.error.message);
        await admin.from("tools").update({ cover_url: admin.storage.from("site").getPublicUrl(path).data.publicUrl }).eq("id", t.id);
        done.push(t.id);
      } catch (e) { console.error("cover", t.id, e); failed.push(t.id); }
    }));
  }
  return NextResponse.json({ done, failed, skipped: (tools ?? []).length - todo.length });
}
