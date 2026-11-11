/** Required tick before any subscription payment: the customer confirms they know the card is charged every month. */
export function RenewConsent({ price }: { price: number }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-tint p-3 text-[12.5px] leading-6 text-navy-900">
      <input type="checkbox" name="renew_ok" required className="mt-1 h-4 w-4 shrink-0 accent-navy-800" />
      <span>أعرف إن الاشتراك شهري (<b>{price} د.ك</b>): إذا دفعت بالبطاقة أو Apple Pay تنخصم قيمته من بطاقتي تلقائياً كل شهر، وإذا دفعت بكي نت يوصلني رابط دفع قبل نهاية الشهر. وأقدر أوقف التجديد بأي وقت من صفحة الحساب.</span>
    </label>
  );
}
