/** «فيديو من موقعك»: 50 ready looks. Each one = device frame + background + camera move + entrance (transition) + text style + effect. */
export type SFrame = "device" | "device3d" | "card" | "bare" | "duo" | "bento" | "collage" | "type"; // device = phone (tall video) or browser window (wide video)
export type SBg = "dark" | "aurora" | "neon" | "light" | "pastel" | "spot" | "brand" | "stripes" | "dots" | "orbs" | "sunset" | "paper";
export type SCam = "scroll" | "zoom" | "focus" | "sway" | "parallax" | "orbit" | "push" | "punch";
export type SEnter = "up" | "left" | "pop" | "flip" | "blur" | "wipe" | "spin" | "drop" | "fade" | "iris" | "whip" | "flash" | "glitch" | "velocity";
export type STextS = "pill" | "kinetic" | "lower" | "big" | "outline" | "glass" | "torn";
export type SFx = "none" | "ripple" | "ring" | "glow" | "shine" | "cursor" | "callout" | "hand";
export type SiteLook = { frame: SFrame; bg: SBg; cam: SCam; enter: SEnter; text: STextS; fx: SFx; hook?: boolean };
export type SiteStyle = { id: string; name: string; group: string; frame: SFrame; bg: SBg; cam: SCam; enter: [SEnter, SEnter]; text: STextS; fx: SFx; hook?: boolean; alt?: SFrame };

export const SITE_GROUPS = ["فخم وهادئ", "جريء وحيوي", "تقني وعصري", "ناعم وودّي", "سينمائي", "جولة حيّة"] as const;

const r = (id: string, name: string, group: (typeof SITE_GROUPS)[number], frame: SFrame, bg: SBg, cam: SCam, enter: [SEnter, SEnter], text: STextS, fx: SFx, o: { hook?: boolean; alt?: SFrame } = {}): SiteStyle => ({ id, name, group, frame, bg, cam, enter, text, fx, ...o });
const [LUX, BOLD, TECH, SOFT, CINE, TOUR] = SITE_GROUPS;

