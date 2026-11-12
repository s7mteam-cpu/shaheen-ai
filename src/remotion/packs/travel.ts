// «travel» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "whip",
    "slide",
    "zoom",
    "dip"
  ],
  "grades": [
    "sunset",
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
    "sunrise",
    "night",
    "paper"
  ],
  "illus": [
    "cinematic",
    "watercolor",
    "terrain"
  ],
  "music": "uplifting travel vlog music",
  "tone": "حماسي وحالم",
  "ideas": [
    "الوجهة globe",
    "برنامج الرحلة timeline",
    "الشامل checklist",
    "flight{items[{label من},{label إلى}]}"
  ],
  "recipes": [
    {
      "name": "باكج رحلة",
      "flow": "scene ← globe ← timeline ← checklist ← price ← countdown ← contact"
    },
    {
      "name": "وجهة الموسم",
      "flow": "scene ← specs ← price ← contact"
    },
    {
      "name": "نصائح السفر",
      "flow": "headline ← checklist ← steps ← arrow"
    }
  ],
  "signature": [
    "globe",
    "timeline",
    "checklist",
    "price",
    "countdown",
    "specs",
    "flight",
    "route",
    "map"
  ]
};
export default pack;
