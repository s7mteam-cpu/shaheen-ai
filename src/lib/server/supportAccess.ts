import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const ACCESS_HOURS = 24;

export type Access = { id: string; reason: string; status: string; expires_at: string | null; created_at: string; signed_name: string | null; decided_at: string | null };

/** The customer's latest request, with "approved" turned into "expired" once its time is up. */
export async function latestAccess(userId: string): Promise<Access | null> {
  const { data, error } = await createAdminClient().from("support_access")
    .select("id,reason,status,expires_at,created_at,signed_name,decided_at").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  if (data.status === "approved" && data.expires_at && new Date(data.expires_at) < new Date()) return { ...data, status: "expired" };
  return data;
}

export const consentText = (name: string, reason: string) =>
  `أنا ${name}، أفوّض إدارة منصة شاهين بالدخول على حسابي والاطلاع على مشاريعي وبياناتي، لحل المشكلة التالية: «${reason}». أعرف إن بيانات الدفع والبطاقات وكلمة المرور محمية ومشفّرة وما تشملها هالصلاحية. هذا التفويض ينتهي تلقائياً بعد ${ACCESS_HOURS} ساعة، وأقدر ألغيه بأي وقت.`;
