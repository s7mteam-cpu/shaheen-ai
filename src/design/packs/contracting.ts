// «contracting» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#1C1C1C",
      "ink": "#FFFFFF",
      "accent": "#F59E0B",
      "soft": "#2A2A2A"
    },
    {
      "bg": "#F5F3EF",
      "ink": "#1C1C1C",
      "accent": "#B45309",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#111827",
      "accent": "#F97316",
      "soft": "#F3F4F6"
    },
    {
      "bg": "#1E293B",
      "ink": "#FFFFFF",
      "accent": "#FACC15",
      "soft": "#273449"
    },
    {
      "bg": "#EFEBE4",
      "ink": "#292524",
      "accent": "#78716C",
      "soft": "#FAF8F5"
    }
  ],
  "layouts": [
    "bold",
    "split",
    "bento",
    "photo",
    "minimal"
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
      "text": "خبرة 15 سنة"
    },
    {
      "kind": "ribbon",
      "text": "مرخّص"
    },
    {
      "kind": "stars",
      "text": "مشاريعنا"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "building",
    "home",
    "shield",
    "award",
    "clock",
    "check"
  ],
  "photo": [
    "modern villa construction site with crane at golden hour",
    "modern villa construction site with crane at golden hour, alternative angle, editorial composition",
    "lifestyle scene for a contracting business in Kuwait, natural light, authentic"
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
