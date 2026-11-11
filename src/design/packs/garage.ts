// «garage» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#0F172A",
      "ink": "#FFFFFF",
      "accent": "#F97316",
      "soft": "#1E293B"
    },
    {
      "bg": "#F1F5F9",
      "ink": "#0F172A",
      "accent": "#2563EB",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#111827",
      "ink": "#F9FAFB",
      "accent": "#22D3EE",
      "soft": "#1F2937"
    },
    {
      "bg": "#FFF7ED",
      "ink": "#1C1917",
      "accent": "#EA580C",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#18181B",
      "ink": "#FAFAFA",
      "accent": "#EAB308",
      "soft": "#27272A"
    }
  ],
  "layouts": [
    "bold",
    "classic",
    "bento",
    "offer",
    "photo"
  ],
  "decos": [
    "grid",
    "lines",
    "corner"
  ],
  "frames": ["none", "corners", "double"],
  "stickers": [
    {
      "kind": "stamp",
      "text": "فحص شامل"
    },
    {
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "stars",
      "text": "موثوق"
    }
  ],
  "fonts": [
    "Changa",
    "Cairo"
  ],
  "icons": [
    "car",
    "shield",
    "check",
    "clock",
    "award",
    "phone"
  ],
  "photo": [
    "mechanic servicing a car in a professional workshop",
    "mechanic servicing a car in a professional workshop, alternative angle, editorial composition",
    "lifestyle scene for a garage business in Kuwait, natural light, authentic"
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
