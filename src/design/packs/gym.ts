// «gym» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#0A0A0A",
      "ink": "#FFFFFF",
      "accent": "#C6FF00",
      "soft": "#161616"
    },
    {
      "bg": "#111827",
      "ink": "#FFFFFF",
      "accent": "#EF4444",
      "soft": "#1F2937"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0A0A0A",
      "accent": "#FF2E2E",
      "soft": "#F2F2F2"
    },
    {
      "bg": "#0F0F0F",
      "ink": "#FFFFFF",
      "accent": "#FF8A00",
      "soft": "#1A1A1A"
    },
    {
      "bg": "#1A1D2E",
      "ink": "#FFFFFF",
      "accent": "#00F5D4",
      "soft": "#242840"
    }
  ],
  "layouts": [
    "offer",
    "bold",
    "minimal",
    "photo",
    "split"
  ],
  "decos": [
    "lines",
    "halftone",
    "corner"
  ],
  "frames": ["none", "corners", "dashed"],
  "stickers": [
    {
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "ribbon",
      "text": "اشترك الحين"
    },
    {
      "kind": "stamp",
      "text": "مدرب شخصي"
    }
  ],
  "fonts": [
    "Changa",
    "Cairo"
  ],
  "icons": [
    "dumbbell",
    "flame",
    "trophy",
    "clock",
    "target",
    "heart"
  ],
  "photo": [
    "athlete training in a dark gym, dramatic rim light",
    "athlete training in a dark gym, dramatic rim light, alternative angle, editorial composition",
    "lifestyle scene for a gym business in Kuwait, natural light, authentic"
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
