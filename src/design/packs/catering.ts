// «catering» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#FFF4E5",
      "ink": "#3B1D0B",
      "accent": "#D9480F",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#1C1410",
      "ink": "#F5EBDD",
      "accent": "#E8A33C",
      "soft": "#271B14"
    },
    {
      "bg": "#F6F1E7",
      "ink": "#2A2215",
      "accent": "#8A6A1F",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#FDEEEA",
      "ink": "#3B1512",
      "accent": "#C0392B",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "photo",
    "offer",
    "bento",
    "classic",
    "split"
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
      "kind": "burst",
      "text": "عرض"
    },
    {
      "kind": "tag",
      "text": "السعر"
    },
    {
      "kind": "ribbon",
      "text": "جديد"
    }
  ],
  "fonts": [
    "Tajawal",
    "Cairo"
  ],
  "icons": [
    "utensils",
    "gift",
    "calendar",
    "star",
    "heart",
    "check"
  ],
  "photo": [
    "homemade Gulf feast platters, rice and meat, warm light",
    "close up of rich dish steam, macro",
    "family table abundant, Kuwait"
  ],
  "recipes": [
    {
      "name": "منيو اليوم",
      "brief": "photo بصورة وسعر"
    },
    {
      "name": "باقات الولائم",
      "brief": "bento بـ3 باقات"
    },
    {
      "name": "طلب مسبق",
      "brief": "offer مع date"
    },
    {
      "name": "رأي زبون",
      "brief": "quote"
    }
  ]
};
export default pack;
