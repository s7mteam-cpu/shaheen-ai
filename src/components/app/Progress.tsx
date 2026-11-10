/** Green progress bar with a percentage, for anything that is being created. */
export function Progress({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex w-full flex-col gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label}>
      <div className="flex items-center justify-between text-[14px] font-semibold text-emerald-800">
        <span>{label}</span><span dir="ltr">{v}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-100">
        <div className="relative h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600 transition-[width] duration-700 ease-out" style={{ width: `${Math.max(v, 3)}%` }}>
          <div className="absolute inset-0 animate-[shine_1.4s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent)] bg-[length:50%_100%] bg-no-repeat" />
        </div>
      </div>
    </div>
  );
}
