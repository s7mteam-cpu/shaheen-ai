// «other» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#F3ECE2",
      "ink": "#1E1B18",
      "accent": "#B4532F",
      "soft": "#FBF7F1"
    },
    {
      "bg": "#0B2A4A",
      "ink": "#FFFFFF",
      "accent": "#C9A45C",
      "soft": "#12385F"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#111827",
      "accent": "#2563EB",
      "soft": "#F3F4F6"
    },
    {
      "bg": "#111114",
      "ink": "#F5F2EA",
      "accent": "#E8B44C",
      "soft": "#1D1D22"
    },
    {
      "bg": "#F0FDF4",
      "ink": "#14532D",
      "accent": "#16A34A",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "classic",
    "bold",
    "bento",
    "photo",
    "split"
  ],
  "decos": [
    "circles",
    "dots",
    "arc"
  ],
  "frames": ["none", "rounded", "corners"],
  "stickers": [
    {
      "kind": "burst",
      "text": "جديد"
    },
    {
      "kind": "ribbon",
      "text": "عرض"
    },
    {
      "kind": "stamp",
      "text": "موثوق"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "sparkles",
    "check",
    "star",
    "phone",
    "map-pin",
    "heart"
  ],
  "photo": [
    "professional photo that fits the business",
    "professional photo that fits the business, alternative angle, editorial composition",
    "lifestyle scene for a other business in Kuwait, natural light, authentic"
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
