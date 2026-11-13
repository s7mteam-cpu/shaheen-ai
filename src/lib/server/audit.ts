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
  admin_lock_set: "وضع كلمة سر الإدارة", admin_lock_changed: "تغيير كلمة سر الإدارة", admin_lock_sections: "تعديل الأقسام المقفولة", admin_lock_removed: "إزالة كلمة سر الإدارة", backup_download: "تنزيل نسخة البيانات", sheets_linked: "ربط ملف Google Sheets", platform_full_reset: "تصفير كامل للمنصة", sheets_unlinked: "إيقاف ربط Google Sheets", sheets_sync: "مزامنة Google Sheets يدوياً", platform_reset: "تصفير المنصة",
  partner_add: "إضافة شريك", partner_edit: "تعديل نسبة شريك", partner_withdrawal: "سحب شريك", partner_capital: "إيداع شريك", partner_move_deleted: "حذف حركة شريك", employee_add: "إضافة موظف", employee_edit: "تعديل موظف", employee_pay: "دفعة لموظف", period_closed: "إقفال دورة محاسبية", period_reopened: "إعادة فتح دورة محاسبية",
  credits_add: "إضافة رصيد", credits_sub: "خصم رصيد", delete_account: "حذف الحساب", delete_work: "حذف أعماله",
  block: "حظر البريد", unblock: "إلغاء الحظر", impersonate: "الدخول على حسابه", access_request: "طلب صلاحية دخول", suspend: "إيقاف", unsuspend: "إلغاء الإيقاف",
  cancel_sub: "إلغاء الاشتراك", resume_sub: "إرجاع التجديد", make_admin: "جعله مديراً", team_perms: "تعديل صلاحيات الفريق", remove_admin: "إزالة المدير",
};
