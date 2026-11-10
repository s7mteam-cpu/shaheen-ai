import React from "react";
import { Img } from "remotion";
import { ArrowLeft, ChevronLeft, Quote } from "lucide-react";
import { DIcon, IconStyleContext } from "./icons";
import { DSIZE, mix, onColor, type DImg, type DItem, type DesignSpec, type Slide } from "./spec";

/** One slide of a post / carousel / ad, drawn at full size (1080 wide). Used by the studio preview and the worker. */
export type DesignProps = { spec: DesignSpec; index: number };

type Ctx = {
  s: Slide; spec: DesignSpec; index: number; total: number; W: number; H: number; k: number;
  bg: string; ink: string; accent: string; soft: string; muted: string; line: string; onAccent: string; font: string;
};

const PAD = 80;
// First real letter of a name ("أكاديمية مدار" → "م" would be odd; skip "ال" only).
const initial = (name: string) => name.trim().replace(/^ال/, "").charAt(0);

// Long titles shrink so they never break the layout.
const fit = (text: string, base: number, chars = 12, min = 0.5) => Math.round(base * Math.max(min, Math.min(1, Math.sqrt(chars / Math.max(1, text.length)))));

function Photo({ img, style, c }: { img?: DImg | null; style?: React.CSSProperties; c: Ctx }) {
  if (img?.url) return <Img src={img.url} style={{ objectFit: "cover", display: "block", ...style }} />;
  return (
    <div style={{ background: `repeating-linear-gradient(135deg, ${c.soft} 0 22px, ${mix(c.soft, c.ink, 0.05)} 22px 44px)`, display: "grid", placeItems: "center", ...style }}>
      <DIcon name="image" size={90} color={mix(c.ink, c.bg, 0.6)} stroke={1.4} />
    </div>
  );
}

function Logo({ c, size = 64, dark = false }: { c: Ctx; size?: number; dark?: boolean }) {
  const b = c.spec.brand;
  if (b.showLogo && b.logo?.url && !b.box) return <Img src={b.logo.url} style={{ height: size, maxWidth: size * 3.2, objectFit: "contain", display: "block" }} />;
  if (!b.name) return null;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: dark ? c.bg : c.ink, color: dark ? c.ink : c.bg, display: "grid", placeItems: "center", fontSize: size * 0.52, fontWeight: 800, flex: "none" }}>
      {initial(b.name)}
    </div>
  );
}

function BrandRow({ c, color }: { c: Ctx; color?: string }) {
  const b = c.spec.brand;
  const hasImg = b.showLogo && !!b.logo?.url && !b.box;
  if (!b.name && !hasImg) return <div />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 * c.k, fontWeight: 800, color: color ?? c.ink }}>
      <Logo c={c} size={hasImg ? 70 * c.k : 58 * c.k} />
      {!hasImg && b.name}
    </div>
  );
}

function Title({ c, base, color, hcolor, align }: { c: Ctx; base: number; color?: string; hcolor?: string; align?: "center" }) {
  const all = `${c.s.title} ${c.s.highlight ?? ""}`.trim();
  const size = fit(all, base * c.k, 16);
  return (
    <h1 style={{ fontSize: size, lineHeight: 1.16, fontWeight: 800, letterSpacing: -0.5, color: color ?? c.ink, textAlign: align, margin: 0 }}>
      {c.s.title}
      {c.s.highlight && <><br /><span style={{ color: hcolor ?? c.accent }}>{c.s.highlight}</span></>}
    </h1>
  );
}

function Kicker({ c, color, line = true }: { c: Ctx; color?: string; line?: boolean }) {
  if (!c.s.kicker) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 32 * c.k, fontWeight: 700, color: color ?? c.accent }}>
      {line && <span style={{ width: 64, height: 4, background: color ?? c.accent, borderRadius: 2 }} />}
      {c.s.kicker}
    </div>
  );
}

