# Tennis camp planner

**Version 1.0.0** · [Changelog](CHANGELOG.md)

A single-page planner for a two-week junior tennis camp. Drop session types onto
morning and afternoon slots; the page keeps a running tally of daily and weekly
hours and flags a plan that is too heavy, too relentless, or too solitary for a
young player.

Everything lives in `vercel-deploy/index.html` — no build step, no dependencies,
no backend. Plans are saved to the browser's `localStorage`, so they persist
per-device.

```
vercel-deploy/
  index.html    the entire site
  vercel.json   cache + security headers
```

## What it does

- **Two-week grid** laid out on a Sun–Sat calendar, aligned to whatever weekday
  the arrival date falls on. Each day has a morning and an afternoon slot.
- **Five session types** — private 1h, private 1.5h, group 2h, physical 1h, and
  rest. Rest clears the whole day.
- **Running totals** per day, per week, and across the fortnight, with a per-day
  load bar that turns amber at 3h and red past the daily cap.
- **Load checks** that re-evaluate on every edit: days over the cap, long runs
  without a rest day, too few group sessions, two private blocks stacked on one
  day, physical work crowding out court time, and weeks over the weekly cap.
- **Export** the plan as plain text to the clipboard, or print it — the print
  stylesheet drops the controls and prints the grid on white.

## Using it

Drag a session from the palette onto a slot. Drag a placed session to another
slot to move it; click its **×** to remove it. On a phone, tap a session to arm
it and then tap a slot — the grid stacks to one day per row.

Set **Arrival date** to shift the whole fortnight; the grid, the header range,
and the day labels all follow. **Load suggested plan** restores the built-in
fortnight, **Clear all** empties it.

Everything is keyboard reachable: sessions and slots are focusable, and Enter or
Space arms and places.

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
| `STORE_KEY` | `localStorage` key holding the saved plan |

Week 1 is the first 7 days from arrival, week 2 the next 7. The calendar grid
aligns to whatever weekday the arrival date falls on.

Changing the shape of the saved plan? Bump `STORE_KEY` so existing saves are
ignored rather than half-read.

## Notes

- Fonts (Barlow Condensed, Karla) load from Google Fonts; the page falls back to
  system fonts if that request is blocked or offline.
- Saved plans are per-browser and per-device — there is no account and no sync.
  Private-browsing modes that block `localStorage` degrade to a working page
  that just does not remember anything.
- Drag-and-drop uses the HTML5 drag API, which does not fire on touch devices;
  that is what the tap-to-place path is for.
