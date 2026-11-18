"use client";
import React, { useLayoutEffect, useRef } from "react";
import { Mail, Phone, MapPin, Globe, Link2 } from "lucide-react";
import { secTitle, type CVSpec, type SecKey } from "./spec";

export const PW = 794;
export const PH = 1123;
const GAP = 40;

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => "#" + rgb(a).map((v, i) => Math.round(v * (1 - t) + rgb(b)[i] * t).toString(16).padStart(2, "0")).join("");
const tint = (a: string, t: number) => mix("#FFFFFF", a, t);

type Geo = { sb: number; padT: number; padB: number; padX: number; band: number };
const geo = (s: CVSpec): Geo => {
  switch (s.template) {
    case "side": return { sb: 255, padT: 46, padB: 42, padX: 36, band: 0 };
    case "exec": return { sb: 0, padT: 48, padB: 46, padX: 54, band: 205 };
    case "split": return { sb: 0, padT: 48, padB: 46, padX: 52, band: 178 };
    case "minimal": return { sb: 0, padT: 58, padB: 52, padX: 66, band: 0 };
    case "chips": return { sb: 0, padT: 42, padB: 42, padX: 44, band: 0 };
    default: return { sb: 0, padT: 50, padB: 46, padX: 54, band: 0 };
  }
};
export const flowSize = (s: CVSpec) => { const g = geo(s); return { W: PW - g.sb - g.padX * 2, H: PH - g.padT - g.padB, g }; };

const dateOf = (a: string, b: string) => [a, b].filter(Boolean).join(" – ");

function Contacts({ s, color, size = 13, justify = "flex-start", col = false }: { s: CVSpec; color: string; size?: number; justify?: string; col?: boolean }) {
  const p = s.person;
  const items: [React.ReactNode, string, boolean][] = [[<Phone key="p" size={size} />, p.phone, true], [<Mail key="m" size={size} />, p.email, true], [<MapPin key="c" size={size} />, p.city, false], [<Link2 key="l" size={size} />, p.linkedin, true], [<Globe key="w" size={size} />, p.website, true]];
  return (
    <div style={{ display: "flex", flexDirection: col ? "column" : "row", flexWrap: "wrap", gap: col ? 9 : "5px 18px", justifyContent: justify, color, fontSize: size }}>
      {items.filter((i) => i[1]).map(([ic, t, ltr], i) => <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{ic}<span dir={ltr ? "ltr" : undefined} style={{ unicodeBidi: "isolate", wordBreak: "break-all" }}>{t}</span></span>)}
    </div>
  );
}
const Photo = ({ s, size, ring }: { s: CVSpec; size: number; ring?: string }) =>
  s.showPhoto && s.photo?.url ? <img src={s.photo.url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: ring ? `4px solid ${ring}` : undefined, display: "block" }} /> : null;

function Title({ s, k, v }: { s: CVSpec; k: SecKey; v: string }) {
  const t = secTitle(s, k), a = s.accent;
  const base: React.CSSProperties = { breakAfter: "avoid", margin: "22px 0 10px", fontWeight: 800 };
  switch (v) {
    case "classic": return <div style={{ ...base, display: "flex", alignItems: "center", gap: 12, color: a, fontSize: 16 }}><span>{t}</span><span style={{ flex: 1, height: 1, background: tint(a, 0.4) }} /></div>;
    case "exec": return <div style={{ ...base, color: "#111", fontSize: 17 }}>{t}<div style={{ width: 38, height: 3, background: a, marginTop: 4 }} /></div>;
    case "modern": return <div style={{ ...base, color: "#111", fontSize: 17, borderInlineStart: `5px solid ${a}`, paddingInlineStart: 10 }}>{t}</div>;
    case "timeline": return <div style={{ ...base, color: a, fontSize: 17, display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: a }} />{t}</div>;
    case "minimal": return <div style={{ ...base, color: "#6B7280", fontSize: 12.5, letterSpacing: 2.5, fontWeight: 700, borderTop: `1px solid ${tint(a, 0.3)}`, paddingTop: 12, marginTop: 28 }}>{t}</div>;
    case "chips": return <div style={{ ...base }}><span style={{ background: tint(a, 0.12), color: a, padding: "4px 16px", borderRadius: 99, fontSize: 15 }}>{t}</span></div>;
    case "split": return <div style={{ ...base, color: a, fontSize: 17, background: tint(a, 0.08), padding: "5px 12px", borderInlineStart: `4px solid ${a}` }}>{t}</div>;
    default: return <div style={{ ...base, color: a, fontSize: 17, borderBottom: `2px solid ${a}`, paddingBottom: 4 }}>{t}</div>;
  }
}

