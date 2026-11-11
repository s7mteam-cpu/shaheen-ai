// «nutrition» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#F1F1EA",
      "ink": "#1F2A1F",
      "accent": "#4F6B3A",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFF8EC",
      "ink": "#1F2A1F",
      "accent": "#E07A2E",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#14532D",
      "accent": "#84CC16",
      "soft": "#F7FEE7"
    },
    {
      "bg": "#FFF7ED",
      "ink": "#431407",
      "accent": "#F97316",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#ECFEFF",
      "ink": "#134E4A",
      "accent": "#14B8A6",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "photo",
    "point",
    "bento",
    "offer",
    "split"
  ],
  "decos": [
    "blob",
    "leaves",
    "dots"
  ],
  "frames": ["none", "rounded", "dashed"],
  "stickers": [
    {
      "kind": "stamp",
      "text": "100% طبيعي"
    },
    {
      "kind": "burst",
      "text": "جديد"
    },
    {
      "kind": "tape",
      "text": "سعرات قليلة"
    }
  ],
  "fonts": [
    "Tajawal",
    "Cairo"
  ],
  "icons": [
    "leaf",
    "flame",
    "heart",
    "truck",
    "check",
    "calendar"
  ],
  "photo": [
    "fresh healthy meal bowl, vibrant vegetables, daylight",
    "fresh healthy meal bowl, vibrant vegetables, daylight, alternative angle, editorial composition",
    "lifestyle scene for a nutrition business in Kuwait, natural light, authentic"
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
