import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/server/auth";
import { signedResultUrls } from "@/lib/providers/storage";

/** The customer's own earlier pictures (made in Shaheen), so they can be put into a video. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("output").eq("status", "done").order("created_at", { ascending: false }).limit(40);
  const files = (data ?? []).flatMap((r) => ((r.output as { files?: { path: string; type: string }[] })?.files ?? []))
    .filter((f) => String(f.type).startsWith("image") && f.path.startsWith(`${user.id}/`)).slice(0, 24);
  const urls = await signedResultUrls(files.map((f) => f.path), 60 * 30);
  return NextResponse.json({ items: files.map((f, i) => ({ path: f.path, url: urls[i] })).filter((x) => x.url) });
}
