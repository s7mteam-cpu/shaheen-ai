// «tailor» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#F4EFEA",
      "ink": "#1F1A17",
      "accent": "#8A6E4B",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#14181F",
      "ink": "#EDE6DA",
      "accent": "#C9A27E",
      "soft": "#1F242C"
    },
    {
      "bg": "#F1F5F4",
      "ink": "#1B2A28",
      "accent": "#3F7F73",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FBF3F0",
      "ink": "#3A211C",
      "accent": "#B4533F",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "split",
    "minimal",
    "photo",
    "quote",
    "classic"
  ],
  "decos": [
    "none",
    "dots",
    "circles"
  ],
  "frames": [
    "none",
    "rounded",
    "double"
  ],
  "stickers": [
    {
      "kind": "stamp",
      "text": "تفصيل يدوي"
    },
    {
      "kind": "ribbon",
      "text": "جديد"
    },
    {
      "kind": "stars",
      "text": "تقييم"
    }
  ],
  "fonts": [
    "Amiri",
    "Cairo"
  ],
  "icons": [
    "shirt",
    "scissors",
    "star",
    "calendar",
    "check",
    "sparkles"
  ],
  "photo": [
    "elegant tailor atelier, fabrics and measuring tape",
    "fine stitching close up, warm light",
    "finished thobe on hanger, studio"
  ],
  "recipes": [
    {
      "name": "قماش جديد",
      "brief": "photo بصورة قماش وتفاصيل"
    },
    {
      "name": "مواعيد التفصيل",
      "brief": "classic بمدة التسليم date"
    },
    {
      "name": "قصة الحرفة",
      "brief": "quote بسطر وصاحب المحل person"
    },
    {
      "name": "عرض العيد",
      "brief": "offer هادئ"
    }
  ]
};
export default pack;
