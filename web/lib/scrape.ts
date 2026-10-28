import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import type { Lead } from "./store";
import { uid } from "./store";

const UA = "ZetaLabsOutreachBot/1.0 (+https://www.thezetalabs.xyz; hello@thezetalabs.xyz)";
const PATHS = ["", "/contact", "/about", "/team", "/contact-us", "/about-us"];
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const BAD = /\.(png|jpe?g|gif|svg|webp|js|css)$|noreply|no-reply|sentry|example\.|wixpress|privacy|abuse/;
const ROLE = ["info", "hello", "contact", "team", "founders", "sales", "partnerships"];

const robots = new Map<string, ReturnType<typeof robotsParser> | null>();
async function allowed(url: string) {
  const root = new URL(url).origin;
  if (!robots.has(root)) {
    try {
      const r = await fetch(root + "/robots.txt", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
      robots.set(root, r.ok ? robotsParser(root + "/robots.txt", await r.text()) : null);
    } catch { robots.set(root, null); }
  }
  return robots.get(root)?.isAllowed(url, UA) ?? true;
}

async function page(url: string) {
  if (!(await allowed(url))) return null;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    if (r.ok && (r.headers.get("content-type") ?? "").includes("text/html")) return await r.text();
  } catch {}
  return null;
}

export async function scrapeSite(raw: string): Promise<Lead> {
  const site = raw.startsWith("http") ? raw : "https://" + raw;
  const domain = new URL(site).host.replace(/^www\./, "");
  const found = new Map<string, boolean>();
  let company = "", description = "";
  for (const p of PATHS) {
    const html = await page(new URL(p, site).toString());
    if (!html) continue;
    const $ = cheerio.load(html);
    if (!company) company = ($("title").first().text().split(/[|\-–]/)[0] ?? "").trim();
    if (!description) description = ($('meta[name="description"]').attr("content") ?? "").slice(0, 300);
    const cands = $("a[href^='mailto:']").map((_, a) => $(a).attr("href")!.slice(7).split("?")[0]).get();
    cands.push(...($.text().match(EMAIL_RE) ?? []));
    for (let e of cands) {
      e = e.trim().toLowerCase().replace(/\.$/, "");
      if (!e.includes("@") || BAD.test(e)) continue;
      const host = e.split("@")[1];
      found.set(e, host === domain || host.endsWith("." + domain));
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const ranked = [...found.keys()].sort((a, b) => {
    const k = (e: string) => (found.get(e) ? 0 : 2) + (ROLE.includes(e.split("@")[0]) ? 0 : 1);
    return k(a) - k(b) || a.localeCompare(b);
  });
  return { id: uid(), domain, company: company || domain, description, email: ranked[0] ?? "", allEmails: ranked };
}
