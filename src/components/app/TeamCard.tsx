"use client";
import { useEffect, useState } from "react";
import { AGENTS, type Agent } from "@/lib/agents";
import { AgentFigure } from "@/components/AgentFigure";
import { useT } from "@/components/LangProvider";

/** Phone home: «فريق شاهين» as a card. Same team, same names as the floating assistant (it asks the same endpoint); a tap opens that member's chat. */
export function TeamCard() {
  const T = useT();
  const en = T("a", "b") === "b";
  const [team, setTeam] = useState<Agent[]>(AGENTS);
  useEffect(() => {
    fetch("/api/assistant").then((r) => r.json()).then((d: { team?: Agent[] }) => { if (Array.isArray(d.team) && d.team.length) setTeam(d.team); }).catch(() => null);
  }, []);
  const open = (key: string) => window.dispatchEvent(new CustomEvent("shaheen:chat", { detail: key }));
  const nm = (a: Agent) => (en ? a.nameEn : a.name);
  const role = (a: Agent) => (en ? a.roleEn : a.role);
  const boss = team.find((a) => a.talk) ?? team[0];
  const members = team.filter((a) => a.key !== boss?.key);
  if (!boss) return null;
  return (
    <section aria-label={T("فريق شاهين", "Team Shaheen")} className="flex flex-col gap-3 rounded-3xl border border-gold-500/40 bg-gradient-to-b from-[#071629] to-[#0D2542] p-4 text-white shadow-[0_14px_30px_-18px_rgba(10,30,54,0.7)] lg:hidden">
      <div>
        <h2 className="text-[17px] font-bold text-gold-500">{T("فريق شاهين", "Team Shaheen")}</h2>
        <p className="text-[12px] text-white/70">{T("مساعدين أذكياء، كل واحد بتخصصه", "AI assistants, each with a specialty")}</p>
      </div>
      <button type="button" onClick={() => open(boss.key)} style={{ ["--ac" as string]: boss.color }} className="flex items-center gap-3 rounded-2xl border border-gold-500/60 bg-gold-500/10 p-2.5 text-start active:scale-[0.99]">
        <span className="shc-ava"><AgentFigure id={`home-${boss.key}`} look={boss.look} color={boss.color} small /></span>
        <span className="min-w-0 flex-1">
          <b className="block text-[15px] text-gold-500">{en ? `Talk to ${boss.nameEn}, the ${boss.roleEn.toLowerCase()}` : `كلّم ${boss.role} ${boss.name}`}</b>
          <span className="block text-[12px] leading-5 text-white/75">{en ? boss.lineEn : boss.line}</span>
        </span>
      </button>
      <div className="grid grid-cols-2 gap-2.5">
        {members.map((a) => (
          <button key={a.key} type="button" onClick={() => open(a.key)} style={{ ["--ac" as string]: a.color }} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.06] px-2 py-3 text-center active:scale-[0.98]">
            <span className="shc-ava"><AgentFigure id={`home-${a.key}`} look={a.look} color={a.color} small /></span>
            <b className="text-[14px] text-gold-500">{nm(a)}</b>
            <span className="text-[12px] text-white/70">{role(a)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
