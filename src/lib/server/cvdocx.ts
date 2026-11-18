import "server-only";
import { AlignmentType, BorderStyle, Document, ExternalHyperlink, Packer, Paragraph, TabStopType, TextRun } from "docx";
import { secTitle, type CVSpec } from "@/cv/spec";

/** The Word version: a clean single-column layout (editable, and readable by recruiting systems). The designed version is the PDF. */
export async function buildCVDocx(s: CVSpec): Promise<Buffer> {
  const ar = s.lang === "ar";
  const font = ar ? "Arial" : "Calibri";
  const col = s.accent.slice(1).toUpperCase();
  const run = (t: string, o: { b?: boolean; size?: number; color?: string } = {}) => new TextRun({ text: t, font, rightToLeft: ar, bold: o.b, size: o.size ?? 22, color: o.color });
  const P = (children: TextRun[], o: { after?: number; before?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bullet?: boolean; border?: boolean } = {}) =>
    new Paragraph({
      bidirectional: ar, alignment: o.align ?? (ar ? AlignmentType.RIGHT : AlignmentType.LEFT), spacing: { after: o.after ?? 60, before: o.before ?? 0 },
      ...(o.bullet ? { bullet: { level: 0 } } : {}),
      ...(o.border ? { border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: col, space: 2 } } } : {}),
      tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
      children,
    });
  const H = (k: Parameters<typeof secTitle>[1]) => P([run(secTitle(s, k), { b: true, size: 26, color: col })], { before: 220, after: 100, border: true });
  const hid = (k: string) => s.hidden.includes(k as never);
  const out: Paragraph[] = [];
  const p = s.person;
  out.push(P([run(p.name, { b: true, size: 44, color: col })], { after: 20 }));
  if (p.title) out.push(P([run(p.title, { size: 28, color: "444444" })], { after: 80 }));
  const contacts = [p.phone, p.email, p.city, p.linkedin, p.website].filter(Boolean).join("  |  ");
  if (contacts) out.push(P([run(contacts, { size: 20, color: "555555" })], { after: 60 }));
  if (s.details.length) out.push(P([run(s.details.map((d) => `${d.label}: ${d.value}`).join("  |  "), { size: 20, color: "555555" })], { after: 60 }));
  if (!hid("summary") && s.summary) { out.push(H("summary")); out.push(P([run(s.summary)])); }
  if (!hid("experience") && s.experience.length) {
    out.push(H("experience"));
    for (const e of s.experience) {
      out.push(P([run(e.role, { b: true, size: 24 }), run(`\t${[e.from, e.to].filter(Boolean).join(" – ")}`, { size: 20, color: "666666" })], { after: 10, before: 80 }));
      const co = [e.company, e.place].filter(Boolean).join(" · ");
      if (co) out.push(P([run(co, { b: true, color: col })], { after: 30 }));
      for (const b of e.bullets) out.push(P([run(b)], { bullet: true, after: 20 }));
    }
  }
  if (!hid("education") && s.education.length) {
    out.push(H("education"));
    for (const e of s.education) {
      out.push(P([run(e.degree, { b: true, size: 23 }), run(`\t${[e.from, e.to].filter(Boolean).join(" – ")}`, { size: 20, color: "666666" })], { after: 10, before: 60 }));
      const sc = [e.school, e.place].filter(Boolean).join(" · ");
      if (sc) out.push(P([run(sc, { color: col, b: true })], { after: 20 }));
      if (e.note) out.push(P([run(e.note, { size: 20 })]));
    }
  }
  if (!hid("skills") && s.skills.length) { out.push(H("skills")); out.push(P([run(s.skills.join("  •  "))])); }
  if (!hid("languages") && s.languages.length) { out.push(H("languages")); out.push(P([run(s.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join("  •  "))])); }
  if (!hid("courses") && s.courses.length) { out.push(H("courses")); for (const c of s.courses) out.push(P([run(c.name, { b: true }), run([c.org, c.year].filter(Boolean).length ? `  —  ${[c.org, c.year].filter(Boolean).join(" · ")}` : "")], { bullet: true, after: 20 })); }
  if (!hid("extra")) for (const x of s.extra) { out.push(P([run(x.title || secTitle(s, "extra"), { b: true, size: 26, color: col })], { before: 220, after: 100, border: true })); for (const i of x.items) out.push(P([run(i)], { bullet: true, after: 20 })); }
  void ExternalHyperlink;
  const doc = new Document({
    creator: p.name || "Shaheen", title: `${p.name} — CV`,
    styles: { default: { document: { run: { font, size: 22 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: out }],
  });
  return Packer.toBuffer(doc);
}
