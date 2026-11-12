// «photography» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "dip",
    "blur",
    "slide",
    "zoom"
  ],
  "grades": [
    "luxury",
    "cinematic",
    "warm"
  ],
  "captions": [
    "minimal",
    "box"
  ],
  "titles": [
    "editorial",
    "typewriter",
    "lower"
  ],
  "layouts": [
    "full",
    "card"
  ],
  "boards": [
    "night",
    "paper",
    "soft"
  ],
  "illus": [
    "cinematic",
    "flat",
    "watercolor"
  ],
  "music": "artistic chill beat",
  "tone": "فني وبسيط",
  "ideas": [
    "قبل وبعد التعديل beforeafter",
    "الباقات menu",
    "shutter فلاش الكاميرا"
  ],
  "recipes": [
    {
      "name": "باقات التصوير",
      "flow": "scene ← menu ← price ← appointment ← contact"
    },
    {
      "name": "عرض جلسات",
      "flow": "offer ← menu ← countdown ← appointment"
    },
    {
      "name": "آراء",
      "flow": "rating ← testimonial ← contact"
    }
  ],
  "signature": [
    "beforeafter",
    "menu",
    "price",
    "appointment",
    "rating",
    "countdown",
    "shutter",
    "map"
  ]
};
export default pack;
