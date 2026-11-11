// «restaurant» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#111114",
      "ink": "#F5F2EA",
      "accent": "#E8B44C",
      "soft": "#1D1D22"
    },
    {
      "bg": "#F6EFE6",
      "ink": "#2A1A12",
      "accent": "#C2410C",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#7A1E12",
      "ink": "#FFF6EA",
      "accent": "#FFC857",
      "soft": "#8E2A1C"
    },
    {
      "bg": "#1F1B16",
      "ink": "#FFF4E0",
      "accent": "#E76F51",
      "soft": "#2B251F"
    },
    {
      "bg": "#FFFBF2",
      "ink": "#2B1A10",
      "accent": "#2A9D8F",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "photo",
    "offer",
    "split",
    "bento",
    "classic"
  ],
  "decos": [
    "waves",
    "halftone",
    "corner"
  ],
  "frames": ["none", "rounded", "corners"],
  "stickers": [
    {
      "kind": "burst",
      "text": "جديد"
    },
    {
      "kind": "stamp",
      "text": "طازج يومياً"
    },
    {
      "kind": "tag",
      "text": "العرض"
    },
    {
      "kind": "stars",
      "text": "4.9"
    }
  ],
  "fonts": [
    "Tajawal",
    "Cairo"
  ],
  "icons": [
    "utensils",
    "chef",
    "flame",
    "truck",
    "star",
    "map-pin"
  ],
  "photo": [
    "dark moody food close-up with steam, dramatic side light",
    "top-down flat lay of dishes on a rustic table",
    "bright fresh restaurant interior with happy guests"
  ],
  "recipes": [
    {
      "name": "عرض اليوم",
      "brief": "offer مع stat الخصم، sticker burst «جديد»"
    },
    {
      "name": "طبق جديد",
      "brief": "photo بطبق قريب، sticker stamp «طازج»"
    },
    {
      "name": "المنيو",
      "brief": "bento بأصناف وأسعار"
    }
  ]
};
export default pack;
