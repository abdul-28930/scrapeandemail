"""Send reviewed drafts over SMTP, rate-limited, honouring the suppression list."""
import csv, smtplib, ssl, time, datetime
from .config import DRAFTS, SUPPRESS, SENT_LOG, env
from .draft import build_message

def run(dry_run):
    suppressed = set(SUPPRESS.read_text().split()) if SUPPRESS.exists() else set()
    rows = list(csv.DictReader(open(DRAFTS)))
    limit = int(env("DAILY_SEND_LIMIT", "30"))
    delay = int(env("SEND_DELAY_SECONDS", "60"))
    pending = [r for r in rows if r["status"] == "approved" and r["email"] not in suppressed][:limit]
    print(f"{len(pending)} approved drafts to send (set status=approved in {DRAFTS} to approve)")
    if dry_run:
        for r in pending:
            print("would send:", r["email"], "|", r["subject"])
        return
    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(env("SMTP_HOST"), int(env("SMTP_PORT", "465")), context=ctx) as s:
        s.login(env("EMAIL_ADDRESS"), env("EMAIL_PASSWORD"))
        for r in pending:
            s.send_message(build_message(r["email"], r["subject"], r["body"]))
            r["status"] = "sent"
            with open(SENT_LOG, "a", newline="") as f:
                csv.writer(f).writerow([r["email"], r["subject"], datetime.datetime.utcnow().isoformat()])
            print("sent:", r["email"])
            with open(DRAFTS, "w", newline="") as f:  # persist status after every send
                w = csv.DictWriter(f, fieldnames=rows[0].keys()); w.writeheader(); w.writerows(rows)
            time.sleep(delay)
