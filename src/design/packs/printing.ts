// «printing» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#FFFFFF",
      "ink": "#111827",
      "accent": "#EC4899",
      "soft": "#F3F4F6"
    },
    {
      "bg": "#0F172A",
      "ink": "#FFFFFF",
      "accent": "#22D3EE",
      "soft": "#1E293B"
    },
    {
      "bg": "#FFF7ED",
      "ink": "#431407",
      "accent": "#F97316",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F5F3FF",
      "ink": "#2E1065",
      "accent": "#7C3AED",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "bold",
    "bento",
    "offer",
    "classic",
    "split"
  ],
  "decos": [
    "geo",
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
      "kind": "ribbon",
      "text": "جديد"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "printer",
    "palette",
    "pen",
    "check",
    "star",
    "clock"
  ],
  "photo": [
    "print shop with colorful brochures and business cards",
    "hands holding printed business cards, vibrant",
    "large format banner printing"
  ],
  "recipes": [
    {
      "name": "عرض طباعة",
      "brief": "offer مع price"
    },
    {
      "name": "منتجاتنا",
      "brief": "bento بـ4 منتجات"
    },
    {
      "name": "مدة التسليم",
      "brief": "bold مع stat"
    },
    {
      "name": "نموذج عمل",
      "brief": "split بصورة"
    }
  ]
};
export default pack;