function Body({ c, size = 34, color, align, max }: { c: Ctx; size?: number; color?: string; align?: "center"; max?: number }) {
  if (!c.s.body) return null;
  return <p style={{ fontSize: fit(c.s.body, size * c.k, 70, 0.72), lineHeight: 1.6, fontWeight: 500, color: color ?? c.muted, margin: 0, maxWidth: max, textAlign: align }}>{c.s.body}</p>;
}

function Meta({ list, c, color, iconColor, size = 30 }: { list?: DItem[]; c: Ctx; color?: string; iconColor?: string; size?: number }) {
  if (!list?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 44px", fontSize: size * c.k, fontWeight: 700, color: color ?? c.ink }}>
      {list.map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}><DIcon name={m.icon ?? "check"} size={34 * c.k} color={iconColor ?? c.accent} />{m.text}</div>
      ))}
    </div>
  );
}

function Cta({ c, bg, fg, size = 38 }: { c: Ctx; bg?: string; fg?: string; size?: number }) {
  if (!c.s.cta) return null;
  const b = bg ?? c.accent;
  return (
    <div style={{ background: b, color: fg ?? onColor(b), fontSize: size * c.k, fontWeight: 800, borderRadius: 999, padding: `${22 * c.k}px ${50 * c.k}px`, display: "flex", alignItems: "center", gap: 16, flex: "none", whiteSpace: "nowrap" }}>
      {c.s.cta}<ArrowLeft size={40 * c.k} strokeWidth={2.4} />
    </div>
  );
}

function Price({ c, color, sub, cur }: { c: Ctx; color?: string; sub?: string; cur?: string }) {
  const p = c.s.price;
  if (!p) return null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, color: color ?? c.ink }}>
        <span style={{ fontSize: fit(p.value, 92 * c.k, 4, 0.6), fontWeight: 800, lineHeight: 1 }}>{p.value}</span>
        {p.currency && <span style={{ fontSize: 34 * c.k, fontWeight: 700, color: cur ?? c.accent }}>{p.currency}</span>}
        {p.old && <span style={{ fontSize: 34 * c.k, fontWeight: 700, color: sub ?? c.muted, textDecoration: "line-through" }}>{p.old}</span>}
      </div>
      {p.note && <div style={{ fontSize: 24 * c.k, fontWeight: 600, color: sub ?? c.muted, marginTop: 8 }}>{p.note}</div>}
    </div>
  );
}

function Badge({ c, bg, fg, outline }: { c: Ctx; bg?: string; fg?: string; outline?: boolean }) {
  if (!c.s.badge) return null;
  const b = bg ?? c.accent;
  return (
    <div style={{ fontSize: 26 * c.k, fontWeight: 700, borderRadius: 999, padding: "8px 28px", whiteSpace: "nowrap",
      ...(outline ? { border: `2.5px solid ${b}`, color: b } : { background: b, color: fg ?? onColor(b) }) }}>
      {c.s.badge}
    </div>
  );
}

function Avatar({ c, size, ring }: { c: Ctx; size: number; ring?: string }) {
  const p = c.s.person;
  if (!p) return null;
  const style: React.CSSProperties = { width: size, height: size, borderRadius: "50%", flex: "none", boxShadow: ring ? `0 0 0 4px ${c.bg}, 0 0 0 7px ${ring}` : undefined };
  if (p.photo?.url) return <Img src={p.photo.url} style={{ ...style, objectFit: "cover" }} />;
  return <div style={{ ...style, background: c.accent, color: c.onAccent, display: "grid", placeItems: "center", fontSize: size * 0.44, fontWeight: 800 }}>{p.name.trim().charAt(0)}</div>;
}

function Dots({ c, color }: { c: Ctx; color?: string }) {
  if (c.spec.kind !== "carousel" || c.total < 2) return null;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {Array.from({ length: c.total }, (_, i) => (
        <span key={i} style={{ width: i === c.index ? 34 : 12, height: 12, borderRadius: 6, background: i === c.index ? c.accent : mix(color ?? c.ink, c.bg, 0.75) }} />
      ))}
    </div>
  );
}

