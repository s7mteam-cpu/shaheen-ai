// «tires» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#121212",
      "ink": "#FFFFFF",
      "accent": "#FFC400",
      "soft": "#1E1E1E"
    },
    {
      "bg": "#F2F2F2",
      "ink": "#111111",
      "accent": "#E11D2E",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#1F2937",
      "ink": "#FFFFFF",
      "accent": "#F59E0B",
      "soft": "#273548"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0F172A",
      "accent": "#16A34A",
      "soft": "#F1F5F9"
    },
    {
      "bg": "#0A0A0A",
      "ink": "#FFFFFF",
      "accent": "#FF3B30",
      "soft": "#171717"
    }
  ],
  "layouts": [
    "offer",
    "bold",
    "classic",
    "bento",
    "point"
  ],
  "decos": [
    "lines",
    "halftone",
    "grid"
  ],
  "frames": ["none", "corners", "dashed"],
  "stickers": [
    {
      "kind": "burst",
      "text": "خصم"
    },
    {
      "kind": "stamp",
      "text": "ضمان"
    },
    {
      "kind": "ribbon",
      "text": "خدمة 24 ساعة"
    }
  ],
  "fonts": [
    "Changa",
    "Cairo"
  ],
  "icons": [
    "car",
    "shield",
    "clock",
    "truck",
    "tag",
    "check"
  ],
  "photo": [
    "new car tires in a clean modern garage, dramatic light",
    "new car tires in a clean modern garage, dramatic light, alternative angle, editorial composition",
    "lifestyle scene for a tires business in Kuwait, natural light, authentic"
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
