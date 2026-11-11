// «cleaning» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#EEF7FF",
      "ink": "#0B2540",
      "accent": "#0EA5E9",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F2FBF5",
      "ink": "#0E2A1B",
      "accent": "#16A34A",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0C4A6E",
      "accent": "#38BDF8",
      "soft": "#F0F9FF"
    },
    {
      "bg": "#F0FDF4",
      "ink": "#14532D",
      "accent": "#22C55E",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FDF4FF",
      "ink": "#4A044E",
      "accent": "#C026D3",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "classic",
    "offer",
    "bento",
    "split",
    "photo"
  ],
  "decos": [
    "dots",
    "sparkle",
    "waves"
  ],
  "frames": ["none", "rounded", "dashed"],
  "stickers": [
    {
      "kind": "stamp",
      "text": "تعقيم"
    },
    {
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "stars",
      "text": "تقييم"
    }
  ],
  "fonts": [
    "Tajawal",
    "Cairo"
  ],
  "icons": [
    "sparkles",
    "home",
    "droplet",
    "shield",
    "clock",
    "check"
  ],
  "photo": [
    "spotless bright home interior, fresh and clean",
    "spotless bright home interior, fresh and clean, alternative angle, editorial composition",
    "lifestyle scene for a cleaning business in Kuwait, natural light, authentic"
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
