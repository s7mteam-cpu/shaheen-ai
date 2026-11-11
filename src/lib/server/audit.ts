import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Records a sensitive admin action. Never throws: a failed log must not block the action itself. */
export async function audit(admin: { id: string; email?: string | null }, action: string, target?: { id?: string | null; email?: string | null }, note?: string) {
  await createAdminClient().from("admin_audit").insert({
    admin_id: admin.id, admin_email: admin.email ?? null, action,
    target_user: target?.id ?? null, target_email: target?.email ?? null, note: note ?? null,
  }).then(() => null, () => null);
}

export const AUDIT_AR: Record<string, string> = {
  credits_add: "إضافة رصيد", credits_sub: "خصم رصيد", delete_account: "حذف الحساب", delete_work: "حذف أعماله",
  block: "حظر البريد", unblock: "إلغاء الحظر", impersonate: "الدخول على حسابه", access_request: "طلب صلاحية دخول", suspend: "إيقاف", unsuspend: "إلغاء الإيقاف",
  make_admin: "جعله مديراً", remove_admin: "إزالة المدير",
};
