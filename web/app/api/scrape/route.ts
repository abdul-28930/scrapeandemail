import { NextResponse } from "next/server";
import { load, save } from "@/lib/store";
import { scrapeSite } from "@/lib/scrape";

export const maxDuration = 300;

export async function POST(req: Request) {
  const { sites } = (await req.json()) as { sites: string[] };
  const s = await load();
  const added = [];
  for (const site of sites.map((x) => x.trim()).filter(Boolean).slice(0, 25)) {
    const lead = await scrapeSite(site).catch(() => null);
    if (lead?.email && !s.leads.some((l) => l.email === lead.email) && !s.suppressed.includes(lead.email)) {
      s.leads.push(lead);
      added.push(lead);
    }
  }
  await save(s);
  return NextResponse.json({ added: added.length, total: s.leads.length });
}
