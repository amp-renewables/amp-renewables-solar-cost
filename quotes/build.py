#!/usr/bin/env python3
"""Render an AMP quotation page and assemble the issued PDF pack.

The quotation page is authored as HTML (self-contained, fonts embedded) and
printed to A4 with headless Chrome. Pages 2-11 are the standing EV charging
brochure, carried over unchanged from assets/ev-brochure-pages.pdf.

    python3 build.py amp-ev-quotation-leigh-coxon.html
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from pypdf import PdfReader, PdfWriter

HERE = Path(__file__).resolve().parent
BROCHURE = HERE / "assets" / "ev-brochure-pages.pdf"

CHROME_CANDIDATES = [
    os.environ.get("CHROME"),
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    shutil.which("chromium"),
    shutil.which("google-chrome"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]


def find_chrome():
    for c in CHROME_CANDIDATES:
        if c and Path(c).exists():
            return c
    sys.exit("No Chrome/Chromium found — set $CHROME to the binary.")


def render(html: Path, out: Path):
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run(
            [
                find_chrome(),
                "--headless",
                "--no-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                f"--user-data-dir={profile}",
                "--no-pdf-header-footer",
                "--virtual-time-budget=6000",
                f"--print-to-pdf={out}",
                html.resolve().as_uri(),
            ],
            check=True,
            capture_output=True,
        )


def main():
    html = Path(sys.argv[1] if len(sys.argv) > 1 else "amp-ev-quotation-leigh-coxon.html")
    if not html.is_absolute():
        html = HERE / html
    final = html.with_suffix(".pdf")

    with tempfile.TemporaryDirectory() as tmp:
        page1 = Path(tmp) / "page1.pdf"
        render(html, page1)
        writer = PdfWriter()
        for page in PdfReader(page1).pages:
            writer.add_page(page)
        quote_pages = len(writer.pages)
        for page in PdfReader(BROCHURE).pages:
            writer.add_page(page)
        with open(final, "wb") as fh:
            writer.write(fh)

    print(f"{final.name}: {quote_pages} quotation page(s) + "
          f"{len(PdfReader(BROCHURE).pages)} brochure pages")


if __name__ == "__main__":
    main()
