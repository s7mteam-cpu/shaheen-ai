// «store» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "whip",
    "zoom",
    "flash",
    "slide"
  ],
  "grades": [
    "pop",
    "reels",
    "vivid"
  ],
  "captions": [
    "highlight",
    "pop",
    "outline"
  ],
  "titles": [
    "kinetic",
    "pill",
    "lower"
  ],
  "layouts": [
    "full",
    "dynamic",
    "corner"
  ],
  "boards": [
    "soft",
    "night",
    "dots"
  ],
  "illus": [
    "flat",
    "glass3d",
    "clay"
  ],
  "music": "upbeat catchy commercial pop",
  "tone": "مباشر وعروض واضحة",
  "ideas": [
    "الخصم offer",
    "السعر price",
    "العرض ينتهي countdown",
    "التوصيل delivery",
    "التقييم rating",
    "giftbox للعروض، shine{emoji المنتج}"
  ],
  "recipes": [
    {
      "name": "عرض خصم",
      "flow": "offer ← price ← countdown ← delivery ← arrow"
    },
    {
      "name": "منتج جديد",
      "flow": "text3d ← specs ← price ← rating ← arrow"
    },
    {
      "name": "آراء العملاء",
      "flow": "rating ← testimonial ← testimonial ← arrow"
    }
  ],
  "signature": [
    "price",
    "offer",
    "countdown",
    "delivery",
    "rating",
    "testimonial",
    "specs",
    "giftbox",
    "shine"
  ]
};
export default pack;
