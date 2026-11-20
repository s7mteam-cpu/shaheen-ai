// «moving» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#0F172A",
      "ink": "#FFFFFF",
      "accent": "#F59E0B",
      "soft": "#1E293B"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#111827",
      "accent": "#E11D48",
      "soft": "#F3F4F6"
    },
    {
      "bg": "#F0F9FF",
      "ink": "#0C4A6E",
      "accent": "#0284C7",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F5F5F4",
      "ink": "#1C1917",
      "accent": "#EA580C",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "bold",
    "offer",
    "classic",
    "bento",
    "point"
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
      "text": "مضمون"
    },
    {
      "kind": "tag",
      "text": "السعر"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "truck",
    "check",
    "shield",
    "calendar",
    "clock",
    "star"
  ],
  "photo": [
    "moving truck and movers carrying boxes, bright",
    "packed boxes in living room, tidy",
    "happy family in new home"
  ],
  "recipes": [
    {
      "name": "عرض نقل",
      "brief": "offer مع price"
    },
    {
      "name": "نصيحة التغليف",
      "brief": "point بنصيحة"
    },
    {
      "name": "خطوات الطلب",
      "brief": "bold بخطوات"
    },
    {
      "name": "رأي عميل",
      "brief": "classic بـ stars"
    }
  ]
};
export default pack;
