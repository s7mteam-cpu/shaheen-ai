"use client";
import { useState } from "react";

export function CopyBtn({ text, label, done }: { text: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" onClick={() => navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); })} className="btn btn-outline w-fit px-4 py-2 text-[13px]">{ok ? done : label}</button>;
}
