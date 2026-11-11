// «abaya» pack. To release an update: add scenes / recipes / looks here and bump `version`.
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
    "paper",
    "soft",
    "night"
  ],
  "illus": [
    "watercolor",
    "flat",
    "cinematic"
  ],
  "music": "chic fashion runway beat",
  "tone": "أنيق وفخم، يوصف القماش والتفصيل",
  "ideas": [
    "تفاصيل القماش specs",
    "الكمية المحدودة countdown",
    "shine{emoji 👗} للتشكيلة"
  ],
  "recipes": [
    {
      "name": "تشكيلة جديدة",
      "flow": "scene ← specs ← price ← countdown ← contact"
    },
    {
      "name": "عرض محدود",
      "flow": "offer ← countdown ← delivery ← contact"
    },
    {
      "name": "آراء العميلات",
      "flow": "rating ← testimonial ← contact"
    }
  ],
  "signature": [
    "price",
    "offer",
    "specs",
    "countdown",
    "delivery",
    "rating",
    "shine"
  ]
};
export default pack;
