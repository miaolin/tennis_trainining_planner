# Tennis camp planner

A single-page planner for a two-week junior tennis camp. Drag session types onto
morning/afternoon slots, and the page keeps a running tally of daily and weekly
hours with load warnings (heavy days, no rest day, too little peer time, and so on).

Everything lives in `vercel-deploy/index.html` — no build step, no dependencies,
no backend. Plans are saved to the browser's `localStorage`, so they persist
per-device.

```
vercel-deploy/
  index.html    the entire site
  vercel.json   cache + security headers
```

## Run locally

Open `vercel-deploy/index.html` in a browser, or serve the folder:

```sh
cd vercel-deploy && python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

**Vercel** — deploy from inside the folder, so `vercel.json` is picked up:

```sh
cd vercel-deploy
npx vercel          # preview
npx vercel --prod   # production
```

Importing the repo from the Vercel dashboard instead? Set **Root Directory** to
`vercel-deploy`. Framework preset: *Other*; no build command.

**Any static host** — upload `vercel-deploy/index.html`. That single file is the
whole site.

**GitHub Pages** — Pages' branch source only serves `/` or `/docs`, so it cannot
serve `vercel-deploy/` directly. Either rename the folder to `docs/`, or add a
workflow that uploads `vercel-deploy/` as the Pages artifact.

## Configuration

The knobs are constants near the top of the `<script>` block in `index.html`:

| Constant | Meaning |
| --- | --- |
| `TYPES` | Session types: label, duration, hours, colour |
| `NDAYS` | Camp length in days (default 14) |
| `DAY_CAP` | Daily hour ceiling before a day is flagged as heavy |
| `WEEK_CAP` | Weekly hour ceiling |
| `SUGGESTED` | The plan loaded by "Load suggested plan" |
| `DEFAULT_START` | Arrival date used before the user picks one |

Week 1 is the first 7 days from arrival, week 2 the next 7. The calendar grid
aligns to whatever weekday the arrival date falls on.
