import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALWAYS_LOCKED, type SectionKey } from "@/lib/admin/sections";

/**
 * «كلمات السر»: one admin password (separate from the account password) that the owner puts on any admin
 * sections (his choice). «كلمات السر» itself is always locked once it exists. Typing it opens all locked
 * sections for 15 minutes (a signed httpOnly cookie tied to that admin). 5 wrong tries → blocked 15 minutes.
 * Stored as a salted scrypt hash in a server-only table.
 */
const KEY = "admin_lock";
const COOKIE = "sh_admin_unlock";
export const UNLOCK_MIN = 15;
const MAX_FAILS = 5, FAIL_WINDOW_MIN = 15;
export const MIN_LEN = 8;

export type Lock = { salt: string; hash: string; fails?: number[]; sections?: SectionKey[] };

const hashOf = (pw: string, salt: string) => scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
const sigKey = () => createHash("sha256").update(`${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}|admin-lock`).digest();
const sign = (s: string) => createHmac("sha256", sigKey()).update(s).digest("hex");

/** Read once per request. `missing` = the v65 SQL hasn't run yet. */
export const readLock = cache(async (): Promise<{ lock: Lock | null; missing: boolean }> => {
  const { data, error } = await createAdminClient().from("admin_secrets").select("value").eq("key", KEY).maybeSingle();
  return { lock: (data?.value as Lock) ?? null, missing: !!error };
});
async function writeLock(v: Lock) {
  const { error } = await createAdminClient().from("admin_secrets").upsert({ key: KEY, value: v, updated_at: new Date().toISOString() });
  return !error;
}

export const lockedSections = (lock: Lock | null): SectionKey[] => (lock ? [...new Set([...ALWAYS_LOCKED, ...(lock.sections ?? [])])] : []);

/** True when this section is locked and this admin hasn't typed the password in the last 15 minutes. */
export async function needsUnlock(userId: string, section: SectionKey) {
  const { lock, missing } = await readLock();
  if (missing) return false;
  if (!lock) return false; // no admin password set: nothing is locked
  if (!lockedSections(lock).includes(section)) return false;
  return !(await isUnlocked(userId));
}

export async function isUnlocked(userId: string) {
  const v = (await cookies()).get(COOKIE)?.value ?? "";
  const [uid, exp, sig] = v.split(".");
  if (!uid || !exp || !sig || uid !== userId || Number(exp) < Date.now()) return false;
  const want = Buffer.from(sign(`${uid}.${exp}`)), got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

async function setUnlockCookie(userId: string) {
  const exp = Date.now() + UNLOCK_MIN * 60_000;
  (await cookies()).set(COOKIE, `${userId}.${exp}.${sign(`${userId}.${exp}`)}`, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: UNLOCK_MIN * 60 });
}
export async function relock() { (await cookies()).delete(COOKIE); }

function check(lock: Lock, pw: string) {
  const want = Buffer.from(lock.hash, "hex"), got = Buffer.from(hashOf(pw, lock.salt), "hex");
  return want.length === got.length && timingSafeEqual(want, got);
}

export async function createPassword(userId: string, pw: string, sections: SectionKey[]) {
  const { lock } = await readLock();
  if (lock) return "exists";
  if (pw.length < MIN_LEN) return "short";
  const salt = randomBytes(16).toString("hex");
  if (!(await writeLock({ salt, hash: hashOf(pw, salt), fails: [], sections }))) return "error";
  await setUnlockCookie(userId);
  return "ok";
}

export async function unlock(userId: string, pw: string): Promise<"ok" | "wrong" | "blocked" | "unset"> {
  const { lock } = await readLock();
  if (!lock) return "unset";
  const now = Date.now();
  const fails = (lock.fails ?? []).filter((t) => now - t < FAIL_WINDOW_MIN * 60_000);
  if (fails.length >= MAX_FAILS) return "blocked";
  if (!check(lock, pw)) { await writeLock({ ...lock, fails: [...fails, now] }); return fails.length + 1 >= MAX_FAILS ? "blocked" : "wrong"; }
  await writeLock({ ...lock, fails: [] });
  await setUnlockCookie(userId);
  return "ok";
}

/** Changing the password or the locked sections needs the page to be open (checked by the caller). */
export async function updateLock(patch: { password?: string; sections?: SectionKey[] }) {
  const { lock } = await readLock();
  if (!lock) return "unset";
  if (patch.password !== undefined && patch.password.length < MIN_LEN) return "short";
  const next: Lock = { ...lock };
  if (patch.password !== undefined) { next.salt = randomBytes(16).toString("hex"); next.hash = hashOf(patch.password, next.salt); next.fails = []; }
  if (patch.sections) next.sections = patch.sections;
  return (await writeLock(next)) ? "ok" : "error";
}

export async function removeLock() {
  const { error } = await createAdminClient().from("admin_secrets").delete().eq("key", KEY);
  return !error;
}
