# Tennis training planner

**Released: 1.0.0** · unreleased v2 work in progress · [Changelog](CHANGELOG.md)

A single-page planner for junior tennis training blocks. Drop session types onto
morning and afternoon slots; the page keeps a running tally of daily and weekly
hours and flags a plan that is too heavy, too relentless, or too solitary for a
young player.

This is step one of a season planner — a year view of matches and trips follows.
The design and source research are in `task_plan.md` and `findings.md`.

Everything lives in `vercel-deploy/index.html` — no build step, no dependencies,
no backend. Plans are saved to the browser's `localStorage`, so they persist
per-device.

```
vercel-deploy/
  index.html    the entire site
  vercel.json   cache + security headers
tests/          jsdom harness — dev only, never deployed
```

## What it does

- **Multiple training blocks.** Name them, give each a start date and a length
  (1–60 days), and switch between them from the tab row. A new block starts the
  day after the previous one ends.
- **Calendar grid** laid out Sun–Sat, aligned to whatever weekday the block
  starts on. Each day has a morning and an afternoon slot.
- **Five session types** — private 1h, private 1.5h, group 2h, physical 1h, and
  rest. Rest clears the whole day.
- **Running totals** per day, per 7-day week, and across the block, with a
  per-day load bar that turns amber at 3h and red past the daily cap.
- **Load checks** that re-evaluate on every edit: days over the cap, long runs
  without a rest day, too few group sessions, two private blocks stacked on one
  day, physical work crowding out court time, and weeks over the weekly cap.
- **Export** the plan as plain text to the clipboard, or print it — the print
  stylesheet drops the controls and prints the grid on white.

## Using it

Drag a session from the palette onto a slot. Drag a placed session to another
slot to move it; click its **×** to remove it. On a phone, tap a session to arm
it and then tap a slot — the grid stacks to one day per row.

Pick a block from the tab row, or **+ New block**. **Starts** shifts the whole
block — the grid, header range and day labels all follow. **Days** changes its
length; shortening a block hides the trailing days rather than deleting them, so
lengthening it again brings the sessions back. **Load suggested plan** fills the
built-in fortnight (only as far as the block is long), **Clear all** empties it,
**Delete block** removes it after a confirm.

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
| `DEFAULT_DAYS` | Length of a new block (14) |
| `MAX_DAYS` | Upper clamp on block length (60) |
| `DAY_CAP` | Daily hour ceiling before a day is flagged as heavy |
| `WEEK_CAP` | Weekly hour ceiling, applied per full 7-day week |
| `SUGGESTED` | The plan loaded by "Load suggested plan" |
| `DEFAULT_START` | Start date used before the user picks one |
| `STORE_KEY` | `localStorage` key holding all blocks (`tennis-season-v2`) |
| `LEGACY_KEY` | v1.0.0 key, read once for migration and never written |

Weeks are 7-day chunks counted from the block start, so a block of any length
reports sensible weekly loads. The calendar grid aligns to whatever weekday the
block starts on.

Changing the shape of saved state? Bump `STORE_KEY` so existing saves are
ignored rather than half-read, and leave the old key in place so a rollback to
the previous deploy still finds its data.

## Tests

```sh
cd tests && npm install && npm test
```

83 assertions driving the real page under jsdom: cold boot, the v1.0.0
migration, state round-trips, seven kinds of corrupt saved state, block
create/rename/switch/delete, variable length and its clamps, calendar alignment
for different start weekdays, the load checks, and a timezone regression.

Drag-and-drop is **not** covered — jsdom has no real drag implementation. The
tap-to-place and keyboard paths are.

## Notes

- Fonts (Barlow Condensed, Karla) load from Google Fonts; the page falls back to
  system fonts if that request is blocked or offline.
- Saved plans are per-browser and per-device — there is no account and no sync.
  Private-browsing modes that block `localStorage` degrade to a working page
  that just does not remember anything.
- Drag-and-drop uses the HTML5 drag API, which does not fire on touch devices;
  that is what the tap-to-place path is for.