function Handle({ c, color }: { c: Ctx; color?: string }) {
  const h = c.spec.brand.handle;
  if (!h) return null;
  return <div dir="auto" style={{ fontSize: 26 * c.k, fontWeight: 700, color: color ?? c.muted }}>{h}</div>;
}


// Background decoration: layered behind every layout, so one layout has many looks.

function Deco({ c }: { c: Ctx }) {
  const d = c.spec.deco ?? "circles";
  const a = c.accent, L = c.line, S = c.soft;
  const abs: React.CSSProperties = { position: "absolute", pointerEvents: "none" };
  switch (d) {
    case "circles": return <><div style={{ ...abs, width: 760, height: 760, borderRadius: "50%", border: `3px solid ${L}`, left: -300, top: c.H * 0.36 }} /><div style={{ ...abs, width: 460, height: 460, borderRadius: "50%", border: `3px solid ${L}`, left: -150, top: c.H * 0.36 + 150 }} /></>;
    case "grid": return <div style={{ ...abs, inset: 0, opacity: 0.08, backgroundImage: `linear-gradient(${a} 2px, transparent 2px), linear-gradient(90deg, ${a} 2px, transparent 2px)`, backgroundSize: "90px 90px" }} />;
    case "dots": return <div style={{ ...abs, inset: 0, opacity: 0.16, backgroundImage: `radial-gradient(${a} 3px, transparent 3.5px)`, backgroundSize: "44px 44px", maskImage: "linear-gradient(200deg, #000 0%, transparent 55%)", WebkitMaskImage: "linear-gradient(200deg, #000 0%, transparent 55%)" }} />;
    case "blob": return <><div style={{ ...abs, width: c.W * 0.95, height: c.W * 0.95, borderRadius: "46% 54% 40% 60% / 55% 45% 55% 45%", background: S, left: -c.W * 0.4, top: -c.W * 0.3 }} /><div style={{ ...abs, width: 260, height: 260, borderRadius: "50%", background: a, opacity: 0.14, right: -60, bottom: c.H * 0.3 }} /></>;
    case "arc": return <div style={{ ...abs, width: c.W * 1.2, height: c.W * 1.2, borderRadius: "50%", background: S, left: -c.W * 0.1, top: -c.W * 0.62 }} />;
    case "lines": return <div style={{ ...abs, inset: 0, opacity: 0.1, backgroundImage: `repeating-linear-gradient(135deg, ${a} 0 2px, transparent 2px 28px)`, maskImage: "linear-gradient(180deg, transparent 40%, #000 100%)", WebkitMaskImage: "linear-gradient(180deg, transparent 40%, #000 100%)" }} />;
    case "corner": return <><div style={{ ...abs, width: 300, height: 300, background: a, left: 0, top: 0, borderBottomRightRadius: 300 }} /><div style={{ ...abs, width: 140, height: 140, border: `3px solid ${L}`, borderRadius: "50%", right: 60, bottom: c.H * 0.32 }} /></>;
    default: return null;
  }
}

// ---------------- layouts ----------------

