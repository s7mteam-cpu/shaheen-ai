// «restaurant» pack. To release an update: add scenes / recipes / looks here and bump `version`.
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
    "pop",
    "vivid",
    "warm",
    "sunset"
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
    "night",
    "sunrise",
    "paper"
  ],
  "illus": [
    "cinematic",
    "flat",
    "gulf-cartoon"
  ],
  "music": "upbeat appetizing groove, warm funky bass",
  "tone": "شهي ومغري، يوصف الطعم والريحة",
  "ideas": [
    "الطبق scene أو لقطة قريبة",
    "العرض offer أو price",
    "التقييم rating",
    "التوصيل delivery",
    "الموقع والساعات contact و hours",
    "dish{emoji 🍖 أو 🍔 أو 🍕 حسب الطبق} بخار طالع من الطبق"
  ],
  "recipes": [
    {
      "name": "عرض اليوم",
      "flow": "headline ← scene الطبق ← price ← countdown ← delivery ← contact"
    },
    {
      "name": "المنيو",
      "flow": "headline ← menu ← menu ← rating ← contact"
    },
    {
      "name": "طبق جديد",
      "flow": "text3d ← scene ← checklist (المكونات) ← price ← arrow"
    },
    {
      "name": "آراء الزباين",
      "flow": "rating ← testimonial ← testimonial ← hours ← contact"
    }
  ],
  "signature": [
    "menu",
    "price",
    "offer",
    "rating",
    "delivery",
    "hours",
    "countdown",
    "dish"
  ]
};
export default pack;
