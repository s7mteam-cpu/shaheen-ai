// «spa» design pack (posts, carousels, ads). Add palettes / layouts / stickers here and bump `version`.
import type { DesignPack } from "./types";

const pack: DesignPack = {
  "version": 1,
  "updated": "2026-11-20",
  "palettes": [
    {
      "bg": "#F5F1EC",
      "ink": "#2B2621",
      "accent": "#8A7B66",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#ECF3F0",
      "ink": "#1F2D28",
      "accent": "#5F8F7F",
      "soft": "#FFFFFF"
    },
    {
      "bg": "#1F1D1A",
      "ink": "#EDE6DA",
      "accent": "#C2A57B",
      "soft": "#2B2824"
    },
    {
      "bg": "#F8EFF1",
      "ink": "#3A2229",
      "accent": "#B7788A",
      "soft": "#FFFFFF"
    }
  ],
  "layouts": [
    "minimal",
    "photo",
    "split",
    "quote",
    "classic"
  ],
  "decos": [
    "arc",
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
      "text": "جديد"
    },
    {
      "kind": "ribbon",
      "text": "عرض"
    },
    {
      "kind": "stars",
      "text": "تقييم"
    }
  ],
  "fonts": [
    "Almarai",
    "Cairo"
  ],
  "icons": [
    "sparkles",
    "flower",
    "heart",
    "calendar",
    "leaf",
    "star"
  ],
  "photo": [
    "serene luxury spa interior, soft light",
    "massage hands and warm stones close up",
    "relaxed woman in towel, natural calm, Kuwait"
  ],
  "recipes": [
    {
      "name": "باقة استرخاء",
      "brief": "offer هادئ مع stat"
    },
    {
      "name": "فوائد المساج",
      "brief": "classic بنقاط قصيرة"
    },
    {
      "name": "عرض مناسبات",
      "brief": "minimal بعنوان وتاريخ"
    },
    {
      "name": "رأي زبونة",
      "brief": "quote مع stars"
    }
  ]
};
export default pack;
