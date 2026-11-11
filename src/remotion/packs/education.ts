// «education» pack. To release an update: add scenes / recipes / looks here and bump `version`.
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
    "notebook",
    "grid",
    "blueprint",
    "soft",
    "dots"
  ],
  "illus": [
    "corporate",
    "flat",
    "doodle",
    "blueprint"
  ],
  "music": "calm curious study music, light piano and plucks",
  "tone": "واضح ومرتّب، فكرة وحدة بكل مشهد",
  "ideas": [
    "المصطلحات definition مع marker",
    "الخطوات steps",
    "اختبار سريع quiz بالنهاية",
    "خريطة الموضوع mindmap بالبداية"
  ],
  "recipes": [
    {
      "name": "شرح درس",
      "flow": "headline سؤال ← definition ← steps ← compare ← quiz ← arrow"
    },
    {
      "name": "إعلان دورة",
      "flow": "headline ← checklist (وش بتتعلم) ← specs (المدة والأيام) ← price ← appointment ← contact"
    },
    {
      "name": "نتائج الطلاب",
      "flow": "headline ← counter ← bars ← testimonial ← arrow"
    },
    {
      "name": "خريطة منهج",
      "flow": "mindmap ← timeline ← table ← arrow"
    }
  ],
  "signature": [
    "definition",
    "steps",
    "quiz",
    "mindmap",
    "timeline",
    "table",
    "compare",
    "checklist"
  ]
};
export default pack;
