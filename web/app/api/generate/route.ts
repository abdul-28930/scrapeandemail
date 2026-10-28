import { NextResponse } from "next/server";
import { load, save, uid } from "@/lib/store";
import { generateEmail } from "@/lib/draft";
import { saveToImapDrafts } from "@/lib/mail";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { limit = 10, imap = false } = await req.json();
  const s = await load();
  const have = new Set(s.drafts.map((d) => d.email));
  const todo = s.leads.filter((l) => !have.has(l.email) && !s.suppressed.includes(l.email)).slice(0, limit);
  const made = [];
  let error: string | undefined;
  for (const l of todo) {
    try {
      const g = await generateEmail(s.pitch, l);
      made.push({ id: uid(), email: l.email, company: l.company, subject: g.subject, body: g.body, status: "draft" as const });
    } catch (e) { error = String(e); break; }
  }
  s.drafts.push(...made);
  await save(s); // keep whatever succeeded even if a later lead failed
  if (imap && made.length) {
    try { await saveToImapDrafts(made); } catch (e) { error = "IMAP: " + String(e); }
  }
  return NextResponse.json(error ? { error, made: made.length } : { made: made.length }, { status: error ? 500 : 200 });
}
