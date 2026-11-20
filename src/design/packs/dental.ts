// «dental» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#F0F9FF",
      "ink": "#0B2A3F",
      "accent": "#0EA5E9",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#EAF7F4",
      "ink": "#0B2F2A",
      "accent": "#14B8A6",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0F172A",
      "accent": "#2563EB",
      "soft": "#F1F5F9"
    },
    {
      "bg": "#F5F3FF",
      "ink": "#1E1B4B",
      "accent": "#7C3AED",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "classic",
    "point",
    "quote",
    "bento",
    "offer"
  ],
  "decos": [
    "dots",
    "waves",
    "lines"
  ],
  "frames": [
    "none",
    "rounded",
    "double"
  ],
  "stickers": [
    {
      "kind": "stamp",
      "text": "مرخّص"
    },
    {
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "stars",
      "text": "تقييم المرضى"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "heart-pulse",
    "shield",
    "calendar",
    "sparkles",
    "check",
    "star"
  ],
  "photo": [
    "bright modern dental clinic, friendly dentist, calm",
    "smiling confident patient, natural light, authentic Kuwait",
    "clean minimal dental tools flat lay, soft light"
  ],
  "recipes": [
    {
      "name": "عرض تبييض",
      "brief": "offer مع stat للخصم وsticker burst"
    },
    {
      "name": "خرافة وحقيقة",
      "brief": "classic بعنوان سؤال وإجابة قصيرة"
    },
    {
      "name": "قبل وبعد",
      "brief": "split بصورة قبل وبعد"
    },
    {
      "name": "نصيحة أسبوعية",
      "brief": "point بنصيحة وحدة وأيقونة"
    },
    {
      "name": "رأي مريض",
      "brief": "quote مع person وstars"
    }
  ]
};
export default pack;
