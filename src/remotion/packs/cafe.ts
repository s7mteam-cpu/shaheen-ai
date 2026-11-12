// «cafe» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "blur",
    "slide",
    "dip",
    "zoom"
  ],
  "grades": [
    "warm",
    "sunset",
    "luxury"
  ],
  "captions": [
    "minimal",
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
    "paper",
    "sunrise",
    "sketch"
  ],
  "illus": [
    "watercolor",
    "flat",
    "doodle"
  ],
  "music": "cozy lofi coffee shop music",
  "tone": "هادي وعصري",
  "ideas": [
    "مشروب الموسم scene",
    "المنيو menu",
    "ساعات العمل hours",
    "dish{emoji ☕} قهوة بخارها طالع"
  ],
  "recipes": [
    {
      "name": "مشروب الموسم",
      "flow": "scene ← headline ← price ← hours ← contact"
    },
    {
      "name": "منيو الكافيه",
      "flow": "menu ← rating ← contact"
    },
    {
      "name": "عرض الصباح",
      "flow": "headline ← offer ← countdown ← hours ← contact"
    }
  ],
  "signature": [
    "menu",
    "price",
    "hours",
    "rating",
    "offer",
    "countdown",
    "testimonial",
    "dish",
    "map"
  ]
};
export default pack;
