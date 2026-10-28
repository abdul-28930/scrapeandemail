import { generateText } from "ai";
import type { Lead } from "./store";

const SYSTEM = `You write short, genuine cold emails for Zeta Labs. Rules:
- Under 110 words, plain text, no hype, no fake familiarity, no false claims.
- Use ONLY facts from the pitch and the lead info; never invent metrics or relationships.
- One clear, low-pressure call to action. Do not include a signature or unsubscribe line (added later).
Return ONLY JSON: {"subject": "...", "body": "..."}`;

export async function generateEmail(pitch: string, lead: Lead) {
  const { text } = await generateText({
    model: process.env.AI_MODEL ?? "anthropic/claude-sonnet-4.5", // routed via Vercel AI Gateway
    system: SYSTEM,
    prompt: `PITCH:\n${pitch}\n\nLEAD:\nCompany: ${lead.company}\nWebsite: ${lead.domain}\nAbout: ${lead.description}`,
  });
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json) as { subject: string; body: string };
}
