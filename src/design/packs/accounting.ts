// «accounting» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#F1F5F9",
      "ink": "#0F172A",
      "accent": "#1D4ED8",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#0B1F33",
      "ink": "#FFFFFF",
      "accent": "#38BDF8",
      "soft": "#12304D"
    },
    {
      "bg": "#F5F3EE",
      "ink": "#1C1917",
      "accent": "#78350F",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#ECFDF5",
      "ink": "#064E3B",
      "accent": "#059669",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "classic",
    "point",
    "minimal",
    "bento",
    "quote"
  ],
  "decos": [
    "grid",
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
      "text": "معتمد"
    },
    {
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "tag",
      "text": "باقة"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "calculator",
    "coins",
    "shield",
    "calendar",
    "check",
    "chart"
  ],
  "photo": [
    "modern accounting office, documents and laptop",
    "hands with calculator and charts, calm",
    "professional meeting in Kuwait office"
  ],
  "recipes": [
    {
      "name": "تنبيه موعد",
      "brief": "classic بتاريخ date"
    },
    {
      "name": "نصيحة مالية",
      "brief": "point بنصيحة"
    },
    {
      "name": "باقة خدمات",
      "brief": "bento بخدمات"
    },
    {
      "name": "خطأ شائع",
      "brief": "minimal بعنوان قوي"
    }
  ]
};
export default pack;
