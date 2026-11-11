// «law» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "slide",
    "whip",
    "dip",
    "zoom"
  ],
  "grades": [
    "cinematic",
    "natural"
  ],
  "captions": [
    "box",
    "minimal"
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
    "paper",
    "night",
    "soft"
  ],
  "illus": [
    "flat",
    "corporate",
    "doodle"
  ],
  "music": "serious calm corporate",
  "tone": "رصين وواضح",
  "ideas": [
    "حقوقك checklist",
    "الإجراءات steps",
    "معلومة غلط truefalse",
    "scales{items[{label},{label}]} ميزان العدالة"
  ],
  "recipes": [
    {
      "name": "معلومة قانونية",
      "flow": "headline سؤال ← truefalse ← steps ← appointment ← contact"
    },
    {
      "name": "خطوات القضية",
      "flow": "timeline ← steps ← appointment ← contact"
    },
    {
      "name": "حقوقك",
      "flow": "headline ← checklist ← quote ← contact"
    }
  ],
  "signature": [
    "checklist",
    "steps",
    "compare",
    "truefalse",
    "quote",
    "appointment",
    "scales"
  ]
};
export default pack;
