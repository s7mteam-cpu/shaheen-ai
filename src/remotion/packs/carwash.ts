// «carwash» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "whip",
    "zoom",
    "flash",
    "slide"
  ],
  "grades": [
    "pop",
    "reels",
    "cool"
  ],
  "captions": [
    "outline",
    "pop",
    "box"
  ],
  "titles": [
    "kinetic",
    "lower",
    "pill"
  ],
  "layouts": [
    "full",
    "dynamic",
    "corner"
  ],
  "boards": [
    "night",
    "blueprint",
    "soft"
  ],
  "illus": [
    "cinematic",
    "glass3d",
    "flat"
  ],
  "music": "energetic electronic beat",
  "tone": "لمعة ونظافة وعناية",
  "ideas": [
    "قبل وبعد beforeafter",
    "الباقات menu أو price",
    "الضمان icon shield",
    "shine{emoji 🚗} لمعة بعد التلميع"
  ],
  "recipes": [
    {
      "name": "تلميع نانو",
      "flow": "beforeafter ← specs ← price ← appointment ← contact"
    },
    {
      "name": "باقات الغسيل",
      "flow": "menu ← offer ← contact"
    },
    {
      "name": "عرض الأسبوع",
      "flow": "offer ← price ← countdown ← contact"
    }
  ],
  "signature": [
    "beforeafter",
    "price",
    "offer",
    "specs",
    "appointment",
    "rating",
    "shine",
    "map",
    "route"
  ]
};
export default pack;
