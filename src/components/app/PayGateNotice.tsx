/** «إغلاق الاشتراك مؤقتاً»: the apology a customer sees instead of the payment, with a WhatsApp button when a number is set. */
export function PayGateNotice({ message, whatsapp, label }: { message: string; whatsapp?: string; label: string }) {
  const wa = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : "";
  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <p className="text-[15px] font-semibold leading-7">{message}</p>
      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline self-start px-5 py-2.5 text-sm">{label}</a>}
    </div>
  );
}