function Bullets({ items, a }: { items: string[]; a: string }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>{items.map((b, i) => <div key={i} style={{ display: "flex", gap: 9 }}><span style={{ color: a, flexShrink: 0 }}>•</span><span>{b}</span></div>)}</div>;
}

function expItems(s: CVSpec, v: string): React.ReactNode[] {
  const a = s.accent;
  return s.experience.map((e, i) => {
    const body = (
      <div style={{ breakInside: "avoid", marginBottom: 14, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <b style={{ fontSize: 15.5 }}>{e.role}</b><span style={{ fontSize: 12.5, color: "#6B7280", whiteSpace: "nowrap" }}>{dateOf(e.from, e.to)}</span>
        </div>
        {(e.company || e.place) && <div style={{ color: a, fontWeight: 700, fontSize: 14 }}>{[e.company, e.place].filter(Boolean).join(" · ")}</div>}
        {e.bullets.length > 0 && <Bullets items={e.bullets} a={a} />}
      </div>
    );
    return v === "timeline"
      ? <div key={i} style={{ borderInlineStart: `2px solid ${tint(a, 0.35)}`, paddingInlineStart: 16, marginInlineStart: 5, position: "relative" }}><span style={{ position: "absolute", insetInlineStart: -7, top: 6, width: 12, height: 12, borderRadius: "50%", background: "#fff", border: `3px solid ${a}` }} />{body}</div>
      : <React.Fragment key={i}>{body}</React.Fragment>;
  });
}
const eduItems = (s: CVSpec): React.ReactNode[] => s.education.map((e, i) => (
  <div key={i} style={{ breakInside: "avoid", marginBottom: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}><b style={{ fontSize: 15 }}>{e.degree}</b><span style={{ fontSize: 12.5, color: "#6B7280", whiteSpace: "nowrap" }}>{dateOf(e.from, e.to)}</span></div>
    {(e.school || e.place) && <div style={{ color: s.accent, fontWeight: 600, fontSize: 14 }}>{[e.school, e.place].filter(Boolean).join(" · ")}</div>}
    {e.note && <div style={{ color: "#4B5563", fontSize: 13.5 }}>{e.note}</div>}
  </div>));
const courseItems = (s: CVSpec): React.ReactNode[] => s.courses.map((c, i) => <div key={i} style={{ breakInside: "avoid", marginBottom: 5, display: "flex", justifyContent: "space-between", gap: 10 }}><span><b>{c.name}</b>{c.org ? ` · ${c.org}` : ""}</span><span style={{ color: "#6B7280", fontSize: 12.5 }}>{c.year}</span></div>);
const Skills = ({ s, v }: { s: CVSpec; v: string }) => v === "chips" || v === "modern" || v === "split"
  ? <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{s.skills.map((k, i) => <span key={i} style={{ background: tint(s.accent, 0.1), color: s.accent, border: `1px solid ${tint(s.accent, 0.3)}`, padding: "3px 13px", borderRadius: 99, fontSize: 13, fontWeight: 600 }}>{k}</span>)}</div>
  : <div style={{ color: "#222" }}>{s.skills.join("  ·  ")}</div>;
const Langs = ({ s }: { s: CVSpec }) => <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 26px" }}>{s.languages.map((l, i) => <span key={i}><b>{l.name}</b>{l.level ? <span style={{ color: "#6B7280" }}> — {l.level}</span> : null}</span>)}</div>;
const extraItems = (s: CVSpec): React.ReactNode[] => s.extra.map((x, i) => <div key={i} style={{ breakInside: "avoid", marginBottom: 8 }}>{x.title && <b>{x.title}</b>}<Bullets items={x.items} a={s.accent} /></div>);

function Header({ s, v }: { s: CVSpec; v: string }) {
  const p = s.person, a = s.accent;
  const name = (size: number, extra?: React.CSSProperties) => <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.2, ...extra }}>{p.name}</div>;
  if (v === "side") return <div style={{ marginBottom: 6 }}>{name(32, { color: "#111" })}{p.title && <div style={{ fontSize: 17, color: a, fontWeight: 700, marginTop: 3 }}>{p.title}</div>}</div>;
  if (v === "classic") return <div style={{ textAlign: "center", paddingBottom: 14, borderBottom: `2px solid ${a}`, marginBottom: 4 }}>{name(34, { color: a })}{p.title && <div style={{ fontSize: 17, color: "#4B5563", marginTop: 3 }}>{p.title}</div>}<div style={{ marginTop: 10 }}><Contacts s={s} color="#374151" justify="center" /></div></div>;
  if (v === "modern") return <div style={{ paddingBottom: 14, borderBottom: `1px solid ${tint(a, 0.3)}` }}>{name(38, { color: "#111" })}{p.title && <div style={{ fontSize: 18, color: a, fontWeight: 700, marginTop: 4 }}>{p.title}</div>}<div style={{ marginTop: 11 }}><Contacts s={s} color="#374151" /></div></div>;
  if (v === "timeline") return <div style={{ display: "flex", alignItems: "center", gap: 20, paddingBottom: 14 }}><Photo s={s} size={104} ring={tint(a, 0.25)} /><div style={{ flex: 1 }}>{name(32, { color: a })}{p.title && <div style={{ fontSize: 17, color: "#374151", fontWeight: 600, marginTop: 3 }}>{p.title}</div>}<div style={{ marginTop: 9 }}><Contacts s={s} color="#4B5563" size={12.5} /></div></div></div>;
  if (v === "minimal") return <div style={{ paddingBottom: 10 }}>{name(40, { fontWeight: 500, letterSpacing: 0.5 })}{p.title && <div style={{ fontSize: 15, letterSpacing: 2, color: "#6B7280", marginTop: 6 }}>{p.title}</div>}<div style={{ marginTop: 14 }}><Contacts s={s} color="#4B5563" size={12.5} /></div></div>;
  if (v === "chips") return <div style={{ background: tint(a, 0.09), borderRadius: 22, padding: "22px 26px", display: "flex", alignItems: "center", gap: 20 }}><Photo s={s} size={108} ring="#fff" /><div style={{ flex: 1 }}>{name(32, { color: a })}{p.title && <div style={{ fontSize: 17, fontWeight: 600, marginTop: 3 }}>{p.title}</div>}<div style={{ marginTop: 10 }}><Contacts s={s} color="#374151" size={12.5} /></div></div></div>;
  return null; // exec / split: header lives in the band
}

function Band({ s }: { s: CVSpec }) {
  const p = s.person, a = s.accent, g = geo(s);
  if (s.template === "exec") return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: g.band, background: `linear-gradient(135deg, ${mix(a, "#000000", 0.25)}, ${a})`, color: "#fff", padding: "0 54px", display: "flex", alignItems: "center", gap: 24 }}>
      <Photo s={s} size={128} ring="rgba(255,255,255,0.85)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.15 }}>{p.name}</div>
        {p.title && <div style={{ fontSize: 19, opacity: 0.9, marginTop: 4, fontWeight: 600 }}>{p.title}</div>}
        <div style={{ marginTop: 14 }}><Contacts s={s} color="rgba(255,255,255,0.92)" size={13} /></div>
      </div>
    </div>
  );
  if (s.template === "split") return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: g.band, display: "flex" }}>
      <div style={{ flex: 1.15, background: a, color: "#fff", padding: "0 40px", display: "flex", alignItems: "center", gap: 18 }}>
        <Photo s={s} size={96} ring="rgba(255,255,255,0.8)" />
        <div><div style={{ fontSize: 33, fontWeight: 800, lineHeight: 1.2 }}>{p.name}</div>{p.title && <div style={{ fontSize: 17, opacity: 0.92, marginTop: 4 }}>{p.title}</div>}</div>
      </div>
      <div style={{ flex: 1, background: tint(a, 0.1), padding: "0 36px", display: "flex", alignItems: "center" }}><Contacts s={s} color="#374151" col size={13.5} /></div>
    </div>
  );
  return null;
}

