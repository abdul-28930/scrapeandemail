# Zeta Labs outreach

Scrape public business emails -> AI-write personalised drafts (Vercel AI Gateway) -> review -> send from hello@thezetalabs.xyz.

## Setup
```bash
pip install -r requirements.txt
cp .env.example .env   # add AI_GATEWAY_API_KEY and SMTP/IMAP details
# edit pitch.md with what Zeta Labs actually offers
```

## Workflow
```bash
python -m zeta_outreach scrape sites.txt          # -> data/leads.csv
python -m zeta_outreach draft --limit 20 --imap   # -> data/drafts.csv (+ mailbox Drafts)
# review/edit data/drafts.csv, set status=approved on good ones (or: approve)
python -m zeta_outreach send                      # dry run
python -m zeta_outreach send --yes                # really sends, rate-limited
python -m zeta_outreach suppress someone@x.com    # never email again
```

Safeguards: robots.txt respected, nothing sends without `approved` + `--yes`, daily cap and delay,
unsubscribe line + List-Unsubscribe header, suppression list. Keep to B2B addresses, honour opt-outs
(CAN-SPAM/GDPR/PECR), and warm up the new domain slowly (SPF/DKIM/DMARC set up first).
