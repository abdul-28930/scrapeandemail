import { NextResponse } from "next/server";
import { load, save } from "@/lib/store";
import { mailOptions, transport } from "@/lib/mail";

export const maxDuration = 300;

export async function POST() {
  const s = await load();
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = s.drafts.filter((d) => d.sentAt?.startsWith(today)).length;
  const room = Math.max(0, Number(process.env.DAILY_SEND_LIMIT ?? 30) - sentToday);
  const delay = Number(process.env.SEND_DELAY_SECONDS ?? 30) * 1000;
  const queue = s.drafts.filter((d) => d.status === "approved" && !s.suppressed.includes(d.email)).slice(0, room);
  const tx = transport();
  let sent = 0, failed = 0;
  for (const d of queue) {
    try {
      await tx.sendMail(mailOptions(d));
      d.status = "sent"; d.sentAt = new Date().toISOString(); sent++;
    } catch (e) { d.status = "failed"; d.error = String(e); failed++; }
    await save(s); // persist after each send so a crash can't cause duplicates
    if (d !== queue[queue.length - 1]) await new Promise((r) => setTimeout(r, delay));
  }
  return NextResponse.json({ sent, failed, remainingToday: room - queue.length });
}
