// «store» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#FFFFFF",
      "ink": "#111827",
      "accent": "#2251CC",
      "soft": "#F3F5F9"
    },
    {
      "bg": "#111114",
      "ink": "#F5F2EA",
      "accent": "#FF5A36",
      "soft": "#1D1D22"
    },
    {
      "bg": "#FFF7ED",
      "ink": "#1C1917",
      "accent": "#F97316",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F5F3FF",
      "ink": "#1E1B4B",
      "accent": "#7C3AED",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#ECFDF5",
      "ink": "#052E16",
      "accent": "#16A34A",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "offer",
    "photo",
    "bento",
    "split",
    "classic"
  ],
  "decos": [
    "dots",
    "confetti",
    "halftone"
  ],
  "frames": ["none", "rounded", "dashed"],
  "stickers": [
    {
      "kind": "burst",
      "text": "خصم"
    },
    {
      "kind": "ribbon",
      "text": "توصيل مجاني"
    },
    {
      "kind": "tag",
      "text": "السعر"
    },
    {
      "kind": "stars",
      "text": "4.8"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "bag",
    "cart",
    "tag",
    "truck",
    "percent",
    "star"
  ],
  "photo": [
    "product hero shot on clean colored background",
    "product hero shot on clean colored background, alternative angle, editorial composition",
    "lifestyle scene for a store business in Kuwait, natural light, authentic"
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
