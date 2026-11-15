# Test tools

Headless-browser checks for Train & Fuel. They use **synthetic sample data** (`seed.js`), never real
personal data. Setup once: `npm i playwright && npx playwright install chromium`.

| Script | What it does |
|---|---|
| `check.sh` | Fast safety check (~1 min): app loads on every tab with no JS errors, fonts load offline, opens on Coach, "est." tag, and the two-device sync scenarios. Run before every push. |
| `two-devices.js` | Two simulated phones sharing one fake server: concurrent adds, a setting change, a deletion, same-field conflict, idle refresh, offline-then-reconnect. |
| `sigdump.js <outdir> [file]` | Dumps computed styles for every element in 72 app states (4 themes, tabs, open panels). |
| `sigdiff.py <dirA> <dirB>` | Compares two dumps; "72/72 identical" means a CSS or markup refactor changed nothing visible. Run `sigdump.js` on the old and new build, then diff. |
| `shoot.js <outdir> [file]` + `pixeldiff.py` | Pixel screenshots of the same states and a pixel diff (needs Pillow). |
| `smoke.js`, `boot.js`, `est-tag.js` | Single-purpose checks used by `check.sh`. |

Refactor recipe: copy `index.html` + `styles.css` + `js/` of the old build to a folder, run `sigdump.js`
on both, then `sigdiff.py`. Note that the data seeds and a fixed fake clock keep results deterministic.
Tip: `ONLY=autumn:rest node tools/sigdump.js <outdir>` dumps just one theme:scenario (themes autumn|winter|spring|summer; scenarios rest|train|done) for a faster check.
