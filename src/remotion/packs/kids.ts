// «kids» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "spin",
    "zoom",
    "whip",
    "slide"
  ],
  "grades": [
    "pop",
    "vivid"
  ],
  "captions": [
    "pop",
    "highlight"
  ],
  "titles": [
    "kinetic",
    "pill"
  ],
  "layouts": [
    "split",
    "dynamic",
    "circle",
    "card"
  ],
  "boards": [
    "pastel",
    "dots",
    "sunrise"
  ],
  "illus": [
    "clay",
    "watercolor",
    "gulf-cartoon"
  ],
  "music": "cheerful playful kids music, ukulele and xylophone",
  "tone": "مبهج ولطيف، جمل قصيرة جداً",
  "ideas": [
    "أيقونات كبيرة لكل كلمة",
    "احتفال confetti لما يجاوب صح",
    "أسئلة سهلة quiz",
    "giftbox للمفاجأة"
  ],
  "recipes": [
    {
      "name": "درس للأطفال",
      "flow": "scene ← icon ← counter ← quiz ← confetti"
    },
    {
      "name": "إعلان مخيم",
      "flow": "scene ← checklist ← specs ← price ← contact"
    },
    {
      "name": "تعلّم الأرقام",
      "flow": "counter ← dotgrid ← quiz ← confetti"
    }
  ],
  "signature": [
    "icon",
    "counter",
    "quiz",
    "confetti",
    "burst",
    "dotgrid",
    "truefalse",
    "giftbox",
    "map"
  ]
};
export default pack;
