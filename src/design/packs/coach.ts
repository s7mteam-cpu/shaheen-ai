// «coach» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#111114",
      "ink": "#F5F2EA",
      "accent": "#E8B44C",
      "soft": "#1D1D22"
    },
    {
      "bg": "#F3ECE2",
      "ink": "#1E1B18",
      "accent": "#B4532F",
      "soft": "#FBF7F1"
    },
    {
      "bg": "#0B0B0F",
      "ink": "#FFFFFF",
      "accent": "#FF5A36",
      "soft": "#17171D"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#111111",
      "accent": "#111111",
      "soft": "#F2F2F2"
    },
    {
      "bg": "#1B2A41",
      "ink": "#FFFFFF",
      "accent": "#7FD1B9",
      "soft": "#243753"
    }
  ],
  "layouts": [
    "bold",
    "quote",
    "minimal",
    "classic",
    "cover"
  ],
  "decos": [
    "circles",
    "lines",
    "halftone"
  ],
  "frames": ["none", "corners", "double"],
  "stickers": [
    {
      "kind": "stamp",
      "text": "ورشة حضورية"
    },
    {
      "kind": "ribbon",
      "text": "مقاعد محدودة"
    },
    {
      "kind": "burst",
      "text": "جديد"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "target",
    "trophy",
    "rocket",
    "users",
    "mic",
    "calendar"
  ],
  "photo": [
    "confident coach speaking on stage, cinematic light",
    "confident coach speaking on stage, cinematic light, alternative angle, editorial composition",
    "lifestyle scene for a coach business in Kuwait, natural light, authentic"
  ],
  "recipes": [
    {
      "name": "إعلان عرض",
      "brief": "offer مع stat وsticker"
    },
    {
      "name": "تعريف بالخدمة",
      "brief": "classic أو bento بمزايا"
    },
    {
      "name": "رأي عميل",
      "brief": "quote مع person وsticker stars"
    }
  ]
};
export default pack;