export const SITE_STYLES: SiteStyle[] = [
  r("lux-gold", "ذهبي فاخر", LUX, "device", "dark", "push", ["fade", "up"], "lower", "shine"),
  r("midnight-glass", "زجاج منتصف الليل", LUX, "device3d", "dark", "orbit", ["fade", "blur"], "glass", "glow"),
  r("velvet", "مخمل", LUX, "card", "spot", "scroll", ["fade", "up"], "lower", "shine"),
  r("marble", "رخام أبيض", LUX, "device", "light", "zoom", ["fade", "wipe"], "big", "none"),
  r("champagne", "شمبانيا", LUX, "bare", "sunset", "push", ["fade", "iris"], "lower", "shine"),
  r("noir", "نوار أنيق", LUX, "device", "dark", "focus", ["blur", "fade"], "outline", "ring"),
  r("pearl", "لؤلؤ", LUX, "card", "pastel", "sway", ["fade", "pop"], "glass", "none"),
  r("onyx", "عقيق أسود", LUX, "device3d", "spot", "parallax", ["up", "fade"], "lower", "glow"),
  r("royal", "ملكي", LUX, "device", "brand", "scroll", ["wipe", "fade"], "pill", "shine"),
  r("ivory", "عاجي", LUX, "card", "paper", "zoom", ["fade", "up"], "big", "none"),

  r("pop-burst", "انفجار ألوان", BOLD, "device", "brand", "zoom", ["pop", "spin"], "big", "ripple"),
  r("neon-night", "ليل نيون", BOLD, "device3d", "neon", "orbit", ["flip", "pop"], "kinetic", "glow"),
  r("stripes-punch", "خطوط جريئة", BOLD, "card", "stripes", "focus", ["left", "pop"], "pill", "ring"),
  r("sunset-hype", "غروب حماسي", BOLD, "device", "sunset", "sway", ["drop", "pop"], "big", "ripple"),
  r("glitch-cut", "قطع سريع", BOLD, "bare", "dark", "zoom", ["pop", "wipe"], "kinetic", "ring"),
  r("sticker", "ستيكر", BOLD, "card", "dots", "sway", ["spin", "pop"], "pill", "none"),
  r("flash", "فلاش", BOLD, "device", "brand", "push", ["iris", "pop"], "big", "shine"),
  r("turbo", "تيربو", BOLD, "device3d", "stripes", "parallax", ["left", "wipe"], "kinetic", "ripple"),
  r("loud-orbs", "كرات مضيئة", BOLD, "device", "orbs", "focus", ["drop", "pop"], "big", "glow"),
  r("comic", "كوميك", BOLD, "card", "dots", "zoom", ["pop", "flip"], "outline", "ring"),

  r("aurora-saas", "شفق تقني", TECH, "device3d", "aurora", "orbit", ["up", "blur"], "glass", "glow"),
  r("grid-matrix", "شبكة رقمية", TECH, "device", "neon", "scroll", ["wipe", "left"], "kinetic", "ring"),
  r("blueprint-pro", "مخطط احترافي", TECH, "card", "dark", "focus", ["iris", "wipe"], "lower", "ring"),
  r("startup", "ستارت أب", TECH, "device", "aurora", "zoom", ["up", "fade"], "pill", "ripple"),
  r("holo", "هولوغرام", TECH, "device3d", "orbs", "sway", ["flip", "blur"], "glass", "shine"),
  r("terminal", "طرفية", TECH, "bare", "dark", "scroll", ["wipe", "left"], "outline", "ripple"),
  r("cloud", "سحابة", TECH, "device", "light", "parallax", ["up", "pop"], "pill", "glow"),
  r("saas-light", "منصة فاتحة", TECH, "card", "light", "focus", ["up", "fade"], "lower", "ring"),
  r("cyber", "سايبر", TECH, "device3d", "neon", "push", ["flip", "wipe"], "kinetic", "glow"),
  r("data-flow", "تدفق بيانات", TECH, "device", "dark", "parallax", ["left", "up"], "pill", "ripple"),

  r("pastel-pop", "باستيل مرح", SOFT, "card", "pastel", "sway", ["pop", "up"], "pill", "none"),
  r("cotton", "قطن", SOFT, "device", "pastel", "scroll", ["fade", "up"], "lower", "none"),
  r("bloom", "إزهار", SOFT, "device", "orbs", "zoom", ["blur", "fade"], "glass", "glow"),
  r("sunrise", "شروق", SOFT, "bare", "sunset", "scroll", ["fade", "up"], "lower", "none"),
  r("paper-craft", "ورق مقصوص", SOFT, "card", "paper", "sway", ["drop", "up"], "big", "none"),
  r("mint", "نعناع", SOFT, "device", "light", "zoom", ["pop", "fade"], "pill", "ring"),
  r("peach", "خوخ", SOFT, "device3d", "pastel", "orbit", ["up", "pop"], "glass", "shine"),
  r("cozy", "دافئ", SOFT, "card", "sunset", "push", ["fade", "drop"], "lower", "none"),
  r("daydream", "أحلام اليقظة", SOFT, "device", "aurora", "sway", ["blur", "up"], "glass", "none"),
  r("balloons", "بالونات", SOFT, "device", "dots", "focus", ["pop", "drop"], "pill", "ripple"),

  r("cine-zoom", "تقريب سينمائي", CINE, "bare", "dark", "push", ["fade", "iris"], "lower", "none"),
  r("trailer", "تريلر", CINE, "bare", "dark", "zoom", ["wipe", "fade"], "big", "shine"),
  r("documentary", "وثائقي", CINE, "card", "spot", "scroll", ["fade", "left"], "lower", "none"),
  r("film-grain", "فيلم كلاسيكي", CINE, "device", "spot", "focus", ["fade", "blur"], "outline", "none"),
  r("epic-orbit", "مدار ملحمي", CINE, "device3d", "spot", "orbit", ["iris", "fade"], "big", "glow"),
  r("neo-noir", "نيو نوار", CINE, "device", "dark", "sway", ["wipe", "blur"], "kinetic", "ring"),
  r("dolly", "عربة تصوير", CINE, "bare", "spot", "parallax", ["up", "fade"], "lower", "none"),
  r("reveal", "كشف", CINE, "device3d", "dark", "push", ["iris", "up"], "big", "shine"),
  r("dusk", "الغسق", CINE, "card", "sunset", "orbit", ["fade", "wipe"], "glass", "glow"),
  r("premiere", "عرض أول", CINE, "device", "brand", "push", ["iris", "wipe"], "big", "ripple"),
  // 2026 trends: cursor tours, elastic punch-ins, call-outs, hooks, bento reveals, hand-made notes, fast transitions, two screens, type breaks, collage
  r("tour-cursor", "جولة بالمؤشر", TOUR, "device", "light", "scroll", ["fade", "up"], "pill", "cursor", { hook: true }),
  r("tour-punch", "تقريب مطاطي", TOUR, "device", "dark", "punch", ["pop", "up"], "big", "callout"),
  r("tour-callout", "تظليل وشرح", TOUR, "card", "pastel", "scroll", ["up", "fade"], "glass", "callout"),
  r("hook-open", "افتتاحية قوية", TOUR, "device", "brand", "punch", ["flash", "pop"], "kinetic", "ripple", { hook: true }),
  r("bento-reveal", "كشف بينتو", TOUR, "bento", "aurora", "scroll", ["pop", "up"], "pill", "none"),
  r("lofi-notes", "مفكرة يدوية", TOUR, "card", "paper", "sway", ["drop", "up"], "torn", "hand"),
  r("beat-whip", "سحب بإيقاع", TOUR, "device", "dark", "push", ["whip", "flash"], "kinetic", "ring", { hook: true }),
  r("velocity-edit", "مونتاج السرعة", TOUR, "device3d", "neon", "scroll", ["velocity", "glitch"], "big", "glow"),
  r("duo-screens", "جوال وكمبيوتر", TOUR, "duo", "aurora", "scroll", ["fade", "up"], "glass", "shine"),
  r("type-break", "نص حركي بينهم", TOUR, "device", "spot", "zoom", ["up", "wipe"], "kinetic", "none", { alt: "type" }),
  r("collage-cut", "قص ولصق", TOUR, "collage", "paper", "sway", ["spin", "drop"], "torn", "none"),
  r("street-grunge", "شارع خشن", TOUR, "collage", "dots", "zoom", ["glitch", "pop"], "big", "hand", { hook: true }),
  r("glitch-tour", "تشويش وجولة", TOUR, "device", "neon", "scroll", ["glitch", "whip"], "pill", "cursor", { hook: true }),
  r("bento-mix", "بينتو ومؤشر", TOUR, "device", "light", "parallax", ["up", "pop"], "lower", "callout", { alt: "bento" }),
  r("cine-cursor", "مؤشر سينمائي", TOUR, "device3d", "spot", "punch", ["blur", "iris"], "lower", "cursor"),
  r("duo-mix", "شاشتين وتقريب", TOUR, "device", "dark", "punch", ["fade", "up"], "pill", "callout", { alt: "duo" }),
];

