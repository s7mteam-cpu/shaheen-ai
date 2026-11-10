import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { falImages, falQueue, falRun } from "@/lib/providers/fal";
import { aiJson } from "@/lib/providers/text";
import { geminiImage, geminiSpeech } from "@/lib/providers/google";
import { toolProviders } from "@/lib/providers/registry";
import { cloneVoice, deleteVoice, music, tts, type VoiceSettings } from "@/lib/providers/elevenlabs";
import { saveFromUrl, saveResult, signedUploadUrls } from "@/lib/providers/storage";
import type { Values } from "@/lib/tools/specs";

export type Job = { id: string; user_id: string; tool_id: string; input: Values };
export type OutFile = { path: string; type: string; caption?: string };

const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const files = (v: Values, k: string) => (Array.isArray(v[k]) ? (v[k] as string[]) : []);

const moods: Record<string, string> = {
  marble: "on polished white marble with soft window light, luxury editorial look",
  studio: "on a seamless pure white studio background, soft even lighting, e-commerce look",
  nature: "in a natural outdoor setting with green leaves and soft sunlight",
  bold: "on a bold saturated color background with hard shadows, modern pop style",
  night: "in a dark luxurious night scene with dramatic rim light and reflections",
  desert: "on warm desert sand with golden hour light, Gulf atmosphere",
  lifestyle: "in a realistic everyday lifestyle scene, being used naturally",
  macro: "extreme macro close-up showing texture and detail, shallow depth of field",
};

export async function brandHint(userId: string) {
  const { data } = await createAdminClient().from("brand_kits").select("business_name,colors").eq("user_id", userId).maybeSingle();
  if (!data) return "";
  const colors = (data.colors ?? []).filter(Boolean).join(", ");
  return [data.business_name ? `Brand: ${data.business_name}.` : "", colors ? `Use the brand colors ${colors}.` : ""].join(" ");
}

/** The provider + model the admin picked for this tool (falls back to the tool's first allowed provider). */
export async function config(toolId: string) {
  const { data } = await createAdminClient().from("tools").select("provider,provider_model").eq("id", toolId).single();
  const allowed = toolProviders[toolId] ?? {};
  const provider = (data?.provider && data.provider in allowed ? data.provider : Object.keys(allowed)[0]) as keyof typeof allowed;
  return { provider, model: data?.provider_model || allowed[provider] || "" };
}

export async function voiceById(id: string) {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "voices").maybeSingle();
  const list = ((data?.value as { items?: { id: string; google_voice?: string; model?: string; settings?: VoiceSettings }[] })?.items) ?? [];
  const v = list.find((x) => x.id === id) ?? list[0];
  // optional per-voice model (admin → content → voices → "model"), else the clear Multilingual v2
  return { eleven: v?.id ?? "pNInz6obpgDQGcFmaJgB", google: v?.google_voice || "Kore", model: v?.model || undefined, settings: v?.settings };
}

/**
 * Runs a job. Returns files when the job finished now,
 * or null when it was queued and will finish through a webhook / the worker.
 */
