import { promises as fs } from "fs";
import path from "path";

export type Lead = { id: string; domain: string; company: string; description: string; email: string; allEmails: string[] };
export type Draft = { id: string; email: string; company: string; subject: string; body: string; status: "draft" | "approved" | "sent" | "failed"; sentAt?: string; error?: string };
export type Store = { pitch: string; leads: Lead[]; drafts: Draft[]; suppressed: string[] };

const FILE = path.join(process.cwd(), "data", "store.json");
const EMPTY: Store = {
  pitch: "## What Zeta Labs does\n(fill in)\n\n## Who it's for\n\n## Key benefits\n\n## Call to action\n\n## Sender name\n",
  leads: [], drafts: [], suppressed: [],
};

export async function load(): Promise<Store> {
  try { return { ...EMPTY, ...JSON.parse(await fs.readFile(FILE, "utf8")) }; } catch { return structuredClone(EMPTY); }
}
export async function save(s: Store) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(s, null, 2));
}
export const uid = () => Math.random().toString(36).slice(2, 10);
