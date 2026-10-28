import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
DATA = Path("data")
DATA.mkdir(exist_ok=True)
LEADS = DATA / "leads.csv"
DRAFTS = DATA / "drafts.csv"
SUPPRESS = DATA / "suppressed.txt"
SENT_LOG = DATA / "sent.csv"

def env(name, default=""):
    return os.getenv(name, default)
