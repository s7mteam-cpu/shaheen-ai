// «electronics» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#0B0F19",
      "ink": "#FFFFFF",
      "accent": "#3B82F6",
      "soft": "#141A2A"
    },
    {
      "bg": "#F4F6FA",
      "ink": "#0B0F19",
      "accent": "#6366F1",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0F172A",
      "accent": "#0EA5E9",
      "soft": "#F1F5F9"
    },
    {
      "bg": "#111827",
      "ink": "#F9FAFB",
      "accent": "#22C55E",
      "soft": "#1F2937"
    },
    {
      "bg": "#18181B",
      "ink": "#FAFAFA",
      "accent": "#F43F5E",
      "soft": "#27272A"
    }
  ],
  "layouts": [
    "bento",
    "split",
    "offer",
    "photo",
    "classic"
  ],
  "decos": [
    "grid",
    "halftone",
    "lines"
  ],
  "frames": ["none", "corners", "rounded"],
  "stickers": [
    {
      "kind": "burst",
      "text": "جديد"
    },
    {
      "kind": "stamp",
      "text": "ضمان سنة"
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
    "phone-mobile",
    "laptop",
    "headset",
    "shield",
    "truck",
    "tag"
  ],
  "photo": [
    "sleek gadget hero shot, dark background, rim lighting",
    "sleek gadget hero shot, dark background, rim lighting, alternative angle, editorial composition",
    "lifestyle scene for a electronics business in Kuwait, natural light, authentic"
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
