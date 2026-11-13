import "server-only";
import { newBook, styledSheet, kwDate, dayDate, FMT } from "@/lib/server/xlsx";
import { AUDIT_AR } from "@/lib/server/audit";
import { CATEGORY, PAY_KIND } from "@/lib/server/finance";
import { PRICE_FIELDS } from "@/lib/server/priceHistory";
import { countryOf } from "@/lib/countries";

/** The readable Excel inside «تنزيل البيانات» (the JSON files next to it are for restoring). */
type Row = Record<string, unknown>;
const GOLD_TAB = "FFC9A45C";
const s = (v: unknown) => (v == null ? "" : String(v));
const REASON: Record<string, string> = { subscription: "اشتراك", renewal_reset: "تصفير الرصيد عند التجديد", spend: "استخدام", refund: "استرجاع", admin: "تعديل إداري", referral: "دعوة" };
const STATUS: Record<string, string> = { done: "ناجح", failed: "فاشل", running: "قيد التنفيذ", queued: "بالانتظار" };
const CLOSE: Record<string, string> = { self: "حذفه العميل بنفسه", admin: "حذفته الإدارة", banned: "محظور" };
const LEAD: Record<string, string> = { new: "جديد", contacted: "تم التواصل", won: "تم الاتفاق", closed: "مغلق" };
const CHARGE_KIND: Record<string, string> = { subscribe: "اشتراك جديد", renew: "تجديد", managed: "خدمة الإدارة الكاملة" };
const SUB: Record<string, string> = { active: "نشط", canceled: "ملغي", past_due: "متأخر الدفع", expired: "منتهي", trialing: "تجربة", incomplete: "غير مكتمل", paused: "موقوف مؤقتاً" };
const EVENT: Record<string, string> = { login: "تسجيل دخول", login_failed: "محاولة دخول بكلمة مرور خاطئة", password: "تغيير كلمة المرور", violation: "محتوى مخالف مُنع", brand_reset: "إعادة ضبط الهوية" };
/** Tap statuses → Arabic + colour. */
export function chargeState(st: unknown): [string, string] {
  const v = s(st).toUpperCase();
  if (v === "CAPTURED") return ["✓ ناجحة", "FF2E7D32"];
  if (["INITIATED", "IN_PROGRESS", "PENDING"].includes(v)) return ["لم تكتمل", "FFB26A00"];
  return [`✗ فاشلة (${v || "؟"})`, "FFC62828"];
}

/** The data workbook as a file (for «تنزيل البيانات»). */
export async function backupWorkbook(t: Record<string, Row[]>) {
  return Buffer.from(await (await backupBook(t)).xlsx.writeBuffer());
}

