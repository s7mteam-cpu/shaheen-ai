export const RESET_PHRASE = "صفّر المنصة";
export const RESET_PHRASE_EN = "RESET PLATFORM";
/** The confirmation words, in Arabic or English (English admins type the English phrase). */
export const isResetPhrase = (s: string) => s.trim() === RESET_PHRASE || s.trim().toUpperCase() === RESET_PHRASE_EN;

/** «تصفير كامل»: a different, longer phrase so it can't be typed by habit. */
export const FULL_PHRASE = "صفّر كل شيء";
export const FULL_PHRASE_EN = "RESET EVERYTHING";
export const isFullPhrase = (s: string) => s.trim() === FULL_PHRASE || s.trim().toUpperCase() === FULL_PHRASE_EN;