function Classic(c: Ctx) {
  const { s } = c;
  const list = (s.items ?? []).slice(0, 3);
  const hasBar = !!(s.price || s.cta);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: `${PAD * c.k}px ${PAD}px ${hasBar ? 0 : PAD * c.k}px`, display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><BrandRow c={c} /><Badge c={c} outline /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 * c.k, paddingBlock: 30 * c.k }}>
          <Kicker c={c} />
          <Title c={c} base={104} />
          <Body c={c} max={760} />
          {list.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${list.length}, 1fr)`, gap: 22, marginTop: 18 * c.k }}>
              {list.map((it, i) => (
                <div key={i} style={{ background: c.soft, border: `2px solid ${c.line}`, borderRadius: 26, padding: `${28 * c.k}px 26px` }}>
                  <div style={{ width: 68 * c.k, height: 68 * c.k, borderRadius: 18, background: c.spec.icons === "3d" ? "transparent" : c.accent, display: "grid", placeItems: "center", marginBottom: 20 * c.k }}>
                    <DIcon name={it.icon ?? "check"} size={34 * c.k} color={c.onAccent} />
                  </div>
                  <b style={{ display: "block", fontSize: fit(it.text, 30 * c.k, 22, 0.75), fontWeight: 800, lineHeight: 1.35, color: c.ink }}>{it.text}</b>
                </div>
              ))}
            </div>
          ) : s.photo ? <Photo img={s.photo} c={c} style={{ width: "100%", flex: 1, minHeight: 200, borderRadius: 30, marginTop: 10 }} /> : null}
          <div style={{ marginTop: 14 * c.k }}><Meta list={s.meta} c={c} /></div>
        </div>
      </div>
      {hasBar && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 220 * c.k, background: c.ink, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${PAD}px` }}>
          {s.price ? <Price c={c} color={c.bg} sub={mix(c.bg, c.ink, 0.45)} cur={mix(c.accent, c.bg, 0.35)} /> : <BrandRow c={c} color={c.bg} />}
          <Cta c={c} />
        </div>
      )}
    </div>
  );
}

function Bold(c: Ctx) {
  const { s } = c;
  const list = (s.items ?? []).slice(0, 4);
  return (
    <div style={{ position: "absolute", inset: 0, color: c.ink }}>
      <div style={{ position: "absolute", inset: `${PAD * c.k}px ${PAD}px`, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 * c.k, flex: 1, minWidth: 0 }}>
            <BrandRow c={c} color={c.accent} />
            {s.kicker && <div style={{ fontSize: 38 * c.k, fontWeight: 700, color: c.muted }}>{s.kicker}</div>}
          </div>
          {s.date && (
            <div style={{ width: 220 * c.k, height: 240 * c.k, background: c.accent, color: c.onAccent, borderRadius: 28, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <div style={{ fontSize: 112 * c.k, fontWeight: 800, lineHeight: 1 }}>{s.date.day}</div>
              <div style={{ fontSize: 34 * c.k, fontWeight: 800 }}>{s.date.month}</div>
              {s.date.weekday && <div style={{ fontSize: 22 * c.k, fontWeight: 700, opacity: 0.75 }}>{s.date.weekday}</div>}
            </div>
          )}
        </div>
        <div style={{ marginTop: 20 * c.k, maxWidth: s.date ? 720 : undefined }}><Title c={c} base={112} /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBlock: 20 * c.k }}>
          {list.length > 0 && (
            <div style={{ borderTop: `2px solid ${c.line}` }}>
              {list.map((it, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, padding: `${24 * c.k}px 0`, borderBottom: `2px solid ${c.line}` }}>
                  <span style={{ fontSize: 30 * c.k, fontWeight: 800, color: c.accent, width: 56 }}>{String(i + 1).padStart(2, "0")}</span>
                  <b style={{ fontSize: fit(it.text, 38 * c.k, 28, 0.7), fontWeight: 800, flex: 1 }}>{it.text}</b>
                  <DIcon name={it.icon ?? "check"} size={40 * c.k} color={c.accent} />
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 28 * c.k }}><Meta list={s.meta} c={c} color={c.muted} size={28} /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 30 }}>
          {s.person ? (
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <Avatar c={c} size={104 * c.k} ring={c.accent} />
              <div>{s.person.role && <div style={{ fontSize: 24 * c.k, color: c.muted, fontWeight: 600 }}>{s.person.role}</div>}<b style={{ fontSize: 34 * c.k, fontWeight: 800 }}>{s.person.name}</b></div>
            </div>
          ) : <Handle c={c} />}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 }}>
            <Price c={c} />
            <Cta c={c} bg={c.ink} fg={c.bg} size={34} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoLayout(c: Ctx) {
  const { s } = c;
  const ph = c.H * (c.H > 1600 ? 0.58 : c.H > 1200 ? 0.54 : 0.48);
  return (
    <div style={{ position: "absolute", inset: 0, background: c.bg }}>
      <Photo img={s.photo} c={c} style={{ position: "absolute", top: 0, left: 0, right: 0, height: ph, width: "100%" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 220, background: "linear-gradient(rgba(0,0,0,.35), transparent)" }} />
      <div style={{ position: "absolute", top: 56, right: PAD, left: PAD, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ background: "rgba(255,255,255,.92)", borderRadius: 999, padding: c.spec.brand.logo?.url && c.spec.brand.showLogo ? "10px 22px" : "6px 24px 6px 8px" }}><BrandRow c={c} color="#14161A" /></div>
        <Badge c={c} />
      </div>
      <div style={{ position: "absolute", top: ph - 50, left: 0, right: 0, bottom: 0, background: c.bg, borderRadius: "50px 50px 0 0", padding: `${60 * c.k}px ${PAD}px ${PAD * c.k}px`, display: "flex", flexDirection: "column", gap: 20 * c.k }}>
        <Kicker c={c} />
        <Title c={c} base={92} />
        <Body c={c} size={32} />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
          {s.price ? <Price c={c} /> : <Handle c={c} />}
          <Cta c={c} />
        </div>
      </div>
    </div>
  );
}

