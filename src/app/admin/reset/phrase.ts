export const RESET_PHRASE = "صفّر المنصة";
export const RESET_PHRASE_EN = "RESET PLATFORM";
/** The confirmation words, in Arabic or English (English admins type the English phrase). */
export const isResetPhrase = (s: string) => s.trim() === RESET_PHRASE || s.trim().toUpperCase() === RESET_PHRASE_EN;
