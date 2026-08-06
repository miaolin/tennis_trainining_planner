# Tennis training planner

**Released: 1.0.0** · unreleased v2 work in progress · [Changelog](CHANGELOG.md)

A single-page planner for a junior tennis season, in two parts:

1. **Training** — build training blocks by dropping session types onto morning
   and afternoon slots. The page tallies daily and weekly hours and flags a plan
   that is too heavy, too relentless, or too solitary for a young player.
2. **Tournaments** — every tournament with its dates, venue, categories and
   entry deadline, plus which of your kids is going to each one. Surfaces
   closing deadlines, clashes, and the longest clear gap to book a trip into.

The design and the source research behind it are in `task_plan.md` and
`findings.md`.

Everything lives in `vercel-deploy/index.html` — no build step, no dependencies,
no backend. Plans are saved to the browser's `localStorage`, so they persist
per-device.

```
vercel-deploy/
  index.html          the entire site
  data/matches.json   GENERATED tournament feed — ships empty
  vercel.json         cache + security headers
tests/                jsdom harness — dev only, never deployed
```

## What it does — Training

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

## What it does — Tournaments

- **Kids** — add each child; they get their own colour.
- **Tournaments** — name, dates, venue, categories and entry deadline, grouped
  by month. Past ones dim.
- **Who's going** — one button per child per tournament, cycling
  planned → entered → confirmed → skipping → not going.
- **Season checks** — an entry deadline inside 21 days that nobody has committed
  to, the same child booked into two overlapping tournaments, provisional dates,
  and the longest clear gap between tournaments as the window to book travel.
- A tournament falling inside a training block shows that block's name, so
  build-up blocks are visible from the list.

### Adding a tournament from its link

Paste an STA tournament link (`https://www-new.singtennis.org.sg/tournaments/…`)
into the add form. The name, start, end, entry deadline and categories fill
themselves in; the link is kept on the row. Lookup fires on paste, on Enter, or
from the **Look up** button.

This works because `api.singtennis.org.sg` answers an unauthenticated
`POST {}` with every tournament and sends `Access-Control-Allow-Origin: *`, so
the page reads it directly — no proxy, no scraper. **Venue is not filled**: STA
does not publish it anywhere, so add it by hand if you want it.

JTTL links cannot be looked up — jttsingapore.com sends no CORS headers, so the
browser cannot read it. Those fixtures come from the scraper in `tools/`.

### Where tournament data comes from

Two places, merged:

- **`vercel-deploy/data/matches.json`** — generated, committed, read-only in the
  browser. Ships empty; the scrapers in `tools/` will fill it. Entries carry an
  STA or JTTL badge, and a `provisional: true` flag renders as its own badge for
  dates that are estimates rather than a published draw.
- **Anything you add in the browser** — stored in `localStorage` on that device,
  editable and deletable.

STA can be read live from the page (see above). JTT cannot — it sends no CORS
headers — which is why its scraper is a separate offline tool. See `findings.md`
for the full trace of both.

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

140 assertions driving the real page under jsdom: cold boot, the v1.0.0
migration, state round-trips, thirteen kinds of corrupt saved state, block
create/rename/switch/delete, variable length and its clamps, calendar alignment
for different start weekdays, the load checks, a timezone regression, view
switching, kids, tournament add/delete, the entry-status cycle, and the season
checks.

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
