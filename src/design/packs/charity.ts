// «charity» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#FFF7ED",
      "ink": "#431407",
      "accent": "#C2410C",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#ECFDF5",
      "ink": "#064E3B",
      "accent": "#059669",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F0F9FF",
      "ink": "#0C4A6E",
      "accent": "#0284C7",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#1C1917",
      "ink": "#F5EFE6",
      "accent": "#E8B44C",
      "soft": "#292524"
    }
  ],
  "layouts": [
    "photo",
    "quote",
    "classic",
    "point",
    "minimal"
  ],
  "decos": [
    "dots",
    "waves",
    "lines"
  ],
  "frames": [
    "none",
    "rounded",
    "double"
  ],
  "stickers": [
    {
      "kind": "stamp",
      "text": "مرخّصة"
    },
    {
      "kind": "stars",
      "text": "أثر"
    },
    {
      "kind": "ribbon",
      "text": "حملة"
    }
  ],
  "fonts": [
    "Almarai",
    "Cairo"
  ],
  "icons": [
    "hand-heart",
    "heart",
    "shield",
    "calendar",
    "check",
    "star"
  ],
  "photo": [
    "volunteers helping community, warm authentic moments",
    "hands giving food boxes, soft light",
    "smiling child, hopeful, natural"
  ],
  "recipes": [
    {
      "name": "حملة تبرع",
      "brief": "classic مع stat للمبلغ"
    },
    {
      "name": "قصة أثر",
      "brief": "quote مع person"
    },
    {
      "name": "إنجاز الشهر",
      "brief": "point مع stat"
    },
    {
      "name": "كيف تتبرع",
      "brief": "minimal بخطوات"
    }
  ]
};
export default pack;
