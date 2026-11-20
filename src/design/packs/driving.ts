// «driving» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#0F172A",
      "ink": "#FFFFFF",
      "accent": "#FACC15",
      "soft": "#1E293B"
    },
    {
      "bg": "#F1F5F9",
      "ink": "#0F172A",
      "accent": "#2563EB",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#111827",
      "accent": "#DC2626",
      "soft": "#F3F4F6"
    },
    {
      "bg": "#ECFDF5",
      "ink": "#064E3B",
      "accent": "#10B981",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "bold",
    "classic",
    "point",
    "offer",
    "bento"
  ],
  "decos": [
    "lines",
    "dots",
    "circles"
  ],
  "frames": [
    "none",
    "rounded",
    "double"
  ],
  "stickers": [
    {
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "stamp",
      "text": "مرخّصة"
    },
    {
      "kind": "stars",
      "text": "نسبة النجاح"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "car",
    "check",
    "calendar",
    "shield",
    "star",
    "clock"
  ],
  "photo": [
    "driving instructor with student in a car, bright",
    "road scene sunny, steering wheel close up",
    "student happy with license, celebration"
  ],
  "recipes": [
    {
      "name": "باقات الدورات",
      "brief": "bold بسعر price وساعات"
    },
    {
      "name": "أخطاء الاختبار",
      "brief": "point بخطأ وطريقة تجنبه"
    },
    {
      "name": "نسبة النجاح",
      "brief": "classic مع stat"
    },
    {
      "name": "سجّل الحين",
      "brief": "offer مع date"
    }
  ]
};
export default pack;
