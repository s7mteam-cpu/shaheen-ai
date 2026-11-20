// «vet» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#FFF7ED",
      "ink": "#431407",
      "accent": "#EA580C",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#F0FDF4",
      "ink": "#14532D",
      "accent": "#16A34A",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#EFF6FF",
      "ink": "#1E3A8A",
      "accent": "#3B82F6",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FDF2F8",
      "ink": "#500724",
      "accent": "#DB2777",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "photo",
    "classic",
    "bento",
    "offer",
    "quote"
  ],
  "decos": [
    "blob",
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
      "kind": "ribbon",
      "text": "جديد"
    },
    {
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "stars",
      "text": "محبوب"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "paw",
    "heart",
    "shield",
    "calendar",
    "sparkles",
    "check"
  ],
  "photo": [
    "happy cat and dog with a gentle vet",
    "cute pet portrait close up, warm light",
    "pet owner hugging pet, lifestyle, Kuwait"
  ],
  "recipes": [
    {
      "name": "تذكير تطعيم",
      "brief": "classic بعنوان وتاريخ date"
    },
    {
      "name": "نصيحة للحيوان",
      "brief": "point بنصيحة وأيقونة paw"
    },
    {
      "name": "حيوان الأسبوع",
      "brief": "photo بصورة وقصة قصيرة"
    },
    {
      "name": "عرض فحص",
      "brief": "offer مع price"
    }
  ]
};
export default pack;