function Sidebar({ s }: { s: CVSpec }) {
  const a = s.accent;
  const h = (t: string) => <div style={{ fontWeight: 800, fontSize: 15.5, margin: "22px 0 9px", paddingBottom: 5, borderBottom: "1px solid rgba(255,255,255,0.35)" }}>{t}</div>;
  return (
    <div style={{ position: "absolute", top: 0, bottom: 0, boxSizing: "border-box", width: 255, background: `linear-gradient(180deg, ${a}, ${mix(a, "#000000", 0.28)})`, color: "#fff", padding: "40px 24px", display: "flex", flexDirection: "column", ...(s.lang === "ar" ? { right: 0 } : { left: 0 }) }}>
      {s.showPhoto && s.photo?.url && <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><Photo s={s} size={150} ring="rgba(255,255,255,0.85)" /></div>}
      <Contacts s={s} color="#fff" col size={13} />
      {s.details.length > 0 && <>{h(s.lang === "ar" ? "بيانات شخصية" : "Personal")}{s.details.map((d, i) => <div key={i} style={{ fontSize: 13, marginBottom: 6 }}><span style={{ opacity: 0.8 }}>{d.label}</span><br /><b>{d.value}</b></div>)}</>}
      {!s.hidden.includes("skills") && s.skills.length > 0 && <>{h(secTitle(s, "skills"))}{s.skills.map((k, i) => <div key={i} style={{ fontSize: 13.5, marginBottom: 5 }}>▪ {k}</div>)}</>}
      {!s.hidden.includes("languages") && s.languages.length > 0 && <>{h(secTitle(s, "languages"))}{s.languages.map((l, i) => <div key={i} style={{ fontSize: 13.5, marginBottom: 5 }}><b>{l.name}</b>{l.level ? <span style={{ opacity: 0.85 }}> — {l.level}</span> : null}</div>)}</>}
    </div>
  );
}

