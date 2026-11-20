// Drawing styles for AI pictures inside posts / carousels / ads. The prompt is English for the image model; the picture never contains text (we add text ourselves).
export const DESIGN_IMG_STYLES: readonly (readonly [string, string, string])[] = [
  ["photo", "واقعي (تصوير)", "Professional commercial photography, natural light, high detail"],
  ["luxury", "فاخر داكن", "Luxury editorial photography, dark moody studio lighting, gold highlights, shallow depth of field, premium magazine look"],
  ["flat", "فلات بسيط", "Minimal flat vector illustration, geometric shapes, limited harmonious palette, generous negative space, modern editorial style"],
  ["corporate", "رسم شركات", "Clean corporate flat vector illustration, soft blue and warm accent palette, friendly explainer-video style, simple shapes"],
  ["3d", "ثلاثي الأبعاد", "Glossy 3D render, soft rounded shapes, smooth clay-like materials with subtle gloss, soft studio lighting, professional product-render quality"],
  ["clay", "صلصال", "Cute claymation 3D style, plasticine textures, soft studio light, rounded props, stop-motion look"],
  ["watercolor", "ألوان مائية", "Soft watercolor painting, gentle washes, paper texture, warm natural palette, storybook illustration"],
  ["doodle", "رسم يدوي", "Hand-drawn doodle sketch on off-white paper, ink pen lines with light colour fills, notebook style, playful"],
  ["gulf-cartoon", "كرتون خليجي", "Flat 2D cartoon illustration with bold clean outlines, Gulf characters in white dishdasha and ghutra or abaya, warm friendly colours"],
  ["cinematic", "سينمائي", "Cinematic photoreal wide shot, dramatic lighting, film still, volumetric light, rich contrast"],
  ["neon", "نيون", "Dark night scene with glowing neon lights, purple, pink and teal glow, synthwave mood, high contrast"],
  ["glass3d", "زجاج", "3D render of translucent frosted glass objects with glowing accents, isometric, dark background, soft reflections"],
];
export const DEFAULT_IMG_STYLE = "photo";
export const imgStyleLabel = (id: string) => DESIGN_IMG_STYLES.find((x) => x[0] === id)?.[1] ?? "";
export const imgStylePrompt = (id?: string) => (DESIGN_IMG_STYLES.find((x) => x[0] === id) ?? DESIGN_IMG_STYLES[0])[2];
export const isImgStyle = (id: unknown): id is string => typeof id === "string" && DESIGN_IMG_STYLES.some((x) => x[0] === id);