export async function runJob(job: Job): Promise<OutFile[] | null> {
  const v = job.input;
  const brand = await brandHint(job.user_id);
  const save = async (urls: string[]) => Promise.all(urls.map(async (u) => {
    const r = await saveFromUrl(job.user_id, job.id, u);
    return { path: r.path, type: r.type };
  }));

  const googleImages = async (model: string, prompt: string, imgs: string[], count: number) => {
    const out: OutFile[] = [];
    for (let i = 0; i < count; i++) {
      const r = await geminiImage(model, prompt, imgs, String(v.aspect ?? "1:1"));
      out.push({ path: await saveResult(job.user_id, job.id, r.bytes, r.type, r.type.includes("png") ? "png" : "jpg"), type: r.type });
    }
    return out;
  };

  // «تعديل» on an image result: edit the previous output with the customer's instruction.
  if (typeof v._edit_from === "string" && ["image", "carousel", "product-photo", "ad-design"].includes(job.tool_id)) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage.from("results").createSignedUrl(v._edit_from, 3600);
    const src = signed?.signedUrl ? [signed.signedUrl] : [];
    const { provider, model: m } = await config(job.tool_id);
    const prompt = `Edit this image: ${v._edit_text}. Keep everything else exactly the same.`;
    if (provider === "google") return googleImages(m, prompt, src, 1);
    const editModel = m.endsWith("/edit") ? m : `${m}/edit`;
    const data = await falRun(editModel, { prompt, image_urls: src, num_images: 1, aspect_ratio: v.aspect });
    return save(falImages(data));
  }

  switch (job.tool_id) {
    case "image": {
      const imgs = await signedUploadUrls(files(v, "images"));
      const { provider, model: m } = await config("image");
      if (provider === "google") return googleImages(m, `${v.prompt}. ${brand}`.trim(), imgs, Number(v.count));
      const endpoint = imgs.length ? (m.endsWith("/edit") ? m : `${m}/edit`) : m.replace(/\/edit$/, "");
      const data = await falRun(endpoint, {
        prompt: `${v.prompt}. ${brand}`.trim(),
        num_images: Number(v.count),
        aspect_ratio: v.aspect,
        ...(imgs.length ? { image_urls: imgs } : {}),
      });
      return save(falImages(data));
    }

    case "product-photo": {
      const imgs = await signedUploadUrls(files(v, "images"));
      const { provider, model: m } = await config("product-photo");
      const prompt = `Professional advertising product photo of the exact same product (keep its shape, label, logo and colors unchanged), ${moods[String(v.mood)] ?? ""}. ${v.extra ?? ""} ${brand}`.trim();
      if (provider === "google") return googleImages(m, prompt, imgs, Number(v.count));
      const data = await falRun(m, {
        prompt,
        image_urls: imgs,
        num_images: Number(v.count),
        aspect_ratio: v.aspect,
      });
      return save(falImages(data));
    }

    case "ad-design": {
      const count = Number(v.count);
      const ads = await aiJson<{ angle: string; headline: string; body: string; image_prompt: string }[]>(
        "أنت كاتب إعلانات خليجي محترف. اكتب إعلانات قصيرة مقنعة للسوشال ميديا.",
        `المنتج: ${v.product}\nالوصف: ${v.prompt}\nالجمهور: ${v.audience || "عام"}\nاللهجة: ${v.dialect}\n${brand}\n` +
        `اكتب ${count} إعلانات، كل واحد بزاوية تسويقية مختلفة. لكل إعلان: angle (اسم الزاوية)، headline (عنوان قصير)، body (نص الإعلان، 2-3 جمل)، image_prompt (وصف إنجليزي لصورة إعلانية بدون أي نص مكتوب داخل الصورة). أعد مصفوفة JSON.`,
      );
      const imgs = await signedUploadUrls(files(v, "images"));
      const { provider, model: m } = await config("ad-design");
      const out: OutFile[] = [];
      for (const ad of ads.slice(0, count)) {
        if (provider === "google") {
          const [file] = await googleImages(m, `${ad.image_prompt}. High-end social media advertising visual. ${brand}`, imgs, 1);
          out.push({ ...file, caption: `${ad.angle}\n\n${ad.headline}\n${ad.body}` });
          continue;
        }
        const data = await falRun(imgs.length ? (m.endsWith("/edit") ? m : `${m}/edit`) : m, {
          prompt: `${ad.image_prompt}. High-end social media advertising visual. ${brand}`,
          num_images: 1,
          aspect_ratio: v.aspect,
          ...(imgs.length ? { image_urls: imgs } : {}),
        });
        const [file] = await save(falImages(data));
        out.push({ ...file, caption: `${ad.angle}\n\n${ad.headline}\n${ad.body}` });
      }
      return out;
    }

    case "carousel": {
      const count = Number(v.slides);
      const slides = await aiJson<{ title: string; text: string; image_prompt: string }[]>(
        "أنت مصمم محتوى خليجي محترف لكاروسيل إنستغرام. كل شريحة فكرة وحدة واضحة، والشريحة الأولى خطّاف يشد القارئ، والأخيرة دعوة لاتخاذ إجراء.",
        `الموضوع: ${v.prompt}\nاللهجة: ${v.dialect}\n${brand}\n` +
        `اكتب ${count} شرائح بالترتيب. لكل شريحة: title (عنوان عربي قصير جداً، 2-6 كلمات)، text (سطر أو سطرين للكابشن)، image_prompt (وصف إنجليزي لتصميم الشريحة). أعد مصفوفة JSON.`,
      );
      const imgs = await signedUploadUrls(files(v, "images"));
      const { provider, model: m } = await config("carousel");
      const style = "Cohesive Instagram carousel series: same layout grid, same color palette, same typography style on every slide, clean modern design, generous margins.";
      const out: OutFile[] = [];
      for (const [i, s] of slides.slice(0, count).entries()) {
        const prompt = `Slide ${i + 1} of ${count}. ${s.image_prompt}. ${style} Render this exact Arabic headline, large, correctly spelled, right-to-left: «${s.title}». No other text. ${brand}`;
        if (provider === "google") {
          const [file] = await googleImages(m, prompt, imgs, 1);
          out.push({ ...file, caption: `${i + 1}. ${s.title}\n${s.text}` });
          continue;
        }
        const data = await falRun(imgs.length ? (m.endsWith("/edit") ? m : `${m}/edit`) : m, {
          prompt, num_images: 1, aspect_ratio: v.aspect, ...(imgs.length ? { image_urls: imgs } : {}),
        });
        const [file] = await save(falImages(data));
        out.push({ ...file, caption: `${i + 1}. ${s.title}\n${s.text}` });
      }
      return out;
    }

    case "motion-video":
      throw new Error("motion-video runs in the studio (/api/motion)");
    case "avatar-video": {
      // 1) voice with ElevenLabs  2) talking video from image + audio on fal
      const vv = await voiceById(String(v.voice));
      const audio = await tts(String(v.script), vv.eleven, vv.model, vv.settings);
      const audioPath = await saveResult(job.user_id, job.id, audio, "audio/mpeg", "mp3");
      const admin = createAdminClient();
      const { data: audioUrl } = await admin.storage.from("results").createSignedUrl(audioPath, 3600);
      const [img] = await signedUploadUrls(files(v, "images"));
      const reqId = await falQueue((await config("avatar-video")).model, {
        image_url: img,
        audio_url: audioUrl?.signedUrl,
        prompt: "Natural, friendly presenter talking to camera.",
      }, `${site()}/api/webhooks/fal?job=${job.id}&key=${process.env.WORKER_SECRET}`);
      await admin.from("jobs").update({ provider_request_id: reqId, status: "running" }).eq("id", job.id);
      return null;
    }

    case "video-editing":
      // Picked up by the video worker (see /worker). Stays "queued" until then.
      return null;

    case "voice": {
      const voice = await voiceById(String(v.voice));
      const { provider, model: vm } = await config("voice");
      if (provider === "google" && !v.clone) {
        const wav = await geminiSpeech(vm, String(v.text), voice.google);
        return [{ path: await saveResult(job.user_id, job.id, wav, "audio/wav", "wav"), type: "audio/wav" }];
      }
      let voiceId = voice.eleven;
      let cloned: string | null = null;
      if (v.clone) {
        const [sampleUrl] = await signedUploadUrls(files(v, "sample"));
        if (!sampleUrl) throw new Error("NO_SAMPLE");
        const sample = await (await fetch(sampleUrl)).blob();
        cloned = voiceId = await cloneVoice(`shaheen-${job.user_id.slice(0, 8)}-${job.id.slice(0, 6)}`, sample);
      }
      try {
        const vv = await voiceById(voiceId);
        const audio = await tts(String(v.text), voiceId, vv.model || (provider === "elevenlabs" && vm && vm !== "music" ? vm : undefined), vv.settings);
        return [{ path: await saveResult(job.user_id, job.id, audio, "audio/mpeg", "mp3"), type: "audio/mpeg" }];
      } finally {
        if (cloned) await deleteVoice(cloned); // we don't keep customers' voices
      }
    }

    case "nasheed": {
      const styles: Record<string, string> = {
        calm: "calm, spiritual Islamic nasheed",
        epic: "uplifting, powerful Islamic nasheed",
        hum: "soft background vocal humming, wordless",
        kids: "cheerful children's nasheed",
        ramadan: "warm Ramadan nasheed atmosphere",
      };
      const voices: Record<string, string> = { male: "male choir vocals", female: "female vocals", kids: "children's choir" };
      const prompt = `${styles[String(v.style)]}, ${voices[String(v.gender)]}, a cappella ONLY: human voices and vocal humming, absolutely no musical instruments, no drums, no percussion, no synths. Arabic lyrics: ${v.prompt}`;
      const audio = await music(prompt, Number(v.duration));
      return [{ path: await saveResult(job.user_id, job.id, audio, "audio/mpeg", "mp3"), type: "audio/mpeg" }];
    }
  }
  throw new Error(`unknown tool ${job.tool_id}`);
}
