# Customer quotations

Branded AMP Renewables quotations, authored as HTML and issued as PDF.

## Layout

| File | What it is |
| --- | --- |
| `amp-ev-quotation-<customer>.html` | The quotation page — self-contained (Plus Jakarta Sans embedded), A4, print-exact |
| `amp-ev-quotation-<customer>.pdf` | The issued pack: quotation page + the 10-page EV charging brochure |
| `assets/ev-brochure-pages.pdf` | The standing EV charging brochure (pages 2–11), carried over unchanged |
| `assets/PlusJakartaSans-variable-latin.woff2` | The brand face, as embedded in the HTML |
| `build.py` | Renders the HTML with headless Chrome and appends the brochure |

## Issuing an amended quote

1. Copy the newest `amp-ev-quotation-*.html` to a new customer filename.
2. Edit the `CUSTOMER DETAILS` block near the top of the `<body>` — name and
   address, reference, date, validity. Change the charger, prices or battery
   table only if the proposal itself has changed.
3. Rebuild and check the PDF:

   ```
   python3 build.py amp-ev-quotation-<customer>.html
   ```

   Requires `pypdf` and a Chrome/Chromium binary (set `$CHROME` if it is not on
   the usual paths).

## Notes on the layout

The page is authored in points at exact A4 metrics, with the `--t-*` custom
properties holding calibrated glyph-top positions so the print matches the
issued house layout to within a fraction of a point. Two measures are load
bearing — `.intro` (464pt) and `.note` (516pt) — because they set where those
paragraphs wrap; the feature list's `padding-right` does the same inside the
charger card. Adjust them only if you re-flow that copy deliberately.
