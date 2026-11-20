// «carrental» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#0F0F10",
      "ink": "#F5F2EA",
      "accent": "#E11D2E",
      "soft": "#1B1B1D"
    },
    {
      "bg": "#F2F2F2",
      "ink": "#111111",
      "accent": "#2563EB",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#0B1220",
      "ink": "#FFFFFF",
      "accent": "#38BDF8",
      "soft": "#121A30"
    },
    {
      "bg": "#F5F3EE",
      "ink": "#1C1917",
      "accent": "#B45309",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "photo",
    "split",
    "offer",
    "bold",
    "minimal"
  ],
  "decos": [
    "none",
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
      "kind": "stamp",
      "text": "جديد"
    }
  ],
  "fonts": [
    "Cairo",
    "Tajawal"
  ],
  "icons": [
    "car",
    "key",
    "check",
    "calendar",
    "star",
    "clock"
  ],
  "photo": [
    "sleek modern car, clean showroom, studio light",
    "car driving on coastal road, sunset, Kuwait",
    "car interior close up, premium"
  ],
  "recipes": [
    {
      "name": "سيارة اليوم",
      "brief": "photo بصورة وسعر price"
    },
    {
      "name": "عرض أسبوعي",
      "brief": "offer مع stat"
    },
    {
      "name": "مواصفات",
      "brief": "split بـ items"
    },
    {
      "name": "شروط التأجير",
      "brief": "minimal بنقاط"
    }
  ]
};
export default pack;
