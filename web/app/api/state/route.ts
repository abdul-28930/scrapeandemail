import { NextResponse } from "next/server";
import { load, save, Store } from "@/lib/store";

export async function GET() {
  const s = await load();
  const env = {
    ai: !!process.env.AI_GATEWAY_API_KEY,
    smtp: !!(process.env.SMTP_HOST && process.env.EMAIL_PASSWORD),
    imap: !!(process.env.IMAP_HOST && process.env.EMAIL_PASSWORD),
    from: process.env.EMAIL_ADDRESS ?? "",
  };
  return NextResponse.json({ ...s, env });
}

// Client-side edits: pitch, draft edits/approvals, deletions, suppression list.
export async function PUT(req: Request) {
  const patch = (await req.json()) as Partial<Pick<Store, "pitch" | "drafts" | "leads" | "suppressed">>;
  const s = await load();
  await save({ ...s, ...patch });
  return NextResponse.json({ ok: true });
}
