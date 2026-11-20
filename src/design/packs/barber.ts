// «barber» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#0F0F10",
      "ink": "#F5F2EA",
      "accent": "#D4AF37",
      "soft": "#1B1B1D"
    },
    {
      "bg": "#111827",
      "ink": "#FFFFFF",
      "accent": "#EF4444",
      "soft": "#1F2937"
    },
    {
      "bg": "#F4F1EC",
      "ink": "#1A1A1A",
      "accent": "#B45309",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#0B1220",
      "ink": "#E6EAF5",
      "accent": "#38BDF8",
      "soft": "#121A30"
    }
  ],
  "layouts": [
    "bold",
    "offer",
    "photo",
    "split",
    "minimal"
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
      "kind": "tag",
      "text": "السعر"
    },
    {
      "kind": "stamp",
      "text": "جديد"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "scissors",
    "sparkles",
    "star",
    "calendar",
    "check",
    "crown"
  ],
  "photo": [
    "modern barber shop interior, dark moody",
    "sharp fade haircut close up, studio light",
    "barber trimming beard, cinematic"
  ],
  "recipes": [
    {
      "name": "عرض قصة",
      "brief": "offer مع price وsticker burst"
    },
    {
      "name": "ستايل الأسبوع",
      "brief": "photo بصورة قصة"
    },
    {
      "name": "أوقات الدوام",
      "brief": "bold بجدول meta"
    },
    {
      "name": "باقة عريس",
      "brief": "split بمزايا"
    }
  ]
};
export default pack;
