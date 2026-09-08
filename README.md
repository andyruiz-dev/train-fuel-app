# Train & Fuel — rebuild scaffold

Fresh start per the pivot: AI-generated programs at 1/3/6/9/12-month lengths,
muscle-group-matched exercise variation to avoid boredom, an exercise library
that uploaded/imported programs also draw from, and real persistence so
history/stats/programs survive a refresh, a cache clear, or a new device.

## What's here

- `index.html` — the whole app (single file, no build step, same approach as before)
- `manifest.json`, `sw.js` — PWA shell + versioned service worker (network-first,
  never caches `/api/*`, so a normal refresh always gets the latest deploy —
  no more "hard refresh after every push")
- `icons/icon.svg` (+ rasterized `icon-192.png`, `icon-512.png`) — placeholder
  icon (concept 3, "ascending bars") pending your pick from the four options
- `worker/worker.js` — Cloudflare Worker: state API, exercise/program CRUD,
  and the two Claude API proxy endpoints (generate, import)
- `worker/schema.sql` — D1 table definitions
- `worker/wrangler.toml` — Worker config (needs your D1 database ID filled in)

## Why this fixes the "everything breaks" problem

The old app only wrote to `localStorage`, which browsers wipe when someone
clears site data. This version writes to both: `localStorage` as an instant
local cache (so the UI never waits on a network round trip), and a **D1
database** — free, serverless SQLite that lives on Cloudflare's servers,
attached to the same Worker you already built — as the actual source of
truth. Clearing cache, reinstalling, or opening the app on a new device just
re-syncs from D1. There's also a manual export/import JSON backup in Settings
as a second safety net, independent of the cloud sync.

## One-time setup

1. **Create the D1 database** (from your machine, with `wrangler` installed):
   ```
   npx wrangler d1 create train-fuel-db
   ```
   Copy the `database_id` it prints into `worker/wrangler.toml`.

2. **Apply the schema:**
   ```
   npx wrangler d1 execute train-fuel-db --file=worker/schema.sql --remote
   ```

3. **Set your Anthropic API key as a secret** (never put it in a file):
   ```
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

4. **Deploy the Worker:**
   ```
   cd worker && npx wrangler deploy
   ```
   This gives you a URL like `https://train-fuel.<your-subdomain>.workers.dev`.

5. **Push the static files** (`index.html`, `manifest.json`, `sw.js`, `icons/`)
   to a new GitHub repo, enable GitHub Pages on it.

6. **Open the app, go to Settings, paste the Worker URL from step 4, save.**
   The sync dot in the header turns solid once it's connected.

## What's intentionally not built yet

This is scaffolding, not the finished app — the four tabs are wired end-to-end
(you can generate a program, upload one, browse/delete the library, generate a
day's workout) but still need:

- Food/nutrition logging (dropped from this pass, can be re-added on the same
  D1 pattern)
- Progress charts (weight trend, volume/week) — the data model already
  supports them, just needs the chart rendering
- Weekly Sunday review / advance-vs-repeat flow
- Rest timers and the in-session workout UI

None of these require changing how data is stored, so adding them won't risk
breaking what's already saved — that was the core ask.