/** The data workbook itself (also mirrored to Google Sheets). */
export async function backupBook(t: Record<string, Row[]>) {
  const wb = newBook();
  const people = new Map((t.profiles ?? []).map((p) => [s(p.id), p]));
  const who = (id: unknown) => { const p = people.get(s(id)); return p ? s(p.full_name) || s(p.email) : "—"; };
  const plan = (id: unknown) => s((t.plans ?? []).find((p) => p.id === id)?.name) || (id ? s(id) : "—");
  const tool = (id: unknown) => s((t.tools ?? []).find((x) => x.id === id)?.name) || s(id);
  const blocked = new Set((t.blocked_emails ?? []).map((b) => s(b.email).toLowerCase()));
  const sortDesc = (rows: Row[], k: string) => [...rows].sort((a, b) => s(b[k]).localeCompare(s(a[k])));
  const auth = new Map((t.auth_users ?? []).map((u) => [s(u.id), u]));
  const brand = new Map((t.brand_kits ?? []).map((b) => [s(b.user_id), b]));
  const paidKwd = new Map<string, number>();
  for (const c of t.tap_charges ?? []) if (s(c.status).toUpperCase() === "CAPTURED" && c.currency === "KWD") paidKwd.set(s(c.user_id), (paidKwd.get(s(c.user_id)) ?? 0) + Number(c.amount ?? 0));
  const METHOD: Record<string, string> = { email: "بريد وكلمة مرور", google: "Google" };
  /** Payment methods in Arabic (Tap's codes and the manual ones). */
  const PAYM: Record<string, string> = { knet: "كي نت", KNET: "كي نت", card: "بطاقة", VISA: "فيزا", MASTERCARD: "ماستركارد", MADA: "مدى", AMEX: "أمريكان إكسبريس", APPLE_PAY: "Apple Pay", apple_pay: "Apple Pay", applepay: "Apple Pay", cash: "نقداً", transfer: "تحويل بنكي", bank: "تحويل بنكي", benefit: "بنفت", BENEFIT: "بنفت", other: "أخرى" };
  const paym = (v: unknown) => (s(v) ? PAYM[s(v)] ?? s(v) : "—");
  const rate = Number(((t.site_content ?? []).find((c) => c.key === "finance")?.value as { usd_kwd?: number } | undefined)?.usd_kwd ?? 0.307);
  const kwdOf = (a: unknown, c: unknown) => (c === "KWD" ? Number(a ?? 0) : Number(a ?? 0) * rate);
  /** «🇰🇼 الكويت»: the customer's country (the same label in every sheet, so the dashboard can group by it). */
  const ctryOf = (id: unknown) => { const p = people.get(s(id)); return p?.country ? `${countryOf(s(p.country)).flag} ${countryOf(s(p.country)).ar}` : "—"; };

  // 0) overview: live formulas over the other sheets
  const ov = styledSheet(wb, "نظرة عامة", { title: "شاهين: نظرة عامة على البيانات", columns: [
    { header: "المؤشر", key: "k", width: 38 }, { header: "القيمة", key: "v", width: 20, align: "center" }, { header: "المصدر", key: "src", width: 26 },
  ] });
  const OV: [string, string, string, string?][] = [
    ["عدد العملاء", "=COUNTA('العملاء'!B4:B100000)", "ورقة العملاء", FMT.num],
    ["العملاء النشطون", "=COUNTIF('العملاء'!F4:F100000,\"نشط\")", "ورقة العملاء", FMT.num],
    ["العملاء الموقوفون أو المحظورون", "=COUNTIF('العملاء'!F4:F100000,\"موقوف\")+COUNTIF('العملاء'!F4:F100000,\"محظور\")", "ورقة العملاء", FMT.num],
    ["اشتراكات نشطة", "=COUNTIF('الاشتراكات'!C4:C100000,\"نشط\")", "ورقة الاشتراكات", FMT.num],
    ["مجموع المدفوعات بالدينار", "=SUMIFS('المدفوعات'!E4:E100000,'المدفوعات'!F4:F100000,\"د.ك\")", "ورقة المدفوعات", FMT.kd],
    ["دفعات ناجحة", "=COUNTIF('محاولات الدفع'!H4:H100000,\"✓ ناجحة\")", "ورقة محاولات الدفع", FMT.num],
    ["دفعات فاشلة", "=COUNTIF('محاولات الدفع'!H4:H100000,\"✗*\")", "ورقة محاولات الدفع", FMT.num],
    ["دفعات لم يُكملها العميل", "=COUNTIF('محاولات الدفع'!H4:H100000,\"لم تكتمل\")", "ورقة محاولات الدفع", FMT.num],
    ["عدد الأعمال (الطلبات)", "=COUNT('الطلبات'!A4:A100000)", "ورقة الطلبات", FMT.num],
    ["أعمال فاشلة", "=COUNTIF('الطلبات'!E4:E100000,\"فاشل\")", "ورقة الطلبات", FMT.num],
    ["الريش المصروفة", "=SUM('الطلبات'!F4:F100000)", "ورقة الطلبات", FMT.num],
    ["تكلفة مزوّدي الذكاء الاصطناعي ($)", "=SUM('الطلبات'!J4:J100000)", "ورقة الطلبات", FMT.usd],
    ["طلبات تواصل جديدة", "=COUNTIF('طلبات التواصل'!E4:E100000,\"جديد\")", "ورقة طلبات التواصل", FMT.num],
    ["حسابات مغلقة", "=COUNT('الحسابات المغلقة'!A4:A100000)", "ورقة الحسابات المغلقة", FMT.num],
    ["محاولات دخول فاشلة", "=COUNTIF('الدخول والأمان'!C4:C100000,\"محاولة دخول بكلمة مرور خاطئة\")", "ورقة الدخول والأمان", FMT.num],
    ["محتوى مخالف مُنع", "=COUNTIF('الدخول والأمان'!C4:C100000,\"محتوى مخالف مُنع\")", "ورقة الدخول والأمان", FMT.num],
  ];
  for (const [k, f, src, fmt] of OV) { const r = ov.add({ k, src }); r.getCell("v").value = { formula: f.slice(1) }; if (fmt) r.getCell("v").numFmt = fmt; r.getCell("v").font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0B2A4A" } }; }
  ov.finish();

  // 1) customers
  const users = (t.profiles ?? []).filter((p) => p.role === "user");
  const lastLogin = new Map<string, string>();
  for (const ev of t.user_events ?? []) if (ev.kind === "login" && s(ev.created_at) > (lastLogin.get(s(ev.user_id)) ?? "")) lastLogin.set(s(ev.user_id), s(ev.created_at));
  const c = styledSheet(wb, "العملاء", { title: `العملاء (${users.length})`, columns: [
    { header: "الاسم", key: "n", width: 24 }, { header: "البريد", key: "e", width: 30, align: "left" }, { header: "الهاتف", key: "p", width: 18, align: "left" },
    { header: "الباقة", key: "plan", width: 16, align: "center" }, { header: "الرصيد (ريشة)", key: "cr", width: 14, fmt: FMT.num }, { header: "الحالة", key: "st", width: 14, align: "center" },
    { header: "تاريخ التسجيل", key: "d", width: 16, fmt: FMT.date }, { header: "آخر دخول", key: "ll", width: 18, fmt: FMT.datetime },
    { header: "طريقة التسجيل", key: "m", width: 15, align: "center" }, { header: "البريد مؤكَّد؟", key: "conf", width: 13, align: "center" },
    { header: "النشاط التجاري", key: "biz", width: 22 }, { header: "إنستغرام", key: "ig", width: 20, align: "left" }, { header: "الموقع", key: "web", width: 24, align: "left" },
    { header: "الداعي", key: "ref", width: 20 }, { header: "إجمالي المدفوع", key: "paid", width: 16, fmt: FMT.kd },
    { header: "الدولة", key: "ctry", width: 14, align: "center" },
  ] });
  for (const p of sortDesc(users, "created_at")) c.add({
    ll: kwDate(s(auth.get(s(p.id))?.last_sign_in_at) || lastLogin.get(s(p.id))),
    m: METHOD[s(auth.get(s(p.id))?.provider)] ?? (s(auth.get(s(p.id))?.provider) || "—"), conf: auth.get(s(p.id))?.email_confirmed_at ? "نعم" : "لا",
    biz: s(brand.get(s(p.id))?.business_name) || "—", ig: s(brand.get(s(p.id))?.instagram || p.instagram) || "—", web: s(brand.get(s(p.id))?.website) || "—",
    ref: p.referred_by ? who(p.referred_by) : "—", paid: paidKwd.get(s(p.id)) ?? 0,
    ctry: p.country ? `${countryOf(s(p.country)).flag} ${countryOf(s(p.country)).ar}` : "—", n: s(p.full_name) || "—", e: s(p.email), p: s(p.phone), plan: plan(p.plan_id), cr: Number(p.credits ?? 0),
    st: blocked.has(s(p.email).toLowerCase()) ? "محظور" : p.is_suspended ? "موقوف" : "نشط", d: kwDate(s(p.created_at)) });
  const colOf = (key: string) => c.ws.getColumn(key).letter; // never hard-code a letter: columns get added over time
  c.finish(c.count() ? { n: "المجموع", cr: { formula: `SUM(${colOf("cr")}${c.FIRST}:${colOf("cr")}${c.lastRow()})` }, paid: { formula: `SUM(${colOf("paid")}${c.FIRST}:${colOf("paid")}${c.lastRow()})` } } : undefined);

  // 1b) legal consents: terms accepted at sign-up, and the image/voice permission ticked on avatar & voice-clone jobs
  const cs = styledSheet(wb, "الموافقات", { title: "الموافقات القانونية (للتوثيق عند أي نزاع)", tab: "FF6D4C41", columns: [
    { header: "الوقت", key: "d", width: 18, fmt: FMT.datetime }, { header: "العميل", key: "u", width: 24 }, { header: "البريد", key: "e", width: 28, align: "left" },
    { header: "موضوع الموافقة", key: "what", width: 46 }, { header: "النسخة / الأداة", key: "v", width: 18, align: "center" },
  ] });
  const consentRows: Row[] = [];
  for (const p of users) {
    const a = auth.get(s(p.id));
    consentRows.push({ d: a?.terms_accepted_at ?? null, u: s(p.full_name) || "—", e: s(p.email), what: a?.terms_accepted ? "الموافقة على شروط الاستخدام وسياسة الاسترجاع وسياسة الخصوصية، والإقرار ببلوغ 18 عاماً" : "⚠️ لا توجد موافقة مسجّلة (حساب أُنشئ قبل إضافة خانة الموافقة)", v: s(a?.terms_accepted) || "—" });
  }
  for (const j of t.jobs ?? []) {
    const input = (j.input ?? {}) as Record<string, unknown>;
    if (input.consent === true) consentRows.push({ d: j.created_at, u: who(j.user_id), e: s(people.get(s(j.user_id))?.email), what: j.tool_id === "voice" ? "إقرار بأن الصوت صوته أو لديه إذن مكتوب من صاحبه، والموافقة على سياسة المحتوى" : "إقرار بأن الصورة صورته أو لديه إذن مكتوب من صاحبها، والموافقة على سياسة المحتوى", v: tool(j.tool_id) });
  }
  for (const r of consentRows.sort((a, b) => s(b.d).localeCompare(s(a.d)))) { const row = cs.add({ ...r, d: kwDate(s(r.d)) }); if (s(r.what).startsWith("⚠️")) row.getCell("what").font = { name: "Arial", size: 11, color: { argb: "FFB26A00" } }; }
  cs.finish();

  // 2) payments
  const inc = sortDesc(t.income ?? [], "received_on");
  const m = styledSheet(wb, "المدفوعات", { title: "المدفوعات الواردة", tab: "FF2E7D32", columns: [
    { header: "التاريخ", key: "d", width: 14, fmt: FMT.date }, { header: "الوصف", key: "desc", width: 30 }, { header: "العميل", key: "cust", width: 24 },
    { header: "الطريقة", key: "m", width: 12, align: "center" }, { header: "المبلغ", key: "a", width: 14, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" },
    { header: "وقت التسجيل", key: "rt", width: 18, fmt: FMT.datetime }, { header: "بالدينار", key: "kwd", width: 14, fmt: FMT.kd }, { header: "الدولة", key: "ctry", width: 16, align: "center" },
  ] });
  for (const x of inc) m.add({ kwd: kwdOf(x.amount, x.currency), ctry: ctryOf(x.customer_id), rt: kwDate(s(x.created_at)), d: dayDate(s(x.received_on)), desc: s(x.description), cust: s(x.customer_name) || "—", m: paym(x.method), a: Number(x.amount ?? 0), cur: x.currency === "KWD" ? "د.ك" : s(x.currency) });
  m.finish();

  // 2b) every payment attempt (successful, failed, abandoned)
  const ch = sortDesc(t.tap_charges ?? [], "created_at");
  const pa = styledSheet(wb, "محاولات الدفع", { title: "جميع محاولات الدفع (الناجحة والفاشلة)", tab: "FF2E7D32", columns: [
    { header: "الوقت", key: "d", width: 18, fmt: FMT.datetime }, { header: "العميل", key: "u", width: 24 }, { header: "النوع", key: "k", width: 14, align: "center" },
    { header: "الباقة", key: "plan", width: 14, align: "center" }, { header: "المبلغ", key: "a", width: 13, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" },
    { header: "الطريقة", key: "m", width: 13, align: "center" }, { header: "النتيجة", key: "st", width: 22, align: "center" }, { header: "آخر تحديث", key: "up", width: 18, fmt: FMT.datetime },
    { header: "رقم العملية", key: "id", width: 26, align: "left" }, { header: "الدولة", key: "ctry", width: 16, align: "center" },
  ] });
  for (const x of ch) {
    const [label, color] = chargeState(x.status);
    const r = pa.add({ ctry: ctryOf(x.user_id), d: kwDate(s(x.created_at)), u: who(x.user_id), k: CHARGE_KIND[s(x.kind)] ?? s(x.kind), plan: x.plan_id ? plan(x.plan_id) : "—", a: Number(x.amount ?? 0), cur: x.currency === "KWD" ? "د.ك" : s(x.currency), m: paym(x.method), st: label, up: kwDate(s(x.updated_at)), id: s(x.id) });
    r.getCell("st").font = { name: "Arial", size: 11, bold: true, color: { argb: color } };
  }
  pa.finish();

  // 2b2) «الدفع بالتحويل»: every transfer sent by a customer (pending, approved, rejected)
  const TR_KIND: Record<string, string> = { subscribe: "اشتراك جديد", renew: "تجديد", managed: "باقة الإدارة الكاملة" };
  const TR_ST: Record<string, [string, string]> = { pending: ["قيد المراجعة", "FFB26A00"], approved: ["✓ مقبول", "FF2E7D32"], rejected: ["✗ مرفوض", "FFC62828"] };
  const trs = sortDesc(t.transfers ?? [], "created_at");
  const tw = styledSheet(wb, "التحويلات", { title: "المدفوعات بالتحويل (بنكي، محافظ إلكترونية)", tab: "FF2E7D32", columns: [
    { header: "تاريخ الإرسال", key: "d", width: 18, fmt: FMT.datetime }, { header: "العميل", key: "u", width: 24 }, { header: "الدولة", key: "ctry", width: 16 },
    { header: "الطريقة", key: "m", width: 22 }, { header: "النوع", key: "k", width: 16 }, { header: "الباقة", key: "plan", width: 14 },
    { header: "عدد الأشهر", key: "mo", width: 11, fmt: FMT.num }, { header: "المبلغ", key: "a", width: 14, fmt: FMT.kd }, { header: "المبلغ المحوَّل (حسب العميل)", key: "paid", width: 24 },
    { header: "الحالة", key: "st", width: 15 }, { header: "تاريخ المراجعة", key: "rd", width: 18, fmt: FMT.datetime }, { header: "بواسطة", key: "by", width: 24 },
    { header: "سبب الرفض", key: "why", width: 30 }, { header: "ملاحظة العميل", key: "note", width: 30 },
  ] });
  for (const x of trs) {
    const [label, color] = TR_ST[s(x.status)] ?? [s(x.status), "FF1F2937"];
    const r = tw.add({ d: kwDate(s(x.created_at)), u: who(x.user_id), ctry: ctryOf(x.user_id), m: s(x.method_name), k: TR_KIND[s(x.kind)] ?? s(x.kind), plan: x.plan_id ? plan(x.plan_id) : "—",
      mo: Number(x.months ?? 1), a: Number(x.amount ?? 0), paid: s(x.paid_text) || "—", st: label, rd: x.reviewed_at ? kwDate(s(x.reviewed_at)) : null, by: s(x.reviewed_by) || "—", why: s(x.reject_reason) || "—", note: s(x.note) || "—" });
    r.getCell("st").font = { name: "Arial", size: 11, bold: true, color: { argb: color } };
  }
  tw.finish(trs.length ? { u: "المجموع المقبول", a: { formula: `SUMIFS(H${tw.FIRST}:H${tw.lastRow()},J${tw.FIRST}:J${tw.lastRow()},"✓ مقبول")` } } : undefined);

  // 2c) subscriptions
  const subs = sortDesc(t.subscriptions ?? [], "updated_at");
  const sb = styledSheet(wb, "الاشتراكات", { title: "الاشتراكات", columns: [
    { header: "العميل", key: "u", width: 24 }, { header: "الباقة", key: "plan", width: 14, align: "center" }, { header: "الحالة", key: "st", width: 14, align: "center" },
    { header: "طريقة الدفع", key: "pm", width: 14, align: "center" }, { header: "البطاقة", key: "card", width: 20, align: "center" },
    { header: "يتجدد / ينتهي في", key: "end", width: 18, fmt: FMT.date }, { header: "تُلغى بنهاية المدة؟", key: "c", width: 16, align: "center" }, { header: "آخر تحديث", key: "up", width: 18, fmt: FMT.datetime }, { header: "الدولة", key: "ctry", width: 16, align: "center" },
  ] });
  for (const x of subs) sb.add({ ctry: ctryOf(x.user_id), u: who(x.user_id), plan: plan(x.plan_id), st: SUB[s(x.status)] ?? s(x.status), pm: x.pay_method === "manual" ? `تحويل: ${s(x.card_label)}${x.prepaid_until ? ` (مدفوع لين ${new Date(s(x.prepaid_until)).toLocaleDateString("en-GB")})` : ""}` : x.pay_method === "card" ? "بطاقة (تجديد تلقائي)" : x.pay_method === "knet" ? "كي نت (رابط شهري)" : s(x.pay_method) || "—",
    card: s(x.card_label) || "—", end: kwDate(s(x.current_period_end)), c: x.cancel_at_period_end ? "نعم" : "لا", up: kwDate(s(x.updated_at)) });
  sb.finish();

  // 3) expenses
  const ex = sortDesc(t.expenses ?? [], "spent_on");
  const e = styledSheet(wb, "المصروفات", { title: "المصروفات", tab: "FFC62828", columns: [
    { header: "التاريخ", key: "d", width: 14, fmt: FMT.date }, { header: "الجهة", key: "v", width: 24 }, { header: "النوع", key: "c", width: 16, align: "center" },
    { header: "المبلغ", key: "a", width: 14, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" }, { header: "ملاحظة", key: "note", width: 34 }, { header: "بالدينار", key: "kwd", width: 14, fmt: FMT.kd },
  ] });
  for (const x of ex) e.add({ kwd: kwdOf(x.amount, x.currency), d: dayDate(s(x.spent_on)), v: s(x.vendor), c: CATEGORY[s(x.category)] ?? s(x.category), a: Number(x.amount ?? 0), cur: x.currency === "KWD" ? "د.ك" : s(x.currency), note: s(x.note) });
  e.finish();

  // 4) credits
  const led = sortDesc(t.credit_ledger ?? [], "created_at");
  const l = styledSheet(wb, "حركات الرصيد", { title: "حركات الرصيد (الريش)", columns: [
    { header: "الوقت", key: "d", width: 18, fmt: FMT.datetime }, { header: "العميل", key: "u", width: 26 }, { header: "النوع", key: "r", width: 16, align: "center" },
    { header: "الريش", key: "a", width: 12, fmt: '+#,##0;-#,##0;0' },
  ] });
  for (const x of led) { const r = l.add({ d: kwDate(s(x.created_at)), u: who(x.user_id), r: REASON[s(x.reason)] ?? s(x.reason), a: Number(x.amount ?? 0) }); r.getCell("a").font = { name: "Arial", size: 11, bold: true, color: { argb: Number(x.amount) < 0 ? "FFC62828" : "FF2E7D32" } }; }
  l.finish();

  // 5) jobs
  const jobs = sortDesc(t.jobs ?? [], "created_at");
  const j = styledSheet(wb, "الطلبات", { title: "طلبات العملاء (الأعمال)", columns: [
    { header: "الوقت", key: "d", width: 18, fmt: FMT.datetime }, { header: "العميل", key: "u", width: 24 }, { header: "الأداة", key: "t", width: 20 },
    { header: "العنوان", key: "title", width: 26 }, { header: "الحالة", key: "st", width: 12, align: "center" }, { header: "الريش", key: "cr", width: 10, fmt: FMT.num },
    { header: "استُردّت الريش؟", key: "rf", width: 12, align: "center" }, { header: "وقت الإنجاز / آخر تحديث", key: "up", width: 18, fmt: FMT.datetime }, { header: "سبب الفشل", key: "err", width: 34 },
    { header: "تكلفة المزوّد ($)", key: "cost", width: 12, fmt: FMT.usd },
  ] });
  for (const x of jobs) {
    const r = j.add({ d: kwDate(s(x.created_at)), u: who(x.user_id), t: tool(x.tool_id), title: s(x.title) || "—", st: STATUS[s(x.status)] ?? s(x.status), cr: Number(x.credits_charged ?? 0),
      rf: x.refunded ? "نعم" : "—", up: kwDate(s(x.updated_at)), err: x.status === "failed" ? s(x.error).slice(0, 200) : "", cost: x.provider_cost_usd == null ? null : Number(x.provider_cost_usd) });
    if (x.status === "failed") r.getCell("st").font = { name: "Arial", size: 11, bold: true, color: { argb: "FFC62828" } };
  }
  j.finish();

  // 6) contact requests
  const leads = sortDesc(t.leads ?? [], "created_at");
  const ld = styledSheet(wb, "طلبات التواصل", { title: "طلبات التواصل (خدمة الإدارة الكاملة)", columns: [
    { header: "الوقت", key: "d", width: 18, fmt: FMT.datetime }, { header: "الاسم", key: "n", width: 22 }, { header: "الهاتف", key: "p", width: 18, align: "left" },
    { header: "الرسالة", key: "msg", width: 40 }, { header: "الحالة", key: "st", width: 14, align: "center" },
  ] });
  for (const x of leads) ld.add({ d: kwDate(s(x.created_at)), n: s(x.name), p: s(x.phone), msg: s(x.message), st: LEAD[s(x.status)] ?? s(x.status) });
  ld.finish();

  // 7) closed accounts
  const closed = sortDesc(t.closed_accounts ?? [], "closed_at");
  const ca = styledSheet(wb, "الحسابات المغلقة", { title: "الحسابات المغلقة (تُحفظ 5 سنوات)", tab: "FF6D4C41", columns: [
    { header: "تاريخ الإغلاق", key: "d", width: 15, fmt: FMT.date }, { header: "الاسم", key: "n", width: 22 }, { header: "البريد", key: "e", width: 28, align: "left" },
    { header: "الهاتف", key: "p", width: 16, align: "left" }, { header: "السبب", key: "r", width: 16, align: "center" }, { header: "بواسطة", key: "by", width: 24, align: "left" },
    { header: "ملاحظة", key: "note", width: 30 }, { header: "تاريخ الحذف التلقائي", key: "purge", width: 15, fmt: FMT.date },
  ] });
  for (const x of closed) ca.add({ d: kwDate(s(x.closed_at)), n: s(x.full_name), e: s(x.email), p: s(x.phone), r: CLOSE[s(x.reason)] ?? s(x.reason), by: s(x.closed_by) || "—", note: s(x.note), purge: kwDate(s(x.purge_at)) });
  ca.finish();

  // 7b) sign-ins & security
  const ev = sortDesc(t.user_events ?? [], "created_at");
  const sec = styledSheet(wb, "الدخول والأمان", { title: "الدخول والأمان", tab: "FF6D4C41", columns: [
    { header: "الوقت", key: "d", width: 18, fmt: FMT.datetime }, { header: "العميل", key: "u", width: 24 }, { header: "الحدث", key: "k", width: 26 },
    { header: "التفاصيل", key: "det", width: 30 }, { header: "IP", key: "ip", width: 16, align: "left" },
  ] });
  for (const x of ev) {
    const r = sec.add({ d: kwDate(s(x.created_at)), u: who(x.user_id), k: EVENT[s(x.kind)] ?? s(x.kind), det: s(x.detail), ip: s(x.ip) });
    if (x.kind === "login_failed" || x.kind === "violation") r.getCell("k").font = { name: "Arial", size: 11, bold: true, color: { argb: "FFC62828" } };
  }
  sec.finish();

  // 7c) referrals, bans, support access, brand kits
  const refs = users.filter((p) => p.referred_by);
  const rf = styledSheet(wb, "الدعوات", { title: "الدعوات والإحالات", columns: [
    { header: "تاريخ تسجيل المدعو", key: "d", width: 18, fmt: FMT.date }, { header: "المدعو", key: "u", width: 24 }, { header: "الداعي", key: "by", width: 24 },
    { header: "إجمالي ريش الإحالة التي حصل عليها الداعي", key: "cr", width: 22, fmt: FMT.num },
  ] });
  const refCredits = (id: unknown) => (t.credit_ledger ?? []).filter((l) => l.user_id === id && l.reason === "referral").reduce((a, l) => a + Number(l.amount ?? 0), 0);
  for (const p of sortDesc(refs, "created_at")) rf.add({ d: kwDate(s(p.created_at)), u: s(p.full_name) || s(p.email), by: who(p.referred_by), cr: refCredits(p.referred_by) });
  rf.finish();

  const bl = styledSheet(wb, "قائمة الحظر", { title: "البريد المحظور من التسجيل", tab: "FFC62828", columns: [
    { header: "تاريخ الحظر", key: "d", width: 18, fmt: FMT.datetime }, { header: "البريد", key: "e", width: 32, align: "left" }, { header: "السبب", key: "r", width: 40 },
  ] });
  for (const b of sortDesc(t.blocked_emails ?? [], "created_at")) bl.add({ d: kwDate(s(b.created_at)), e: s(b.email), r: s(b.reason) || "—" });
  bl.finish();

  const SA: Record<string, string> = { pending: "بانتظار موافقة العميل", approved: "موافَق عليه", denied: "مرفوض", revoked: "سحب الموافقة", expired: "انتهت" };
  const sa = styledSheet(wb, "صلاحيات الدعم", { title: "دخول الإدارة إلى حسابات العملاء (بموافقتهم)", tab: "FF6D4C41", columns: [
    { header: "وقت الطلب", key: "d", width: 18, fmt: FMT.datetime }, { header: "العميل", key: "u", width: 24 }, { header: "السبب", key: "r", width: 30 },
    { header: "الحالة", key: "st", width: 16, align: "center" }, { header: "وقّع باسم", key: "sig", width: 20 }, { header: "وقت القرار", key: "dec", width: 18, fmt: FMT.datetime },
    { header: "ينتهي", key: "exp", width: 18, fmt: FMT.datetime }, { header: "نص الموافقة", key: "txt", width: 46 },
  ] });
  for (const x of sortDesc(t.support_access ?? [], "created_at")) sa.add({ d: kwDate(s(x.created_at)), u: who(x.user_id), r: s(x.reason), st: SA[s(x.status)] ?? s(x.status), sig: s(x.signed_name) || "—", dec: kwDate(s(x.decided_at)), exp: kwDate(s(x.expires_at)), txt: s(x.consent_text) });
  sa.finish();

  const bk = styledSheet(wb, "هويات العملاء", { title: "هويات العملاء التجارية", columns: [
    { header: "العميل", key: "u", width: 24 }, { header: "النشاط", key: "n", width: 24 }, { header: "المجال", key: "ind", width: 18 },
    { header: "إنستغرام", key: "ig", width: 22, align: "left" }, { header: "الموقع", key: "w", width: 28, align: "left" }, { header: "الألوان", key: "col", width: 26, align: "left" },
    { header: "يوجد شعار؟", key: "logo", width: 11, align: "center" }, { header: "آخر تعديل", key: "up", width: 18, fmt: FMT.datetime },
  ] });
  for (const b of sortDesc(t.brand_kits ?? [], "updated_at")) bk.add({ u: who(b.user_id), n: s(b.business_name) || "—", ind: s(b.industry) || "—", ig: s(b.instagram) || "—", w: s(b.website) || "—",
    col: Array.isArray(b.colors) ? (b.colors as unknown[]).join("  ") : "", logo: b.logo_url ? "نعم" : "لا", up: kwDate(s(b.updated_at)) });
  bk.finish();

  // 9) current prices + their history
  const plansNow = [...(t.plans ?? [])].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  const pl = styledSheet(wb, "الباقات", { title: "الباقات وأسعارها الحالية", tab: GOLD_TAB, columns: [
    { header: "الباقة", key: "n", width: 18 }, { header: "الرمز", key: "id", width: 12, align: "left" }, { header: "السعر الشهري", key: "p", width: 15, fmt: FMT.kd },
    { header: "الريش", key: "c", width: 10, fmt: FMT.num }, { header: "ريش هدية", key: "b", width: 11, fmt: FMT.num }, { header: "المجموع", key: "tot", width: 11, fmt: FMT.num },
    { header: "سعر الريشة", key: "per", width: 14, fmt: '#,##0.0000 "د.ك"' }, { header: "معروضة للعملاء؟", key: "on", width: 10, align: "center" }, { header: "عدد المشتركين", key: "subs", width: 14, fmt: FMT.num },
  ] });
  for (const x of plansNow) {
    const r = pl.add({ n: s(x.name), id: s(x.id), p: Number(x.price_kwd ?? 0), c: Number(x.credits ?? 0), b: Number(x.bonus_credits ?? 0), on: x.is_active ? "نعم" : "لا",
      subs: (t.profiles ?? []).filter((p) => p.role === "user" && p.plan_id === x.id).length });
    r.getCell("tot").value = { formula: `D${r.number}+E${r.number}` };
    r.getCell("per").value = { formula: `IF(F${r.number}>0,C${r.number}/F${r.number},0)` };
  }
  pl.finish();

  const toolsNow = [...(t.tools ?? [])].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  const tl = styledSheet(wb, "الأدوات", { title: "الأدوات وتكلفتها الحالية بالريش", tab: GOLD_TAB, columns: [
    { header: "الأداة", key: "n", width: 22 }, { header: "التكلفة (ريشة)", key: "c", width: 13, fmt: FMT.num }, { header: "لكل", key: "u", width: 16, align: "center" },
    { header: "تكلفة التعديل", key: "e", width: 13, fmt: FMT.num }, { header: "مفعّلة؟", key: "on", width: 10, align: "center" }, { header: "مرات الاستخدام", key: "uses", width: 14, fmt: FMT.num },
    { header: "الريش المصروفة", key: "spent", width: 15, fmt: FMT.num },
  ] });
  for (const x of toolsNow) {
    const mine = (t.jobs ?? []).filter((j) => j.tool_id === x.id);
    tl.add({ n: s(x.name), c: Number(x.credit_cost ?? 0), u: s(x.cost_unit), e: Number(x.edit_cost ?? 0), on: x.is_enabled ? "نعم" : "لا", uses: mine.length, spent: mine.reduce((a, j) => a + Number(j.credits_charged ?? 0), 0) });
  }
  tl.finish();

  const ph = sortDesc(t.price_history ?? [], "created_at");
  const KIND: Record<string, string> = { plan: "باقة", tool: "أداة", setting: "إعداد" };
  const label = (k: unknown, f: unknown) => (PRICE_FIELDS as Record<string, Record<string, string>>)[s(k)]?.[s(f)] ?? s(f);
  const hs = styledSheet(wb, "سجل تغيير الأسعار", { title: "سجل تغيير الأسعار (تبقى العمليات السابقة بأسعارها، وتُطبَّق الأسعار الجديدة على ما بعدها)", tab: GOLD_TAB, columns: [
    { header: "الوقت", key: "d", width: 18, fmt: FMT.datetime }, { header: "النوع", key: "k", width: 10, align: "center" }, { header: "العنصر", key: "item", width: 20 },
    { header: "البند المعدَّل", key: "f", width: 20 }, { header: "من", key: "o", width: 12, align: "center" }, { header: "إلى", key: "nw", width: 12, align: "center" }, { header: "بواسطة", key: "by", width: 26, align: "left" },
  ] });
  for (const x of ph) {
    const r = hs.add({ d: kwDate(s(x.created_at)), k: KIND[s(x.kind)] ?? s(x.kind), item: s(x.item_name) || s(x.item_id), f: label(x.kind, x.field), o: x.old_value == null ? "—" : s(x.old_value), nw: s(x.new_value), by: s(x.changed_by) || "—" });
    r.getCell("nw").font = { name: "Arial", size: 11, bold: true };
  }
  hs.finish();

  // 10) company: partners, withdrawals/deposits, employees (full details), operating cycles
  const partnersAll = t.partners ?? [], movesAll = t.partner_moves ?? [];
  const pName = (id: unknown) => s(partnersAll.find((p) => p.id === id)?.name) || "—";
  const pr = styledSheet(wb, "الشركاء", { title: "الشركاء", tab: "FF0B2A4A", columns: [
    { header: "الشريك", key: "n", width: 22 }, { header: "النسبة %", key: "pct", width: 10, fmt: "0.##" }, { header: "نشط؟", key: "on", width: 8, align: "center" },
    { header: "الهاتف", key: "ph", width: 16, align: "left" }, { header: "البريد الإلكتروني", key: "em", width: 26, align: "left" }, { header: "تاريخ الدخول", key: "j", width: 14, fmt: FMT.date },
    { header: "إجمالي مسحوباته (د.ك)", key: "w", width: 17, fmt: FMT.kd }, { header: "إجمالي إيداعاته (د.ك)", key: "c", width: 17, fmt: FMT.kd }, { header: "ملاحظة", key: "note", width: 26 },
  ] });
  for (const p of partnersAll) {
    const mine = movesAll.filter((m) => m.partner_id === p.id);
    pr.add({ n: s(p.name), pct: Number(p.share_percent ?? 0), on: p.is_active ? "نعم" : "لا", ph: s(p.phone), em: s(p.email), j: dayDate(s(p.joined_on) || null),
      w: mine.filter((m) => m.kind === "withdrawal").reduce((a, m) => a + kwdOf(m.amount, m.currency), 0), c: mine.filter((m) => m.kind === "capital").reduce((a, m) => a + kwdOf(m.amount, m.currency), 0), note: s(p.note) });
  }
  pr.finish();

  const mvs = styledSheet(wb, "المسحوبات والإيداعات", { title: "مسحوبات وإيداعات الشركاء (جميع الحركات)", columns: [
    { header: "التاريخ", key: "d", width: 14, fmt: FMT.date }, { header: "الشريك", key: "p", width: 22 }, { header: "النوع", key: "k", width: 10, align: "center" },
    { header: "المبلغ", key: "a", width: 13, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" }, { header: "بالدينار", key: "kwd", width: 16, fmt: FMT.kd },
    { header: "ملاحظة", key: "note", width: 30 }, { header: "المُدخِل", key: "by", width: 24, align: "left" }, { header: "وقت التسجيل", key: "at", width: 18, fmt: FMT.datetime },
  ] });
  for (const m of sortDesc(movesAll, "moved_on")) {
    const r = mvs.add({ d: dayDate(s(m.moved_on)), p: pName(m.partner_id), k: m.kind === "withdrawal" ? "سحب" : "إيداع", a: Number(m.amount ?? 0), cur: m.currency === "KWD" ? "د.ك" : "$", kwd: kwdOf(m.amount, m.currency), note: s(m.note), by: s(m.created_by), at: kwDate(s(m.created_at)) });
    r.getCell("k").font = { name: "Arial", size: 11, bold: true, color: { argb: m.kind === "withdrawal" ? "FFC62828" : "FF2E7D32" } };
  }
  mvs.finish();

  const emps = t.employees ?? [];
  const empPaid = (id: unknown) => (t.expenses ?? []).filter((x) => x.employee_id === id).reduce((a, x) => a + kwdOf(x.amount, x.currency), 0);
  const es = styledSheet(wb, "الموظفين", { title: "بيانات الموظفين (سرية)", tab: "FF0B2A4A", columns: [
    { header: "الاسم", key: "n", width: 22 }, { header: "الوظيفة", key: "j", width: 16 }, { header: "الرقم المدني", key: "cid", width: 16, align: "left" },
    { header: "الهاتف", key: "ph", width: 16, align: "left" }, { header: "البريد الإلكتروني", key: "em", width: 26, align: "left" }, { header: "العنوان", key: "ad", width: 30 },
    { header: "الراتب المتفق عليه", key: "sal", width: 16, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" },
    { header: "تاريخ التعيين", key: "st", width: 14, fmt: FMT.date }, { header: "تاريخ الانتهاء", key: "en", width: 14, fmt: FMT.date }, { header: "الحالة", key: "on", width: 12, align: "center" },
    { header: "إجمالي المستلَم (د.ك)", key: "paid", width: 20, fmt: FMT.kd }, { header: "ملاحظة", key: "note", width: 24 },
  ] });
  for (const x of emps) es.add({ n: s(x.name), j: s(x.job_title) || "—", cid: s(x.civil_id), ph: s(x.phone), em: s(x.email), ad: s(x.address), sal: x.salary == null ? null : Number(x.salary),
    cur: x.salary_currency === "USD" ? "$" : "د.ك", st: dayDate(s(x.starts_on) || null), en: dayDate(s(x.ends_on) || null), on: x.is_active ? "على رأس العمل" : "انتهت الخدمة", paid: empPaid(x.id), note: s(x.note) });
  es.finish();

  const pays = sortDesc((t.expenses ?? []).filter((x) => x.employee_id), "spent_on");
  const ps = styledSheet(wb, "دفعات الموظفين", { title: "جميع دفعات الموظفين (رواتب، مكافآت، سُلف…)", columns: [
    { header: "التاريخ", key: "d", width: 14, fmt: FMT.date }, { header: "الموظف", key: "n", width: 22 }, { header: "النوع", key: "k", width: 12, align: "center" },
    { header: "المبلغ", key: "a", width: 13, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" }, { header: "بالدينار", key: "kwd", width: 16, fmt: FMT.kd }, { header: "ملاحظة", key: "note", width: 30 },
  ] });
  for (const x of pays) ps.add({ d: dayDate(s(x.spent_on)), n: s(x.vendor), k: PAY_KIND[s(x.pay_kind)] ?? "—", a: Number(x.amount ?? 0), cur: x.currency === "KWD" ? "د.ك" : "$", kwd: kwdOf(x.amount, x.currency), note: s(x.note) });
  ps.finish(pays.length ? { n: "المجموع", kwd: { formula: `SUM(F${ps.FIRST}:F${ps.lastRow()})` } } : undefined);

  const periods = sortDesc(t.finance_periods ?? [], "starts_on");
  const pdS = styledSheet(wb, "الدورات المحاسبية", { title: "الدورات المحاسبية وصافي ربح كل دورة", subtitle: `محسوبة بسعر الدولار ${rate} د.ك`, columns: [
    { header: "الدورة", key: "n", width: 22 }, { header: "من", key: "f", width: 13, fmt: FMT.date }, { header: "إلى", key: "to", width: 13, fmt: FMT.date },
    { header: "الإيرادات", key: "rv", width: 16, fmt: FMT.kd }, { header: "المصروفات", key: "ex", width: 16, fmt: FMT.kd }, { header: "صافي الربح", key: "net", width: 16, fmt: FMT.kd },
    { header: "مسحوبات الشركاء", key: "w", width: 16, fmt: FMT.kd }, { header: "المتبقي في الشركة", key: "left", width: 16, fmt: FMT.kd }, { header: "الحالة", key: "st", width: 12, align: "center" }, { header: "تاريخ الإقفال", key: "ca", width: 18, fmt: FMT.datetime }, { header: "أقفلها", key: "cb", width: 24, align: "left" }, { header: "ملاحظة", key: "note", width: 24 },
  ] });
  for (const p of periods) {
    const f = s(p.starts_on), to = s(p.ends_on);
    const rv = (t.income ?? []).filter((x) => s(x.received_on) >= f && s(x.received_on) <= to).reduce((a, x) => a + kwdOf(x.amount, x.currency), 0);
    const ex2 = (t.expenses ?? []).filter((x) => s(x.spent_on) >= f && s(x.spent_on) <= to).reduce((a, x) => a + kwdOf(x.amount, x.currency), 0);
    const w = movesAll.filter((m) => m.kind === "withdrawal" && s(m.moved_on) >= f && s(m.moved_on) <= to).reduce((a, m) => a + kwdOf(m.amount, m.currency), 0);
    const r = pdS.add({ n: s(p.name), f: dayDate(f), to: dayDate(to), rv, ex: ex2, w, note: s(p.note), st: p.closed_at ? "🔒 مقفلة" : "مفتوحة", ca: kwDate(s(p.closed_at)), cb: s(p.closed_by) || "—" });
    r.getCell("net").value = { formula: `D${r.number}-E${r.number}` };
    r.getCell("left").value = { formula: `F${r.number}-G${r.number}` };
  }
  pdS.finish();

  // 8) admin log
  const au = sortDesc(t.admin_audit ?? [], "created_at");
  const a = styledSheet(wb, "سجل الإدارة", { title: "سجل الإدارة (العمليات الحساسة)", columns: [
    { header: "الوقت", key: "d", width: 18, fmt: FMT.datetime }, { header: "الإداري", key: "by", width: 28, align: "left" }, { header: "العملية", key: "act", width: 24 },
    { header: "على حساب", key: "t", width: 28, align: "left" }, { header: "ملاحظة", key: "note", width: 36 },
  ] });
  for (const x of au) a.add({ d: kwDate(s(x.created_at)), by: s(x.admin_email), act: AUDIT_AR[s(x.action)] ?? s(x.action), t: s(x.target_email) || "—", note: s(x.note) });
  a.finish();

  return wb;
}
