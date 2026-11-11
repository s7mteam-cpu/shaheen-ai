// «sweets» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "whip",
    "zoom",
    "slide",
    "flash"
  ],
  "grades": [
    "sunset",
    "pop",
    "warm"
  ],
  "captions": [
    "outline",
    "pop",
    "highlight"
  ],
  "titles": [
    "kinetic",
    "pill",
    "lower",
    "marker"
  ],
  "layouts": [
    "full",
    "dynamic",
    "corner"
  ],
  "boards": [
    "pastel",
    "paper",
    "sunrise"
  ],
  "illus": [
    "watercolor",
    "clay",
    "flat"
  ],
  "music": "sweet light pop music, bells",
  "tone": "حلو ولطيف ومناسبات",
  "ideas": [
    "بوكس المناسبات menu",
    "الطلب المسبق appointment",
    "التوصيل delivery",
    "giftbox لبوكسات المناسبات، dish{emoji 🍰}"
  ],
  "recipes": [
    {
      "name": "بوكس العيد",
      "flow": "scene ← menu ← price ← appointment ← delivery ← contact"
    },
    {
      "name": "عرض محدود",
      "flow": "offer ← countdown ← contact"
    },
    {
      "name": "آراء الزباين",
      "flow": "rating ← testimonial ← menu ← contact"
    }
  ],
  "signature": [
    "menu",
    "price",
    "offer",
    "countdown",
    "appointment",
    "delivery",
    "giftbox",
    "dish"
  ]
};
export default pack;
