"use client";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AGENTS, type Agent } from "@/lib/agents";
import { AgentFigure } from "@/components/AgentFigure";
import { useT } from "@/components/LangProvider";

/** Phone home: the team in their office (same room, same desks and same people as the «كلّم شاهين» window — it reads the same team list).
 *  The card is sized to fill what is left of the screen, and the page does not scroll while it is shown. A tap opens that member's chat. */
export function TeamCard() {
  const T = useT();
  const en = T("a", "b") === "b";
  const [team, setTeam] = useState<Agent[]>(AGENTS);
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    fetch("/api/assistant").then((r) => r.json()).then((d: { team?: Agent[] }) => { if (Array.isArray(d.team) && d.team.length) setTeam(d.team); }).catch(() => null);
  }, []);

  // fill the rest of the screen (above the bottom bar) and keep the page still
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const phone = window.matchMedia("(max-width: 1023px)");
    const fit = () => {
      if (!phone.matches) { el.style.height = ""; document.documentElement.style.overflow = ""; return; }
      const bar = document.querySelector<HTMLElement>("[data-mobile-nav]")?.offsetHeight ?? 70;
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `${Math.max(300, window.innerHeight - top - bar - 12)}px`;
      document.documentElement.style.overflow = "hidden";
    };
    fit();
    const late = setTimeout(fit, 400); // after the fonts have settled the height above
    window.addEventListener("resize", fit);
    return () => { clearTimeout(late); window.removeEventListener("resize", fit); document.documentElement.style.overflow = ""; el.style.height = ""; };
  }, []);

  const open = (key: string) => window.dispatchEvent(new CustomEvent("shaheen:chat", { detail: key }));
  const nm = (a: Agent) => (en ? a.nameEn : a.name);
  const boss = team.find((a) => a.talk) ?? team[0];
  if (!boss) return null;
  const members = team.filter((a) => a.key !== boss.key);
  const pods = Array.from({ length: Math.ceil(members.length / 2) }, (_, i) => members.slice(i * 2, i * 2 + 2));

  return (
    <section ref={box} aria-label={T("فريق شاهين", "Team Shaheen")} style={{ ["--ac" as string]: "#F2C55C" }}
      className="relative overflow-hidden rounded-3xl border border-gold-500/40 bg-[#030B16] text-white shadow-[0_14px_30px_-18px_rgba(10,30,54,0.7)] lg:hidden">
      <div className="shc-bg" aria-hidden="true"><span className="shc-grid" /><span className="shc-beam" /></div>
      <div className="relative flex h-full flex-col">
        <h2 className="flex items-center gap-2 px-4 pt-3 text-[16px] font-bold text-gold-500"><Image src="/brand/eagle.png" alt="" width={22} height={22} />{T("فريق شاهين", "Team Shaheen")}</h2>
        <div className="shc-office home-office">
          <div className="shc-headrow">
            <button type="button" onClick={() => open(boss.key)} className="shc-bosspill" style={{ ["--ac" as string]: boss.color }}>
              <span className="shc-ava"><AgentFigure id={`home-${boss.key}`} look={boss.look} color={boss.color} small /></span>
              <span className="shc-bosst"><b><span className="shc-dot" />{en ? `Talk to ${boss.nameEn}, the ${boss.roleEn.toLowerCase()}` : `كلّم ${boss.role} ${boss.name}`}</b><i>{en ? boss.lineEn : boss.line}</i></span>
            </button>
          </div>
          <div className="shc-pods">
            {pods.map((pair, pi) => (
              <div key={pi} className="shc-pod">
                {pair.map((a, ai) => (
                  <div key={a.key} className="shc-seatw">
                    <button type="button" onClick={() => open(a.key)} className="shc-seat" style={{ ["--ac" as string]: a.color }} aria-label={`${nm(a)}، ${en ? a.roleEn : a.role}`}>
                      <span className="shc-tag"><span className="shc-dot" />{nm(a)}</span>
                      <span className="shc-role">{en ? a.roleEn : a.role}</span>
                      <AgentFigure id={`home-${a.key}`} look={a.look} color={a.color} flip={en ? ai === 1 : ai === 0} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