function Offer(c: Ctx) {
  const { s } = c;
  const v = s.stat?.value ?? s.price?.value ?? "";
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: c.W * 1.1, height: c.W * 1.1, borderRadius: "50%", background: c.soft, top: -c.W * 0.45, left: -c.W * 0.05 }} />
      <div style={{ position: "absolute", inset: `${PAD * c.k}px ${PAD}px`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}><BrandRow c={c} /><Badge c={c} /></div>
        {s.photo && <Photo img={s.photo} c={c} style={{ width: 420 * c.k, height: 420 * c.k, borderRadius: "50%", marginTop: 30 * c.k, border: `10px solid ${c.bg}`, boxShadow: `0 0 0 4px ${c.accent}` }} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 18 * c.k }}>
          {v && (
            <div style={{ lineHeight: 0.9, fontWeight: 800, color: c.accent, fontSize: fit(v, (s.photo ? 230 : 320) * c.k, 4, 0.45) }}>{v}</div>
          )}
          {s.stat?.label && <div style={{ fontSize: 44 * c.k, fontWeight: 800, color: c.ink }}>{s.stat.label}</div>}
          <div style={{ marginTop: 10 }}><Title c={c} base={86} align="center" /></div>
          <Body c={c} align="center" max={820} />
        </div>
        <Meta list={s.meta} c={c} />
        <div style={{ marginTop: 34 * c.k }}><Cta c={c} size={42} /></div>
      </div>
    </div>
  );
}

