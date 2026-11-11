// «cafe» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#EFE7DC",
      "ink": "#2B1D14",
      "accent": "#8B5A2B",
      "soft": "#FAF6F0"
    },
    {
      "bg": "#1C1714",
      "ink": "#F3E9DC",
      "accent": "#C8A27A",
      "soft": "#2A221D"
    },
    {
      "bg": "#2E5E4E",
      "ink": "#F5EFE6",
      "accent": "#E9C46A",
      "soft": "#386E5C"
    },
    {
      "bg": "#FAF3E0",
      "ink": "#3E2723",
      "accent": "#6D4C41",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#0E0E0E",
      "ink": "#F2E9DC",
      "accent": "#D4A373",
      "soft": "#1A1A1A"
    }
  ],
  "layouts": [
    "photo",
    "minimal",
    "split",
    "bento",
    "offer"
  ],
  "decos": [
    "arc",
    "leaves",
    "waves"
  ],
  "frames": [
    "rounded",
    "corners"
  ],
  "stickers": [
    {
      "kind": "stamp",
      "text": "محمّص يومياً"
    },
    {
      "kind": "tape",
      "text": "مشروب الموسم"
    },
    {
      "kind": "tag",
      "text": "جديد"
    }
  ],
  "fonts": [
    "Almarai",
    "Cairo"
  ],
  "icons": [
    "coffee",
    "cake",
    "leaf",
    "clock",
    "map-pin",
    "heart"
  ],
  "photo": [
    "latte art cup on wooden counter, morning window light",
    "cozy cafe corner with plants and pastries",
    "barista pouring coffee, shallow depth of field"
  ],
  "recipes": [
    {
      "name": "مشروب الموسم",
      "brief": "photo مع sticker tape"
    },
    {
      "name": "منيو قصير",
      "brief": "bento"
    },
    {
      "name": "ساعات العمل والموقع",
      "brief": "minimal مع meta"
    }
  ]
};
export default pack;