export const siteStyleById = (id: unknown) => SITE_STYLES.find((s) => s.id === id);

const FRAMES: SFrame[] = ["device", "device3d", "card", "bare", "duo", "bento", "collage", "type"];
const BGS: SBg[] = ["dark", "aurora", "neon", "light", "pastel", "spot", "brand", "stripes", "dots", "orbs", "sunset", "paper"];
const CAMS: SCam[] = ["scroll", "zoom", "focus", "sway", "parallax", "orbit", "push", "punch"];
const ENTERS: SEnter[] = ["up", "left", "pop", "flip", "blur", "wipe", "spin", "drop", "fade", "iris", "whip", "flash", "glitch", "velocity"];
const TEXTS: STextS[] = ["pill", "kinetic", "lower", "big", "outline", "glass", "torn"];
const FXS: SFx[] = ["none", "ripple", "ring", "glow", "shine", "cursor", "callout", "hand"];
const pickOf = <T extends string>(list: T[], v: unknown, d: T): T => (list.includes(v as T) ? (v as T) : d);

/** Checks a look that came from a saved video (never trust stored data). */
export function cleanLook(x: unknown): SiteLook {
  const o = (x ?? {}) as Record<string, unknown>;
  return { frame: pickOf(FRAMES, o.frame, "device"), bg: pickOf(BGS, o.bg, "dark"), cam: pickOf(CAMS, o.cam, "scroll"), enter: pickOf(ENTERS, o.enter, "up"), text: pickOf(TEXTS, o.text, "pill"), fx: pickOf(FXS, o.fx, "none"), ...(o.hook === true ? { hook: true } : {}) };
}

/** A look for scene number `i`: the style's frame, background, camera, text and effect stay the same; the entrance alternates so every scene arrives differently. */
export function lookFor(style: SiteStyle, i: number): SiteLook {
  const ex: SEnter[] = [style.enter[0], style.enter[1], ENTERS[(ENTERS.indexOf(style.enter[0]) + 3 + i) % ENTERS.length]];
  const frame = style.alt && i % 3 === 2 ? style.alt : style.frame; // some styles break the rhythm every third scene (a type break, a bento, two screens)
  return { frame, bg: style.bg, cam: style.cam, enter: ex[i % 3], text: style.text, fx: style.fx, ...(style.hook && i === 0 ? { hook: true } : {}) };
}

/** «تلقائي»: a style that fits the kind of site (found from its words), different each time within that mood. */
export function autoSiteStyle(text: string, seed = Math.random()): SiteStyle {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const group = has("saas", "software", "app", "platform", "api", "تطبيق", "برمج", "منصة", "ذكاء", "تقني", "سحابة") ? TECH
    : has("عقار", "شقق", "فيلا", "فندق", "مجوهر", "ذهب", "عطور", "عطر", "فاخر", "luxury", "real estate", "hotel", "jewel", "perfume") ? LUX
    : has("مطعم", "كافيه", "قهوة", "حلويات", "كيك", "أطفال", "روضة", "restaurant", "cafe", "bakery", "kids", "ورد", "هدايا") ? SOFT
    : has("عرض", "خصم", "تخفيض", "متجر", "تسوق", "sale", "shop", "store", "نادي", "رياضة", "gym") ? BOLD
    : null;
  const pool = group ? SITE_STYLES.filter((s) => s.group === group) : SITE_STYLES;
  return pool[Math.min(pool.length - 1, Math.floor(seed * pool.length))];
}
