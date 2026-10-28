import argparse
from . import scrape, draft, send
from .config import SUPPRESS

p = argparse.ArgumentParser(prog="zeta_outreach")
sub = p.add_subparsers(dest="cmd", required=True)
a = sub.add_parser("scrape", help="find public emails on sites listed in a file")
a.add_argument("sites_file")
b = sub.add_parser("draft", help="AI-write emails for new leads")
b.add_argument("--pitch", default="pitch.md")
b.add_argument("--limit", type=int, default=20)
b.add_argument("--imap", action="store_true", help="also save into the mailbox Drafts folder")
c = sub.add_parser("approve", help="mark all drafts approved (after you reviewed them)")
d = sub.add_parser("send", help="send approved drafts")
d.add_argument("--yes", action="store_true", help="actually send (default is dry run)")
e = sub.add_parser("suppress", help="add an address to the do-not-email list")
e.add_argument("address")
args = p.parse_args()

if args.cmd == "scrape":
    scrape.run(args.sites_file)
elif args.cmd == "draft":
    draft.run(args.pitch, args.limit, args.imap)
elif args.cmd == "approve":
    import csv
    from .config import DRAFTS
    rows = list(csv.DictReader(open(DRAFTS)))
    for r in rows:
        if r["status"] == "draft":
            r["status"] = "approved"
    with open(DRAFTS, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys()); w.writeheader(); w.writerows(rows)
    print("approved", sum(r["status"] == "approved" for r in rows))
elif args.cmd == "send":
    send.run(dry_run=not args.yes)
elif args.cmd == "suppress":
    with open(SUPPRESS, "a") as f:
        f.write(args.address.lower() + "\n")