function QuoteLayout(c: Ctx) {
  const { s } = c;
  const text = s.body || s.title;
  return (
    <div style={{ position: "absolute", inset: 0, background: "transparent" }}>
      <div style={{ position: "absolute", inset: `${PAD * c.k}px ${PAD}px`, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Kicker c={c} /><BrandRow c={c} /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
          <Quote size={130 * c.k} color={c.accent} fill={c.accent} strokeWidth={0} style={{ transform: "scaleX(-1)", marginBottom: 20 }} />
          <p style={{ margin: 0, fontSize: fit(text, 74 * c.k, 40, 0.55), lineHeight: 1.45, fontWeight: 800, color: c.ink }}>{text}</p>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${c.line}`, paddingTop: 34 * c.k }}>
          {s.person ? (
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <Avatar c={c} size={96 * c.k} />
              <div><b style={{ fontSize: 34 * c.k, fontWeight: 800, color: c.ink }}>{s.person.name}</b>{s.person.role && <div style={{ fontSize: 26 * c.k, color: c.muted, fontWeight: 600 }}>{s.person.role}</div>}</div>
            </div>
          ) : <div />}
          <Handle c={c} />
        </div>
      </div>
    </div>
  );
}

function Cover(c: Ctx) {
  const { s } = c;
  const photo = !!s.photo;
  const fg = photo ? "#FFFFFF" : c.ink;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {photo ? (
        <>
          <Photo img={s.photo} c={c} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.05) 35%, rgba(0,0,0,.78) 100%)" }} />
        </>
      ) : null}
      <div style={{ position: "absolute", inset: `${PAD * c.k}px ${PAD}px`, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BrandRow c={c} color={fg} />
          {c.spec.kind === "carousel" && <div style={{ fontSize: 26 * c.k, fontWeight: 700, color: photo ? "#FFFFFF" : c.muted }}>{c.total} شرائح</div>}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 26 * c.k }}>
          <Kicker c={c} color={photo ? mix(c.accent, "#FFFFFF", 0.35) : c.accent} />
          <Title c={c} base={128} color={fg} hcolor={photo ? mix(c.accent, "#FFFFFF", 0.25) : c.accent} />
          <Body c={c} color={photo ? "rgba(255,255,255,.85)" : c.muted} max={820} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 50 * c.k }}>
          <Handle c={c} color={photo ? "rgba(255,255,255,.8)" : undefined} />
          {c.spec.kind === "carousel" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: c.accent, color: c.onAccent, borderRadius: 999, padding: "16px 34px", fontSize: 30 * c.k, fontWeight: 800 }}>
              اسحب<ChevronLeft size={34 * c.k} strokeWidth={2.6} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Point(c: Ctx) {
  const { s } = c;
  const n = String(c.spec.kind === "carousel" ? c.index : c.index + 1).padStart(2, "0");
  const icon = s.items?.[0]?.icon;
  const bullets = (s.items ?? []).filter((x) => x.text).slice(0, 4);
  return (
    <div style={{ position: "absolute", inset: 0, background: "transparent", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: PAD - 20, top: (PAD - 40) * c.k, fontSize: 360 * c.k, fontWeight: 800, lineHeight: 1, color: "transparent", WebkitTextStroke: `4px ${c.line}` }}>{n}</div>
      <div style={{ position: "absolute", inset: `${PAD * c.k}px ${PAD}px`, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><BrandRow c={c} /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 * c.k }}>
          <div style={{ width: 120 * c.k, height: 120 * c.k, borderRadius: 32, background: c.spec.icons === "3d" ? "transparent" : c.accent, display: "grid", placeItems: "center" }}>
            <DIcon name={icon ?? "lightbulb"} size={62 * c.k} color={c.onAccent} />
          </div>
          <Kicker c={c} />
          <Title c={c} base={96} />
          <Body c={c} size={36} />
          {bullets.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 * c.k, marginTop: 6 }}>
              {bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 32 * c.k, fontWeight: 700, color: c.ink }}>
                  <span style={{ width: 44 * c.k, height: 44 * c.k, borderRadius: "50%", background: c.soft, border: `2px solid ${c.line}`, display: "grid", placeItems: "center", flex: "none" }}>
                    <DIcon name={b.icon && i > 0 ? b.icon : "check"} size={24 * c.k} color={c.accent} stroke={2.4} />
                  </span>
                  {b.text}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Handle c={c} /><Dots c={c} /></div>
      </div>
    </div>
  );
}

function CtaLayout(c: Ctx) {
  const { s } = c;
  return (
    <div style={{ position: "absolute", inset: 0, background: c.ink, color: c.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", border: `3px solid ${mix(c.bg, c.ink, 0.8)}`, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
      <div style={{ position: "absolute", width: 620, height: 620, borderRadius: "50%", border: `3px solid ${mix(c.bg, c.ink, 0.86)}`, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
      <div style={{ position: "absolute", inset: `${PAD * c.k}px ${PAD}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 34 * c.k }}>
        <div style={{ background: c.bg, borderRadius: 40, padding: 22, display: c.spec.brand.name || c.spec.brand.logo?.url ? "block" : "none" }}><Logo c={c} size={110 * c.k} /></div>
        <Title c={c} base={96} color={c.bg} align="center" />
        <Body c={c} color={mix(c.bg, c.ink, 0.3)} align="center" max={820} />
        <Cta c={c} size={42} />
        <Meta list={s.meta} c={c} color={c.bg} />
        <Handle c={c} color={mix(c.bg, c.ink, 0.25)} />
      </div>
    </div>
  );
}


