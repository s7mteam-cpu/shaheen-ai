// «realestate» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#0E2A2A",
      "ink": "#FFFFFF",
      "accent": "#C9A45C",
      "soft": "#15393A"
    },
    {
      "bg": "#F4F1EC",
      "ink": "#1A1A1A",
      "accent": "#8C6D3F",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0F172A",
      "accent": "#0E7490",
      "soft": "#F1F5F9"
    },
    {
      "bg": "#1A1A1A",
      "ink": "#F5F0E8",
      "accent": "#B08D57",
      "soft": "#242424"
    },
    {
      "bg": "#F7F4EF",
      "ink": "#1F2937",
      "accent": "#1E3A8A",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "split",
    "photo",
    "minimal",
    "bento",
    "offer"
  ],
  "decos": [
    "arc",
    "geo",
    "lines"
  ],
  "frames": [
    "corners",
    "double"
  ],
  "stickers": [
    {
      "kind": "ribbon",
      "text": "للبيع"
    },
    {
      "kind": "stamp",
      "text": "تملّك حر"
    },
    {
      "kind": "tag",
      "text": "السعر"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "home",
    "building",
    "map-pin",
    "wallet",
    "check",
    "phone"
  ],
  "photo": [
    "luxury modern home exterior or bright living room interior",
    "luxury modern home exterior or bright living room interior, alternative angle, editorial composition",
    "lifestyle scene for a realestate business in Kuwait, natural light, authentic"
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
