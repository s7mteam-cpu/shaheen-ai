// «tech» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#0B1020",
      "ink": "#E6EAF5",
      "accent": "#22D3EE",
      "soft": "#121A33"
    },
    {
      "bg": "#F7F8FC",
      "ink": "#0B1020",
      "accent": "#4F46E5",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#0F0F1A",
      "ink": "#E6E6F0",
      "accent": "#A855F7",
      "soft": "#1A1A2E"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0B1020",
      "accent": "#10B981",
      "soft": "#F0FDF4"
    },
    {
      "bg": "#EEF2FF",
      "ink": "#1E1B4B",
      "accent": "#4F46E5",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "bento",
    "minimal",
    "point",
    "split",
    "cover"
  ],
  "decos": [
    "grid",
    "dots",
    "circles"
  ],
  "frames": ["none", "corners", "rounded"],
  "stickers": [
    {
      "kind": "ribbon",
      "text": "إطلاق"
    },
    {
      "kind": "stamp",
      "text": "آمن"
    },
    {
      "kind": "burst",
      "text": "جديد"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "laptop",
    "globe",
    "rocket",
    "shield",
    "zap",
    "chart"
  ],
  "photo": [
    "modern office team working on laptops, clean light",
    "modern office team working on laptops, clean light, alternative angle, editorial composition",
    "lifestyle scene for a tech business in Kuwait, natural light, authentic"
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