function Bento(c: Ctx) {
  const { s } = c;
  const list = (s.items ?? []).slice(0, 4);
  const tile = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({ background: bg, borderRadius: 36, padding: 34 * c.k, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", ...extra });
  return (
    <div style={{ position: "absolute", inset: 0, background: c.bg, padding: 44, display: "grid", gap: 20, gridTemplateColumns: "1fr 1fr", gridTemplateRows: `auto 1fr ${s.price || s.cta ? "auto" : ""}` }}>
      <div style={tile(c.soft, { gridColumn: "1 / 3", gap: 22 * c.k, padding: `${44 * c.k}px 44px` })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><BrandRow c={c} /><Badge c={c} /></div>
        <Kicker c={c} />
        <Title c={c} base={98} />
        <Body c={c} size={31} />
      </div>
      {s.photo ? <Photo img={s.photo} c={c} style={{ borderRadius: 36, width: "100%", height: "100%", minHeight: 0 }} /> : (
        <div style={tile(c.accent, { justifyContent: "space-between" })}>
          <DIcon name={list[0]?.icon ?? "sparkles"} size={90 * c.k} color={c.onAccent} stroke={1.5} />
          <b style={{ fontSize: fit(list[0]?.text ?? "", 40 * c.k, 18, 0.7), fontWeight: 800, color: c.onAccent, lineHeight: 1.3 }}>{list[0]?.text}</b>
        </div>
      )}
      <div style={{ display: "grid", gap: 20, gridTemplateRows: `repeat(${Math.max(1, list.length - (s.photo ? 0 : 1))}, 1fr)` }}>
        {list.slice(s.photo ? 0 : 1).map((it, i) => (
          <div key={i} style={tile(i % 2 ? c.soft : c.ink, { flexDirection: "row", alignItems: "center", gap: 20, padding: `${22 * c.k}px 28px` })}>
            <DIcon name={it.icon ?? "check"} size={46 * c.k} color={i % 2 ? c.accent : c.bg} />
            <b style={{ fontSize: fit(it.text, 30 * c.k, 22, 0.7), fontWeight: 800, color: i % 2 ? c.ink : c.bg, lineHeight: 1.3 }}>{it.text}</b>
          </div>
        ))}
        {!list.length && <div style={tile(c.ink)}><Meta list={s.meta} c={c} color={c.bg} /></div>}
      </div>
      {(s.price || s.cta) && (
        <div style={tile(c.ink, { gridColumn: "1 / 3", flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: `${30 * c.k}px 40px` })}>
          {s.price ? <Price c={c} color={c.bg} sub={mix(c.bg, c.ink, 0.45)} cur={mix(c.accent, c.bg, 0.3)} /> : <Meta list={s.meta} c={c} color={c.bg} size={26} />}
          <Cta c={c} />
        </div>
      )}
    </div>
  );
}

function Split(c: Ctx) {
  const { s } = c;
  const wide = c.H > 1500;
  return (
    <div style={{ position: "absolute", inset: 0, background: c.bg, display: "flex", flexDirection: wide ? "column" : "row" }}>
      <div style={{ flex: "0 0 46%", position: "relative", overflow: "hidden" }}>
        <Photo img={s.photo} c={c} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        {s.badge && <div style={{ position: "absolute", top: 50, right: 40 }}><Badge c={c} /></div>}
      </div>
      <div style={{ flex: 1, padding: `${70 * c.k}px ${wide ? PAD : 60}px`, display: "flex", flexDirection: "column", gap: 24 * c.k, background: c.bg }}>
        <BrandRow c={c} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 * c.k }}>
          <Kicker c={c} line={false} />
          <Title c={c} base={wide ? 96 : 78} />
          <Body c={c} size={wide ? 34 : 29} />
          {(s.items ?? []).slice(0, 3).map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 28 * c.k, fontWeight: 700, color: c.ink }}><DIcon name={it.icon ?? "check"} size={32 * c.k} color={c.accent} />{it.text}</div>
          ))}
        </div>
        <Price c={c} />
        <div style={{ display: "flex" }}><Cta c={c} size={34} /></div>
      </div>
    </div>
  );
}

