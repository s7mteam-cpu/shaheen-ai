import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanAgent, cleanTeam, type Agent, type TeamSettings } from "@/lib/agents";

/** «فريق كلّم شاهين»: the admin's team lives in site_content "chat_team"; a customer's own members live in the server-only table admin_secrets under his id. */
export async function getTeam(): Promise<TeamSettings> {
  try { const { data } = await createAdminClient().from("site_content").select("value").eq("key", "chat_team").maybeSingle(); return cleanTeam(data?.value); }
  catch { return cleanTeam(null); }
}
export async function saveTeam(t: TeamSettings) {
  await createAdminClient().from("site_content").upsert({ key: "chat_team", value: t, updated_at: new Date().toISOString() });
}
const mineKey = (uid: string) => `chat_agents:${uid}`;
export async function getMine(uid: string): Promise<Agent[]> {
  try {
    const { data } = await createAdminClient().from("admin_secrets").select("value").eq("key", mineKey(uid)).maybeSingle();
    const list = Array.isArray((data?.value as { agents?: unknown[] } | null)?.agents) ? (data!.value as { agents: unknown[] }).agents : [];
    return list.slice(0, 6).flatMap((a) => { const k = String((a as { key?: unknown })?.key ?? ""); const c = /^u_[a-z0-9]{4,12}$/.test(k) ? cleanAgent(a, k, true) : null; return c ? [c] : []; });
  } catch { return []; }
}
export async function saveMine(uid: string, agents: Agent[]) {
  const admin = createAdminClient();
  if (!agents.length) await admin.from("admin_secrets").delete().eq("key", mineKey(uid));
  else await admin.from("admin_secrets").upsert({ key: mineKey(uid), value: { agents }, updated_at: new Date().toISOString() });
}
