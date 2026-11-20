// «pharmacy» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#ECFDF5",
      "ink": "#064E3B",
      "accent": "#059669",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F0FDFA",
      "ink": "#134E4A",
      "accent": "#0D9488",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FFFFFF",
      "ink": "#111827",
      "accent": "#16A34A",
      "soft": "#F0FDF4"
    },
    {
      "bg": "#F8FAFC",
      "ink": "#0F172A",
      "accent": "#0284C7",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "classic",
    "bento",
    "offer",
    "point",
    "minimal"
  ],
  "decos": [
    "circles",
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
      "kind": "burst",
      "text": "خصم"
    },
    {
      "kind": "tag",
      "text": "السعر"
    }
  ],
  "fonts": [
    "Tajawal",
    "Cairo"
  ],
  "icons": [
    "pill",
    "shield",
    "heart-pulse",
    "check",
    "calendar",
    "star"
  ],
  "photo": [
    "clean bright pharmacy interior, pharmacist helping",
    "vitamins and supplements product flat lay, bright",
    "lifestyle healthy family scene, natural light"
  ],
  "recipes": [
    {
      "name": "عرض منتج",
      "brief": "offer مع price وsticker tag"
    },
    {
      "name": "تنبيه موسمي",
      "brief": "classic بعنوان واضح (برد، حساسية)"
    },
    {
      "name": "نصيحة صحية",
      "brief": "point بنصيحة مختصرة"
    },
    {
      "name": "منتج الأسبوع",
      "brief": "bento بمزايا"
    }
  ]
};
export default pack;
