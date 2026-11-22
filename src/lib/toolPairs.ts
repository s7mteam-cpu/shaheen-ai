/** One card per thing the customer wants ("بوست", "فيديو من موقعك"…). Inside it he picks HOW: ready templates, or a brand-new design («مبتكر»).
 *  Each way stays its own tool for the admin (own price, switch and models): the pairing is only how they are shown. */
export const FRESH_OF: Record<string, string> = { post: "free-post", carousel: "free-carousel", "ad-design": "free-ad", invitations: "free-invite", "business-cards": "free-card", presentations: "free-deck", cv: "free-cv", "motion-video": "free-motion", "site-video": "site-free" };
const TEMPLATE_OF: Record<string, string> = Object.fromEntries(Object.entries(FRESH_OF).map(([t, f]) => [f, t]));

/** the lists of tools: the «مبتكر» twin is not a card of its own while its templates tool is open */
export function mainTools<T extends { id: string }>(tools: T[]): T[] {
  const ids = new Set(tools.map((t) => t.id));
  return tools.filter((t) => !(TEMPLATE_OF[t.id] && ids.has(TEMPLATE_OF[t.id])));
}
/** both ways of this tool, when both are open */
export function pairOf<T extends { id: string }>(id: string, tools: T[]): { templates: T; fresh: T } | null {
  const tid = TEMPLATE_OF[id] ?? id, fid = FRESH_OF[tid];
  const templates = tools.find((t) => t.id === tid), fresh = tools.find((t) => t.id === fid);
  return templates && fresh ? { templates, fresh } : null;
}
