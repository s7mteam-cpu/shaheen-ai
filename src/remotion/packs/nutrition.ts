// «nutrition» pack. To release an update: add scenes / recipes / looks here and bump `version`.
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
    "paper",
    "dots"
  ],
  "illus": [
    "watercolor",
    "flat",
    "clay"
  ],
  "music": "fresh light acoustic pop",
  "tone": "صحي وخفيف ومحفّز",
  "ideas": [
    "السعرات bars",
    "النسب donut",
    "الخرافات truefalse",
    "منيو الاشتراك menu",
    "dish{emoji 🥗}، ring للهدف اليومي"
  ],
  "recipes": [
    {
      "name": "معلومة غذائية",
      "flow": "headline ← bars ← donut ← truefalse ← arrow"
    },
    {
      "name": "اشتراك وجبات",
      "flow": "menu ← price ← delivery ← contact"
    },
    {
      "name": "قبل وبعد",
      "flow": "beforeafter ← line ← testimonial ← contact"
    }
  ],
  "signature": [
    "bars",
    "donut",
    "compare",
    "checklist",
    "menu",
    "price",
    "truefalse",
    "dish",
    "ring"
  ]
};
export default pack;
