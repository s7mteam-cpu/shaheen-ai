// «laundry» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#EFF8FF",
      "ink": "#0B2540",
      "accent": "#0EA5E9",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F0FDFA",
      "ink": "#134E4A",
      "accent": "#14B8A6",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#111827",
      "accent": "#6366F1",
      "soft": "#EEF2FF"
    },
    {
      "bg": "#FFFBEB",
      "ink": "#451A03",
      "accent": "#F59E0B",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "classic",
    "offer",
    "bento",
    "point",
    "minimal"
  ],
  "decos": [
    "circles",
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
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "stamp",
      "text": "نظافة مضمونة"
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
    "sparkles",
    "droplet",
    "check",
    "clock",
    "truck",
    "star"
  ],
  "photo": [
    "fresh laundry folded neatly, bright",
    "washing machines clean laundromat, bright",
    "delivery of clean clothes at the door"
  ],
  "recipes": [
    {
      "name": "عرض غسيل",
      "brief": "offer مع price"
    },
    {
      "name": "توصيل مجاني",
      "brief": "classic مع sticker"
    },
    {
      "name": "نصيحة للأقمشة",
      "brief": "point بنصيحة"
    },
    {
      "name": "باقات شهرية",
      "brief": "bento بـ3 باقات"
    }
  ]
};
export default pack;
