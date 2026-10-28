"use client";
import { useCallback, useEffect, useState } from "react";

type Draft = { id: string; email: string; company: string; subject: string; body: string; status: string; error?: string };
type Lead = { id: string; domain: string; company: string; email: string; allEmails: string[] };
type State = { pitch: string; leads: Lead[]; drafts: Draft[]; suppressed: string[]; env: { ai: boolean; smtp: boolean; imap: boolean; from: string } };

const TABS = ["Leads", "Drafts", "Pitch & Setup"] as const;

export default function Home() {
  const [s, setS] = useState<State | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Leads");
  const [sites, setSites] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => setS(await (await fetch("/api/state")).json()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const put = async (patch: Partial<State>) => { await fetch("/api/state", { method: "PUT", body: JSON.stringify(patch) }); await refresh(); };
  const call = async (name: string, url: string, body?: object) => {
    setBusy(name); setMsg("");
    try {
      const r = await fetch(url, { method: "POST", body: JSON.stringify(body ?? {}) });
      const j = await r.json();
      setMsg(r.ok ? JSON.stringify(j) : "Error: " + (j.error ?? r.status));
    } catch (e) { setMsg("Error: " + e); }
    setBusy(""); refresh();
  };

  if (!s) return <main>Loading…</main>;
  const setDraft = (id: string, p: Partial<Draft>) => put({ drafts: s.drafts.map((d) => (d.id === id ? { ...d, ...p } : d)) });
  const approved = s.drafts.filter((d) => d.status === "approved").length;

  return (
    <main>
      <h1>Zeta Outreach</h1>
      <div className="mut">Scrape → AI draft → review → send from {s.env.from || "your mailbox"}</div>
      <div className="row" style={{ marginTop: 10 }}>
        {([["AI Gateway", s.env.ai], ["SMTP", s.env.smtp], ["IMAP", s.env.imap]] as const).map(([n, ok]) => (
          <span key={n} className="pill"><span className={"dot" + (ok ? " on" : "")} />{n}</span>
        ))}
      </div>
      <nav className="tabs">{TABS.map((t) => <button key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}{t === "Leads" ? ` (${s.leads.length})` : t === "Drafts" ? ` (${s.drafts.length})` : ""}</button>)}</nav>
      {msg && <div className="card mut">{msg}</div>}

      {tab === "Leads" && <>
        <div className="card">
          <b>Find emails</b> <span className="mut">— one website per line (max 25 per run; robots.txt respected)</span>
          <textarea value={sites} onChange={(e) => setSites(e.target.value)} placeholder={"acme.com\nexample.io"} />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" disabled={!!busy || !sites.trim()} onClick={() => call("scrape", "/api/scrape", { sites: sites.split("\n") })}>{busy === "scrape" ? "Scraping…" : "Scrape"}</button>
            <button className="btn sec" disabled={!!busy || !s.leads.length} onClick={() => call("gen", "/api/generate", { limit: 10 })}>{busy === "gen" ? "Writing…" : "Generate drafts (10)"}</button>
            <button className="btn sec" disabled={!!busy || !s.leads.length || !s.env.imap} onClick={() => call("gen", "/api/generate", { limit: 10, imap: true })}>Generate + save to mailbox Drafts</button>
          </div>
        </div>
        {s.leads.map((l) => (
          <div key={l.id} className="card row" style={{ justifyContent: "space-between" }}>
            <div><b>{l.company}</b> <span className="mut">{l.domain}</span><div>{l.email}</div>{l.allEmails.length > 1 && <div className="mut" style={{ fontSize: 12 }}>also: {l.allEmails.slice(1).join(", ")}</div>}</div>
            <div className="row">
              <button className="btn sec" onClick={() => put({ suppressed: [...s.suppressed, l.email], leads: s.leads.filter((x) => x.id !== l.id) })}>Never email</button>
              <button className="btn sec" onClick={() => put({ leads: s.leads.filter((x) => x.id !== l.id) })}>Remove</button>
            </div>
          </div>
        ))}
        {!s.leads.length && <div className="mut">No leads yet.</div>}
      </>}

      {tab === "Drafts" && <>
        <div className="card row" style={{ justifyContent: "space-between" }}>
          <span>{approved} approved · sends are rate-limited server-side</span>
          <div className="row">
            <button className="btn sec" onClick={() => put({ drafts: s.drafts.map((d) => (d.status === "draft" ? { ...d, status: "approved" } : d)) })}>Approve all</button>
            <button className="btn" disabled={!!busy || !approved || !s.env.smtp} onClick={() => confirm(`Send ${approved} email(s) now?`) && call("send", "/api/send")}>{busy === "send" ? "Sending…" : `Send ${approved} approved`}</button>
          </div>
        </div>
        {s.drafts.map((d) => (
          <div key={d.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div><b>{d.company}</b> <span className="mut">{d.email}</span> <span className={"pill " + d.status}>{d.status}</span></div>
              {(d.status === "draft" || d.status === "approved") && <div className="row">
                <button className="btn sec" onClick={() => setDraft(d.id, { status: d.status === "draft" ? "approved" : "draft" })}>{d.status === "draft" ? "Approve" : "Unapprove"}</button>
                <button className="btn sec" onClick={() => put({ drafts: s.drafts.filter((x) => x.id !== d.id) })}>Delete</button>
              </div>}
            </div>
            {d.error && <div style={{ color: "var(--bad)", fontSize: 12 }}>{d.error}</div>}
            <input defaultValue={d.subject} disabled={d.status === "sent"} onBlur={(e) => e.target.value !== d.subject && setDraft(d.id, { subject: e.target.value })} style={{ margin: "8px 0" }} />
            <textarea defaultValue={d.body} disabled={d.status === "sent"} onBlur={(e) => e.target.value !== d.body && setDraft(d.id, { body: e.target.value })} />
          </div>
        ))}
        {!s.drafts.length && <div className="mut">No drafts yet. Generate them from the Leads tab.</div>}
      </>}

      {tab === "Pitch & Setup" && <>
        <div className="card">
          <b>Pitch</b> <span className="mut">— the AI only uses this to describe Zeta Labs</span>
          <textarea style={{ minHeight: 240 }} defaultValue={s.pitch} onBlur={(e) => put({ pitch: e.target.value })} />
        </div>
        <div className="card">
          <b>Do-not-email list ({s.suppressed.length})</b>
          <div className="mut">{s.suppressed.join(", ") || "empty"}</div>
          <input placeholder="add address + Enter" onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value) { put({ suppressed: [...s.suppressed, e.currentTarget.value.toLowerCase()] }); e.currentTarget.value = ""; } }} style={{ marginTop: 8 }} />
        </div>
        <div className="card mut">Credentials live in <code>web/.env.local</code> (see <code>.env.example</code>). Dots at the top show which are configured.</div>
      </>}
    </main>
  );
}
