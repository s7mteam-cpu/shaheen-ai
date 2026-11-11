// «travel» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#0C3B5E",
      "ink": "#FFFFFF",
      "accent": "#FDBA4D",
      "soft": "#11496F"
    },
    {
      "bg": "#FFF8EE",
      "ink": "#13293D",
      "accent": "#0EA5A4",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFF7ED",
      "ink": "#1E293B",
      "accent": "#F97316",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#ECFEFF",
      "ink": "#083344",
      "accent": "#06B6D4",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#1E1B4B",
      "ink": "#FFFFFF",
      "accent": "#FBBF24",
      "soft": "#2E2A6B"
    }
  ],
  "layouts": [
    "photo",
    "offer",
    "split",
    "bento",
    "classic"
  ],
  "decos": [
    "arc",
    "waves",
    "dots"
  ],
  "frames": ["none", "rounded", "corners"],
  "stickers": [
    {
      "kind": "ribbon",
      "text": "عرض محدود"
    },
    {
      "kind": "stamp",
      "text": "شامل الطيران"
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
    "plane",
    "globe",
    "map-pin",
    "calendar",
    "sun",
    "wallet"
  ],
  "photo": [
    "breathtaking travel destination, golden hour",
    "breathtaking travel destination, golden hour, alternative angle, editorial composition",
    "lifestyle scene for a travel business in Kuwait, natural light, authentic"
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
