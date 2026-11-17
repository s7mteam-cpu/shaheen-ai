/** Stand-in picture for a PowerPoint work (the file itself can't be a thumbnail). */
export function DeckCover({ title }: { title?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-navy-900 to-navy-700 p-4 text-center text-white">
      <svg aria-hidden width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-gold-500"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4M8 20h8M7 9h6M7 12h4" /></svg>
      {title && <span className="line-clamp-3 text-[13px] font-bold leading-5">{title}</span>}
      <span className="rounded-full bg-gold-500/90 px-2.5 py-0.5 text-[11px] font-bold text-navy-900">PowerPoint</span>
    </div>
  );
}
