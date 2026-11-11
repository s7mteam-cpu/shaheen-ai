// «photography» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#111111",
      "ink": "#F5F5F5",
      "accent": "#E5E5E5",
      "soft": "#1C1C1C"
    },
    {
      "bg": "#F4F1EC",
      "ink": "#151515",
      "accent": "#9C6B3F",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0A0A0A",
      "accent": "#0A0A0A",
      "soft": "#F5F5F5"
    },
    {
      "bg": "#1C1C1E",
      "ink": "#F2F2F7",
      "accent": "#FF9F0A",
      "soft": "#2C2C2E"
    },
    {
      "bg": "#F2EFEA",
      "ink": "#262322",
      "accent": "#5E503F",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "minimal",
    "photo",
    "split",
    "bento",
    "quote"
  ],
  "decos": [
    "none",
    "lines",
    "circles"
  ],
  "frames": [
    "corners",
    "double"
  ],
  "stickers": [
    {
      "kind": "stamp",
      "text": "احترافي"
    },
    {
      "kind": "tape",
      "text": "جلسة تصوير"
    },
    {
      "kind": "burst",
      "text": "عرض"
    }
  ],
  "fonts": [
    "Almarai",
    "Cairo"
  ],
  "icons": [
    "camera",
    "image",
    "video",
    "sparkles",
    "calendar",
    "star"
  ],
  "photo": [
    "professional photographer with camera, cinematic",
    "professional photographer with camera, cinematic, alternative angle, editorial composition",
    "lifestyle scene for a photography business in Kuwait, natural light, authentic"
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
