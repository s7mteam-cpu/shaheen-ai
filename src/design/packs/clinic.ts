// «clinic» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-12",
  "palettes": [
    {
      "bg": "#EAF4F2",
      "ink": "#0F2D2A",
      "accent": "#0F8B7E",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F2F6FC",
      "ink": "#0D2240",
      "accent": "#2563EB",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#0F172A",
      "accent": "#0EA5E9",
      "soft": "#F0F9FF"
    },
    {
      "bg": "#F5F3FF",
      "ink": "#1E1B4B",
      "accent": "#6366F1",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#ECFDF5",
      "ink": "#064E3B",
      "accent": "#10B981",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "classic",
    "point",
    "quote",
    "bento",
    "offer"
  ],
  "decos": [
    "dots",
    "waves",
    "circles"
  ],
  "frames": ["none", "rounded", "double"],
  "stickers": [
    {
      "kind": "stamp",
      "text": "مرخّص"
    },
    {
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "stars",
      "text": "تقييم المرضى"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "stethoscope",
    "pill",
    "shield",
    "calendar",
    "heart",
    "check"
  ],
  "photo": [
    "clean bright modern clinic, friendly doctor",
    "clean bright modern clinic, friendly doctor, alternative angle, editorial composition",
    "lifestyle scene for a clinic business in Kuwait, natural light, authentic"
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
