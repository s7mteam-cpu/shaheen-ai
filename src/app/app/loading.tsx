/** Shown the instant a link inside the app is pressed, while the next page gathers its data: the press is answered at once, so nobody presses twice. */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-busy="true" aria-live="polite">
      <div className="h-8 w-56 rounded-xl bg-line/60" />
      <div className="h-4 w-80 max-w-full rounded-lg bg-line/40" />
      <div className="card flex max-w-2xl flex-col gap-4 p-6">
        <div className="h-5 w-40 rounded-lg bg-line/50" />
        <div className="h-28 rounded-xl bg-line/30" />
        <div className="h-5 w-52 rounded-lg bg-line/50" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-14 rounded-xl bg-line/30" />)}</div>
        <div className="h-12 rounded-xl bg-line/50" />
      </div>
    </div>
  );
}
