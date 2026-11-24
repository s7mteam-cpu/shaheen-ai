"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/auth";
import { cleanAgent, cleanTeam, type Agent } from "@/lib/agents";
import { getTeam, saveTeam } from "@/lib/server/chatTeam";

async function guard() { const u = await requireAdmin("ai"); if (!u) throw new Error("غير مصرّح"); }
const pickFields = (f: FormData) => ({
  name: f.get("name"), nameEn: f.get("nameEn"), role: f.get("role"), roleEn: f.get("roleEn"), color: f.get("color"), line: f.get("line"), hello: f.get("hello"), focus: f.get("focus"),
  starters: String(f.get("starters") ?? "").split("\n"), open: f.get("open"), talk: f.get("talk") === "on", look: { cloth: f.get("cloth"), face: f.get("face"), prop: f.get("prop") },
});

/** لوحة الإدارة ← فريق «كلّم شاهين»: save one member (an existing key) or add a new one (no key). What the admin writes in «تخصصه» goes to the model as that member's instructions. */
export async function saveStaff(form: FormData) {
  await guard();
  const team = await getTeam();
  const key0 = String(form.get("key") ?? "");
  const key = team.agents.some((a) => a.key === key0) ? key0 : `s${Date.now().toString(36)}`;
  const a = cleanAgent(pickFields(form), key);
  if (!a) return;
  const at = team.agents.findIndex((x) => x.key === key);
  const agents = at >= 0 ? team.agents.map((x, i) => (i === at ? a : x)) : [...team.agents, a].slice(0, 12);
  await saveTeam({ ...team, agents });
  revalidatePath("/admin/ai/staff");
}
export async function removeStaff(form: FormData) {
  await guard();
  const team = await getTeam();
  const agents = team.agents.filter((a) => a.key !== String(form.get("key") ?? ""));
  if (!agents.length) return; // the office is never left empty
  await saveTeam({ ...team, agents });
  revalidatePath("/admin/ai/staff");
}
/** move a member one place up or down (the first one is the head of the office when the team is odd) */
export async function moveStaff(form: FormData) {
  await guard();
  const team = await getTeam();
  const i = team.agents.findIndex((a) => a.key === String(form.get("key") ?? "")), j = i + (form.get("dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= team.agents.length) return;
  const agents: Agent[] = [...team.agents]; [agents[i], agents[j]] = [agents[j], agents[i]];
  await saveTeam({ ...team, agents });
  revalidatePath("/admin/ai/staff");
}
export async function saveStaffSettings(form: FormData) {
  await guard();
  const team = await getTeam();
  await saveTeam(cleanTeam({ agents: team.agents, allowCustom: form.get("allowCustom") === "on", maxCustom: Number(form.get("maxCustom")), membersOnly: form.get("membersOnly") === "on", busyLines: String(form.get("busyLines") ?? "").split("\n") }));
  revalidatePath("/admin/ai/staff");
}
