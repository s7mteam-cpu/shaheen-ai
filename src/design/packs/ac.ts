// «ac» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
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
      "bg": "#0B1E3A",
      "ink": "#FFFFFF",
      "accent": "#38BDF8",
      "soft": "#12305A"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#111827",
      "accent": "#F97316",
      "soft": "#F3F4F6"
    },
    {
      "bg": "#F0FDF4",
      "ink": "#14532D",
      "accent": "#16A34A",
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
      "text": "ضمان"
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
    "snowflake",
    "wrench",
    "shield",
    "check",
    "clock",
    "star"
  ],
  "photo": [
    "air conditioner technician at work, clean modern home",
    "split AC unit cool air, bright",
    "friendly technician smiling, uniform"
  ],
  "recipes": [
    {
      "name": "عرض صيانة",
      "brief": "offer مع price"
    },
    {
      "name": "تنبيه الصيف",
      "brief": "classic بعنوان وتحذير"
    },
    {
      "name": "نصيحة توفير",
      "brief": "point بنصيحة"
    },
    {
      "name": "ضمان الخدمة",
      "brief": "bold مع sticker stamp"
    }
  ]
};
export default pack;
