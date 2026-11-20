// «flowers» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#FDF2F8",
      "ink": "#500724",
      "accent": "#DB2777",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F0FDF4",
      "ink": "#14532D",
      "accent": "#16A34A",
      "soft": "#FFFFFF"
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
      "accent": "#8B5CF6",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "photo",
    "bento",
    "offer",
    "minimal",
    "quote"
  ],
  "decos": [
    "blob",
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
      "kind": "ribbon",
      "text": "جديد"
    },
    {
      "kind": "tag",
      "text": "السعر"
    }
  ],
  "fonts": [
    "Tajawal",
    "Cairo"
  ],
  "icons": [
    "flower",
    "gift",
    "heart",
    "sparkles",
    "calendar",
    "star"
  ],
  "photo": [
    "fresh flower bouquet, soft pastel background",
    "gift box with ribbon, bright",
    "florist arranging flowers, warm light"
  ],
  "recipes": [
    {
      "name": "بوكيه اليوم",
      "brief": "photo بصورة وسعر price"
    },
    {
      "name": "مناسبة قريبة",
      "brief": "offer مع date"
    },
    {
      "name": "أفكار هدايا",
      "brief": "bento بـ4 أفكار"
    },
    {
      "name": "رأي عميل",
      "brief": "quote"
    }
  ]
};
export default pack;
