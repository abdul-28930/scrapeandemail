"""Collect publicly listed business emails from company sites."""
import csv, re, time
from urllib.parse import urljoin, urlparse
from urllib import robotparser
import requests
from bs4 import BeautifulSoup
from .config import LEADS

UA = "ZetaLabsOutreachBot/1.0 (+https://www.thezetalabs.xyz; hello@thezetalabs.xyz)"
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+")
PATHS = ["", "/contact", "/about", "/team", "/contact-us", "/about-us"]
BAD_TLD = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".js", ".css")
ROLE_FIRST = ("info", "hello", "contact", "team", "founders", "sales", "partnerships")
SKIP = ("noreply", "no-reply", "sentry", "example.", "wixpress", "privacy", "abuse")

def allowed(url, cache={}):
    root = "{0.scheme}://{0.netloc}".format(urlparse(url))
    if root not in cache:
        rp = robotparser.RobotFileParser(root + "/robots.txt")
        try:
            rp.read()
        except Exception:
            rp = None
        cache[root] = rp
    rp = cache[root]
    return rp is None or rp.can_fetch(UA, url)

def fetch(url):
    if not allowed(url):
        return None
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=10)
        if r.ok and "text/html" in r.headers.get("content-type", ""):
            return r.text
    except requests.RequestException:
        pass
    return None

def scrape_site(site):
    if not site.startswith("http"):
        site = "https://" + site
    domain = urlparse(site).netloc.removeprefix("www.")
    emails, name, desc = {}, "", ""
    for p in PATHS:
        html = fetch(urljoin(site, p))
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        if not name and soup.title and soup.title.string:
            name = soup.title.string.strip().split("|")[0].split("-")[0].strip()
        if not desc:
            m = soup.find("meta", attrs={"name": "description"})
            desc = (m.get("content", "") if m else "")[:300]
        found = [a["href"][7:].split("?")[0] for a in soup.select("a[href^='mailto:']")]
        found += EMAIL_RE.findall(soup.get_text(" "))
        for e in found:
            e = e.strip().lower().rstrip(".")
            if e.endswith(BAD_TLD) or any(s in e for s in SKIP):
                continue
            emails[e] = e.endswith("@" + domain) or e.split("@")[1].endswith("." + domain)
        time.sleep(1)
    # prefer addresses on the company's own domain
    ranked = sorted(emails, key=lambda e: (not emails[e], e.split("@")[0] not in ROLE_FIRST))
    return {"domain": domain, "company": name or domain, "description": desc,
            "email": ranked[0] if ranked else "", "all_emails": ";".join(ranked)}

def run(sites_file):
    sites = [l.strip() for l in open(sites_file) if l.strip() and not l.startswith("#")]
    rows = []
    for s in sites:
        row = scrape_site(s)
        print(f"{s}: {row['email'] or 'no email found'}")
        rows.append(row)
    seen = set()
    if LEADS.exists():
        seen = {r["email"] for r in csv.DictReader(open(LEADS))}
    new = [r for r in rows if r["email"] and r["email"] not in seen]
    write_header = not LEADS.exists()
    with open(LEADS, "a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["domain", "company", "description", "email", "all_emails"])
        if write_header:
            w.writeheader()
        w.writerows(new)
    print(f"{len(new)} new leads -> {LEADS}")
