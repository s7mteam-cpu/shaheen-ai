// «teacher» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 1,
  updated: "2026-11-11",
  "transitions": [
    "slide",
    "whip",
    "zoom",
    "dip"
  ],
  "grades": [
    "natural",
    "vivid"
  ],
  "captions": [
    "highlight",
    "karaoke",
    "box"
  ],
  "titles": [
    "kinetic",
    "marker",
    "typewriter",
    "editorial"
  ],
  "layouts": [
    "split",
    "dynamic",
    "circle",
    "card"
  ],
  "boards": [
    "chalk",
    "notebook",
    "grid",
    "pastel"
  ],
  "illus": [
    "doodle",
    "watercolor",
    "flat"
  ],
  "music": "gentle playful study music",
  "tone": "دافئ ومطمّن للأهالي، بسيط للطالب",
  "ideas": [
    "الحساب equation خطوة خطوة",
    "الكسور fraction",
    "الدوال plot",
    "الهندسة geometry",
    "كلمات اللغة vocab",
    "تمرين fillblank بالنهاية"
  ],
  "recipes": [
    {
      "name": "درس رياضيات",
      "flow": "headline سؤال ← equation ← fraction أو geometry ← fillblank ← burst"
    },
    {
      "name": "درس لغة",
      "flow": "vocab ← vocab ← quiz ← truefalse ← arrow"
    },
    {
      "name": "إعلان دروس خصوصية",
      "flow": "headline ← checklist (المواد) ← specs (المراحل) ← price ← appointment ← contact"
    }
  ],
  "signature": [
    "equation",
    "plot",
    "geometry",
    "fraction",
    "fillblank",
    "truefalse",
    "vocab",
    "quiz"
  ]
};
export default pack;
