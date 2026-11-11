// «carwash» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#0B1E3A",
      "ink": "#FFFFFF",
      "accent": "#38BDF8",
      "soft": "#12305A"
    },
    {
      "bg": "#F0F7FF",
      "ink": "#0B1E3A",
      "accent": "#0EA5E9",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#082F49",
      "ink": "#F0F9FF",
      "accent": "#22D3EE",
      "soft": "#0C4A6E"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0F172A",
      "accent": "#7C3AED",
      "soft": "#F5F3FF"
    },
    {
      "bg": "#0B0B0B",
      "ink": "#FFFFFF",
      "accent": "#00E0A4",
      "soft": "#161616"
    }
  ],
  "layouts": [
    "offer",
    "split",
    "photo",
    "bento",
    "classic"
  ],
  "decos": [
    "dots",
    "waves",
    "sparkle"
  ],
  "frames": ["none", "rounded", "corners"],
  "stickers": [
    {
      "kind": "burst",
      "text": "لمعة"
    },
    {
      "kind": "stamp",
      "text": "نانو سيراميك"
    },
    {
      "kind": "ribbon",
      "text": "عرض"
    }
  ],
  "fonts": [
    "Changa",
    "Cairo"
  ],
  "icons": [
    "car",
    "droplet",
    "sparkles",
    "shield",
    "clock",
    "tag"
  ],
  "photo": [
    "glossy clean car with water droplets, studio light",
    "glossy clean car with water droplets, studio light, alternative angle, editorial composition",
    "lifestyle scene for a carwash business in Kuwait, natural light, authentic"
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
