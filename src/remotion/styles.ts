/** Illustration styles for AI-drawn scenes. The prompt is English for the image model; text is always added by us (never inside the picture). */
export type IllusStyle = "gulf-cartoon" | "doodle" | "neon" | "blueprint" | "glass3d" | "cinematic" | "corporate" | "glow" | "terrain" | "watercolor" | "flat" | "clay";

export const ILLUS_STYLES: [IllusStyle, string, string][] = [
  ["gulf-cartoon", "كرتون خليجي", "flat 2D cartoon illustration with bold clean outlines, Kuwaiti / Gulf characters in white dishdasha and ghutra or abaya, warm friendly colors, simple shading, like a modern Gulf animated series"],
  ["doodle", "دودل مرسوم باليد", "hand-drawn doodle sketch on off-white paper, black ink pen lines with light pencil shading and a few muted color fills, diary notebook style, playful"],
  ["neon", "ظل نيون", "dark night scene with a black silhouette figure and glowing neon lights, purple, pink and teal neon glow, synthwave mood, high contrast"],
  ["blueprint", "مخطط هندسي", "technical blueprint isometric illustration, white and light-blue line drawing on deep blue grid paper, cutaway engineering diagram, clean labels-free"],
  ["glass3d", "زجاج ثلاثي الأبعاد", "3D render of translucent frosted glass objects with glowing red and blue accents, isometric, dark background, futuristic, soft reflections"],
  ["cinematic", "فضاء سينمائي", "cinematic photoreal wide shot, dramatic lighting, deep space or epic landscape, film still, volumetric light, rich contrast"],
  ["corporate", "كرتون شركات", "corporate flat vector illustration, clean shapes, soft blue and orange palette, office and business icons, friendly explainer-video style"],
  ["glow", "عالم مضيء", "magical glowing 3D world, floating island, soft bloom light, vibrant purple and cyan, pixar-like render, dreamy"],
  ["terrain", "خريطة تضاريس", "dark 3D terrain relief map, glowing red highlighted region, top-down satellite style with contour shading, dramatic and minimal"],
  ["watercolor", "ألوان مائية", "soft watercolor painting, gentle washes, paper texture, warm natural palette, storybook illustration"],
  ["flat", "فلات بسيط", "minimal flat illustration, geometric shapes, limited palette, lots of negative space, modern editorial style"],
  ["clay", "صلصال / كلايميشن", "cute claymation 3D style, plasticine textures, soft studio light, rounded characters and props, stop-motion look"],
];
export const stylePrompt = (s?: string) => (ILLUS_STYLES.find((x) => x[0] === s) ?? ILLUS_STYLES[0])[2];