function Minimal(c: Ctx) {
  const { s } = c;
  return (
    <div style={{ position: "absolute", inset: 0, background: "transparent" }}>
      <div style={{ position: "absolute", inset: `${PAD * c.k}px ${PAD}px`, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `3px solid ${c.ink}`, paddingBottom: 26 * c.k }}>
          <BrandRow c={c} /><div style={{ fontSize: 26 * c.k, fontWeight: 700, color: c.ink }}>{s.badge ?? s.kicker ?? ""}</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 30 * c.k, paddingBottom: 40 * c.k }}>
          <h1 style={{ margin: 0, fontSize: fit(`${s.title} ${s.highlight ?? ""}`, 150 * c.k, 10, 0.45), lineHeight: 1.05, fontWeight: 800, color: c.ink, letterSpacing: -2 }}>
            {s.title}{s.highlight && <><br /><span style={{ color: c.accent }}>{s.highlight}</span></>}
          </h1>
          <Body c={c} size={34} max={760} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${c.ink}`, paddingTop: 30 * c.k, gap: 20 }}>
          {s.price ? <Price c={c} /> : <Meta list={s.meta?.slice(0, 2)} c={c} size={28} />}
          <Cta c={c} bg={c.ink} fg={c.bg} size={34} />
        </div>
      </div>
    </div>
  );
}

const RENDER = { bento: Bento, split: Split, minimal: Minimal, classic: Classic, bold: Bold, photo: PhotoLayout, offer: Offer, quote: QuoteLayout, cover: Cover, point: Point, cta: CtaLayout };

export function DesignSlide({ spec, index }: DesignProps) {
  const s = spec.slides[index] ?? spec.slides[0];
  const { width: W, height: H } = DSIZE[spec.aspect];
  const { bg, ink, accent, soft } = spec.colors;
  const c: Ctx = {
    s, spec, index, total: spec.slides.length, W, H, k: H <= 1080 ? 0.86 : 1,
    bg, ink, accent, soft, muted: mix(ink, bg, 0.38), line: mix(ink, bg, 0.84), onAccent: onColor(accent), font: spec.font,
  };
  const L = RENDER[s.layout] ?? Classic;
  return (
    <IconStyleContext.Provider value={{ style: spec.icons ?? "line", images: Object.fromEntries(Object.entries(spec.icon3d ?? {}).filter(([, v]) => v?.url).map(([k, v]) => [k, v.url])) }}>
    <div dir="rtl" lang="ar" style={{ position: "relative", width: W, height: H, overflow: "hidden", fontFamily: `"${spec.font}", "Cairo", sans-serif`, background: bg }}>
      {!["cta", "photo", "split", "bento"].includes(s.layout) && <Deco c={c} />}
      <div style={{ position: "absolute", inset: 0 }}>{L(c)}</div>
      {spec.brand.box && spec.brand.showLogo && spec.brand.logo?.url && (
        <div style={{ position: "absolute", left: spec.brand.box.x * W, top: spec.brand.box.y * H, width: spec.brand.box.w * W, height: spec.brand.box.w * W, transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Img src={spec.brand.logo.url} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}
    </div>
    </IconStyleContext.Provider>
  );
}

/** Remotion still: the worker renders one slide per call (props carry the slide index). */
export const DesignStill: React.FC<DesignProps> = (p) => <DesignSlide {...p} />;
