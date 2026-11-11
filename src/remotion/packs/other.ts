// «other» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 1,
  updated: "2026-11-11",
  "transitions": [
    "slide",
    "whip",
    "dip",
    "zoom"
  ],
  "grades": [
    "natural",
    "vivid",
    "cinematic"
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
    "full",
    "card",
    "dynamic"
  ],
  "boards": [
    "soft",
    "night",
    "paper"
  ],
  "illus": [
    "flat",
    "corporate",
    "gulf-cartoon"
  ],
  "music": "modern friendly corporate music",
  "tone": "احترافي وواضح",
  "ideas": [
    "الخدمات checklist",
    "الخطوات steps",
    "الأرقام counter"
  ],
  "recipes": [
    {
      "name": "تعريف بالنشاط",
      "flow": "headline ← checklist ← counter ← testimonial ← contact"
    },
    {
      "name": "عرض",
      "flow": "offer ← price ← countdown ← contact"
    },
    {
      "name": "أسئلة شائعة",
      "flow": "headline ← truefalse ← checklist ← contact"
    }
  ],
  "signature": [
    "steps",
    "checklist",
    "counter",
    "testimonial",
    "price",
    "offer"
  ]
};
export default pack;