function Flow({ s }: { s: CVSpec }) {
  const v = s.template, side = v === "side", hid = (k: SecKey) => s.hidden.includes(k);
  // a title always stays with the first item under it (never alone at the bottom of a page)
  const sec = (k: SecKey, has: boolean, nodes: React.ReactNode | React.ReactNode[]) => {
    if (hid(k) || !has) return null;
    const list = Array.isArray(nodes) ? nodes : [nodes];
    return <div key={k}><div style={{ breakInside: "avoid" }}><Title s={s} k={k} v={v} />{list[0]}</div>{list.slice(1)}</div>;
  };
  const g = geo(s);
  const detailsInline = !side && s.details.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 22px", fontSize: 13, color: "#4B5563", margin: "10px 0 2px" }}>{s.details.map((d, i) => <span key={i}>{d.label}: <b>{d.value}</b></span>)}</div>;
  return (
    <div dir={s.lang === "ar" ? "rtl" : "ltr"}>
      {g.band > 0 && <div style={{ height: g.band - g.padT + 22 }} />}
      <Header s={s} v={v} />
      {detailsInline}
      {sec("summary", !!s.summary, <div style={{ color: "#222" }}>{s.summary}</div>)}
      {sec("experience", s.experience.length > 0, expItems(s, v))}
      {sec("education", s.education.length > 0, eduItems(s))}
      {!side && sec("skills", s.skills.length > 0, <Skills s={s} v={v} />)}
      {!side && sec("languages", s.languages.length > 0, <Langs s={s} />)}
      {sec("courses", s.courses.length > 0, courseItems(s))}
      {sec("extra", s.extra.length > 0, extraItems(s))}
    </div>
  );
}

/** One A4 page. The whole CV is laid out once in CSS columns (one column = one page); page N just shows column N. */
export function CVPage({ spec, page = 0, onPages }: { spec: CVSpec; page?: number; onPages?: (n: number) => void }) {
  const { W, H, g } = flowSize(spec);
  const ref = useRef<HTMLDivElement>(null);
  const ar = spec.lang === "ar";
  useLayoutEffect(() => {
    if (!onPages) return;
    const measure = () => { const el = ref.current; if (el) onPages(Math.max(1, Math.round((el.scrollWidth + GAP) / (W + GAP)))); };
    measure();
    document.fonts?.ready.then(measure);
    const t = setTimeout(measure, 400);
    return () => clearTimeout(t);
  });
  const left = spec.template === "side" && !ar ? g.sb + g.padX : g.padX;
  const bg = spec.tone === "warm" ? "#FBF7EF" : "#FFFFFF";
  return (
    <div style={{ width: PW, height: PH, position: "relative", overflow: "hidden", background: bg, fontFamily: `"${spec.font}", sans-serif`, color: "#1B1F27", fontSize: 14.5, lineHeight: 1.65 }}>
      {spec.template === "side" && <>{page === 0 ? <Sidebar s={spec} /> : <div style={{ position: "absolute", top: 0, bottom: 0, width: 255, boxSizing: "border-box", background: spec.accent, ...(ar ? { right: 0 } : { left: 0 }) }} />}</>}
      {page === 0 && <Band s={spec} />}
      <div style={{ position: "absolute", top: g.padT, left, width: W, height: H, overflow: "hidden" }}>
        <div ref={ref} style={{ width: W, height: H, columnWidth: W, columnGap: GAP, columnFill: "auto", direction: "ltr", transform: `translateX(${-page * (W + GAP)}px)` }}>
          <Flow s={spec} />
        </div>
      </div>
    </div>
  );
}

/** Remotion still: one page of the CV. */
export const CVStill: React.FC<{ spec: CVSpec; page: number }> = ({ spec, page }) => <CVPage spec={spec} page={page} />;
