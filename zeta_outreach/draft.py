"""Generate personalised cold emails via Vercel AI Gateway and save them as drafts."""
import csv, email.message, imaplib, json, time
from pathlib import Path
from openai import OpenAI
from .config import LEADS, DRAFTS, env

SYSTEM = """You write short, genuine cold emails for Zeta Labs. Rules:
- Under 110 words, plain text, no hype, no fake familiarity, no false claims.
- Use ONLY facts from the pitch and the lead info; never invent metrics or relationships.
- One clear, low-pressure call to action. Do not include a signature or unsubscribe line (added later).
Return JSON: {"subject": "...", "body": "..."}"""

def client():
    return OpenAI(api_key=env("AI_GATEWAY_API_KEY"),
                  base_url=env("AI_GATEWAY_BASE_URL", "https://ai-gateway.vercel.sh/v1"))

def generate(c, pitch, lead):
    r = c.chat.completions.create(
        model=env("AI_MODEL", "anthropic/claude-sonnet-4.5"),
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": SYSTEM},
                  {"role": "user", "content": f"PITCH:\n{pitch}\n\nLEAD:\nCompany: {lead['company']}\n"
                   f"Website: {lead['domain']}\nAbout: {lead['description']}"}])
    return json.loads(r.choices[0].message.content)

FOOTER = ("\n\n--\n{name}\nZeta Labs | https://www.thezetalabs.xyz\n"
          "Not relevant? Reply \"unsubscribe\" and I won't email again.")

def build_message(to, subject, body):
    m = email.message.EmailMessage()
    m["From"] = f"{env('FROM_NAME', 'Zeta Labs')} <{env('EMAIL_ADDRESS')}>"
    m["To"], m["Subject"] = to, subject
    m["List-Unsubscribe"] = f"<mailto:{env('EMAIL_ADDRESS')}?subject=unsubscribe>"
    m.set_content(body + FOOTER.format(name=env("FROM_NAME", "Zeta Labs")))
    return m

def push_to_imap(msgs):
    with imaplib.IMAP4_SSL(env("IMAP_HOST"), int(env("IMAP_PORT", "993"))) as im:
        im.login(env("EMAIL_ADDRESS"), env("EMAIL_PASSWORD"))
        for m in msgs:
            im.append(env("IMAP_DRAFTS_FOLDER", "Drafts"), "\\Draft",
                      imaplib.Time2Internaldate(time.time()), m.as_bytes())

def run(pitch_file, limit, to_imap):
    pitch = Path(pitch_file).read_text()
    leads = list(csv.DictReader(open(LEADS)))
    done = {r["email"] for r in csv.DictReader(open(DRAFTS))} if DRAFTS.exists() else set()
    todo = [l for l in leads if l["email"] not in done][:limit]
    c, msgs, rows = client(), [], []
    for l in todo:
        d = generate(c, pitch, l)
        rows.append({"email": l["email"], "company": l["company"], "subject": d["subject"],
                     "body": d["body"], "status": "draft"})
        msgs.append(build_message(l["email"], d["subject"], d["body"]))
        print(f"drafted: {l['email']}  |  {d['subject']}")
    new_file = not DRAFTS.exists()
    with open(DRAFTS, "a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["email", "company", "subject", "body", "status"])
        if new_file:
            w.writeheader()
        w.writerows(rows)
    if to_imap and msgs:
        push_to_imap(msgs)
        print(f"{len(msgs)} drafts added to the mailbox's Drafts folder")
    print(f"Review/edit {DRAFTS}, then run `send`.")
