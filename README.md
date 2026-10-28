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

## Web UI (Next.js)
`web/` is a Next.js app with the same pipeline (scrape → AI draft → approve → send) and a UI.
```bash
cd web && npm install
cp .env.example .env.local   # AI_GATEWAY_API_KEY + SMTP/IMAP details
npm run dev                  # http://localhost:3000
```
Data is stored in `web/data/store.json`, so run it locally or on a host with a persistent disk
(Vercel's filesystem is ephemeral). If you expose it publicly, set `APP_PASSWORD` to gate it.
