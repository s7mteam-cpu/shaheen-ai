// «clinic» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "slide",
    "dip",
    "zoom",
    "whip"
  ],
  "grades": [
    "natural",
    "vivid",
    "cool"
  ],
  "captions": [
    "box",
    "highlight",
    "karaoke"
  ],
  "titles": [
    "editorial",
    "kinetic",
    "lower"
  ],
  "layouts": [
    "card",
    "split",
    "dynamic",
    "full"
  ],
  "boards": [
    "soft",
    "dots",
    "paper"
  ],
  "illus": [
    "corporate",
    "flat",
    "watercolor"
  ],
  "music": "calm reassuring ambient",
  "tone": "مطمّن وعلمي وبسيط، بدون تخويف",
  "ideas": [
    "خرافة وحقيقة truefalse",
    "خطوات العلاج steps",
    "الحجز appointment",
    "قبل وبعد beforeafter",
    "ecg نبض القلب للصحة"
  ],
  "recipes": [
    {
      "name": "نصيحة طبية",
      "flow": "headline سؤال ← truefalse ← checklist ← appointment ← contact"
    },
    {
      "name": "عرض العيادة",
      "flow": "offer ← price ← appointment ← contact"
    },
    {
      "name": "قبل وبعد",
      "flow": "beforeafter ← testimonial ← appointment"
    }
  ],
  "signature": [
    "checklist",
    "compare",
    "truefalse",
    "steps",
    "appointment",
    "beforeafter",
    "donut",
    "testimonial",
    "ecg"
  ]
};
export default pack;
