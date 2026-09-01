# Tennis training planner

**Version 2.8.0** · [Changelog](CHANGELOG.md)

A single-page planner for a junior tennis season, in three parts:

1. **Calendar** (the landing view) — twelve months on one page: who is playing
   when (a coloured dot per child), where the training blocks sit, and the
   Singapore school holidays behind it all.
2. **Tournaments** — every tournament with its dates, venue, categories and
   entry deadline, plus which of your kids is going to each one. Surfaces
   closing deadlines, clashes, and the longest clear gap to book a trip into.
3. **Training** — build training blocks by dropping sessions onto morning,
   afternoon and evening slots. Each session carries its own start time and
   length, a slot takes more than one, and the hours that are not training at
   all can be blocked out alongside. The page tallies daily and weekly hours and
   flags a plan that is too heavy, too relentless, or too solitary for a young
   player.

The design and the source research behind it are in `task_plan.md` and
`findings.md`.

The page is `vercel-deploy/index.html` — one file, no build step, no
dependencies, nothing to compile. Plans live in the browser's `localStorage`.
The only server-side code is `api/plan.js`, which exists so two devices can hold
the same plan; leave sync off and nothing in the site touches it.

```
vercel-deploy/
  index.html                    the entire site
  api/plan.js                   sync endpoint — the only server-side code
  package.json                  a Redis client, for api/plan.js alone
  data/matches.json             optional tournament feed — ships empty
  data/sg-school-holidays.json  Singapore MOE school calendar
  vercel.json                   cache + security headers
tests/                          jsdom harness + api tests — dev only, never deployed
```

## What it does — Training

- **Multiple training blocks.** Name them, give each a start date and a length
  (1–60 days), and switch between them from the tab row. A new block starts the
  day after the previous one ends.
- **Calendar grid** laid out Sun–Sat, aligned to whatever weekday the block
  starts on. Each day has a morning, an afternoon and an evening slot.
- **An exact start time on every session.** Placing one asks when it starts —
  the slot offers 09:00, 14:00 or 17:00 — and the grid then shows the real
  window, `09:00–10:00 · 1h`. Click the time on any placed session to change it.
  A session may also carry no time at all; it just says so.
- **A slot holds more than one session.** A morning can be a private and then
  physical, an afternoon school and then a lesson. The stack is kept in clock
  order and capped at four; the **+** strip under a filled slot adds another.
- **A length on every session.** The dialog fills in the usual one for the chip
  you placed (1h private, 2h group, 1h physical) and you can change it there or
  later from the grid — quarter hours, up to 12.
- **Four session types** — private, group, physical, and rest. Rest marks a
  single slot as off rather than the whole day, so a morning can be free while
  the afternoon is not; a day with nothing else booked still reads as a rest day
  in the totals and the load checks.
- **Study / other** blocks out a slot that is not training: give it your own
  label and length (study, school, a piano lesson). It holds the slot and shows
  its hours, but never counts towards the daily or weekly load, so blocking an
  afternoon does not make the week look heavier than it is. It is drawn in teal
  on a hatched card, so training and everything else are told apart at a glance.
- **The palette stays with you**, pinned to the top of the window and shrunk to
  the chips once you scroll past it, so a session is always there to drag.
- **Running totals** per day, per 7-day week, and across the block, with a
  per-day load bar that turns amber at 3h and red past the daily cap.
- **Load checks** that re-evaluate on every edit: days over the cap, long runs
  without a rest day, too few group sessions, two private blocks stacked on one
  day, two things booked over the same hour, physical work crowding out court
  time, and weeks over the weekly cap.
- **Export** the plan as plain text to the clipboard, or print it — the print
  stylesheet drops the controls and prints the grid on white.

## What it does — Tournaments

- **Kids** — add each child with a birth year; they get their own colour and an
  age group (U10, 14&U, 16&U, Junior). Ages follow the Singapore convention: the
  age reached during the season year, so 10&U in 2026 means born 2016 or later.
- **Only the children who can enter a tournament are offered on it.** A U10
  event shows the nine-year-old alone, a 16&U event the thirteen-year-old. Each
  child is offered their own group and one above it — juniors play up a group,
  but not into every event they are technically old enough for. A child with a
  status recorded is always shown regardless, and a child with no birth year is
  shown everywhere.
- **Show filter** — Everyone, or one child — appears once you have two kids.
- **Tournaments** — name, dates, venue, categories and entry deadline, grouped
  by month. Past ones dim.
- **Who's going** — one button per child per tournament, cycling
  planned → entered → confirmed → skipping → not going.
- **Rewards** — what each child plays for, and what they actually earned. Set
  once per child; a single tournament can pay differently. See below.
- **Season checks** — an entry deadline inside 21 days that nobody has committed
  to, the same child booked into two overlapping tournaments, provisional dates,
  the longest clear gap between tournaments as the window to book travel, a
  finished tournament whose result nobody has entered, and the season's running
  reward total.
- A tournament falling inside a training block shows that block's name, so
  build-up blocks are visible from the list.

### Rewards

The bargain is with the child, not with any one draw, so it is set once per
child in the **Rewards** box at the top of the tournaments view. Five lines, any
of which can be left blank:

| Line | Pays |
| --- | --- |
| Per win | that much for every match won |
| 1st / 2nd / 3rd place | that much for finishing there |
| Beat last | that much for winning more matches than last time |
| Format | free text, e.g. *Red ball, played in group* — shown, never paid |

That standard then applies everywhere, and **no tournament repeats it**. A row
shows a rewards line only when that event pays something different, badged
**Only here**. Press **Rewards** on a row to make one an exception; press **Use
standard** in that dialog to drop the exception again. Saving an exception with
every line blank is how you say *this one pays nothing*.

Schemes resolve in one order, most specific first:

    tournament exception  →  the child's standard  →  a data/matches.json suggestion

Each child who is **entered** or **confirmed** on a paying tournament gets a
**Wins** and **Place** box under it, and the page adds the payout up in front of
them: *$55 · 4 wins $20 · 2nd $30 · beat 3 $5*. The sum is always shown in full,
so a child can see how the number was reached. Two children on the same draw are
each paid their own way.

"Beat last" measures against that child's most recent *earlier* tournament with
a win count recorded — not simply the previous tournament, which they may not
have played. With nothing earlier on file there is nothing to beat, so the bonus
does not pay. This is the reason results are stored at all.

Nought wins is a real result and is kept as one; an empty box means *not yet
entered*, which is what the season check chases after a tournament has
finished.

### Importing the STA calendar

**Import from STA** pulls the whole tournament list in one call and keeps what
the ticked children can enter. Eligibility is judged per tournament against the
year it runs in, so a child ageing out between seasons is handled correctly.
**Upcoming only** is on by default. Re-importing never duplicates: tournaments
are matched by their STA id, and the note tells you how many were added, already
there, or already finished.

With no children added yet, the import falls back to every junior age group.

STA publishes no age-group field, so the group is derived from the title: the
`Junior (U10)` level or a `U10` token, then `14&U` / `16&U` / `18&U` tokens,
then anything else marked Junior, with the rest treated as adult.

### Adding a tournament from its link

Paste an STA tournament link (`https://www-new.singtennis.org.sg/tournaments/…`)
into the add form. The name, start, end, entry deadline and categories fill
themselves in; the link is kept on the row. Lookup fires on paste, on Enter, or
from the **Look up** button.

The lookup resolves the slug in the URL through
`api.singtennis.org.sg/web-api/Tournament/GetTournamentInfoBySlug`, which is
unauthenticated and sends `Access-Control-Allow-Origin: *`, so the page reads it
directly — no proxy, no scraper. It fills the **venue** too.

Resolving the slug rather than searching the tournament list matters: the list
omits competitions that are published but not yet open for entry, such as the
Red/Orange/Green events linked from `/red-orange-green`. Those resolve fine by
slug.

Only STA links work. Other sites — jttsingapore.com among them — send no CORS
headers, so the browser cannot read them; add those tournaments by hand.

### Where tournament data comes from

Two places, merged:

- **Anything you add in the browser** — imported from STA, filled in from a
  link, or typed by hand. Stored in `localStorage` on that device, editable and
  deletable. This is the normal path.
- **`vercel-deploy/data/matches.json`** — an optional feed committed alongside
  the site, read at page load and shown read-only. It ships empty. Edit it by
  hand, or point a generator at it, if you want tournaments to travel with the
  deploy rather than live in one browser.

  Each entry needs at least `id`, `name` and an ISO `start`; `end`, `venue`,
  `categories`, `entryDeadline`, `url`, `source` (`sta` / `jttl` / `manual`),
  `provisional`, `note` and `rewards` are optional. A `provisional: true` entry
  is badged as an estimate, and its `note` explains why. A `rewards` object
  (`perWin`, `places`, `improve`, `note`) is the weakest suggestion there is: a
  tournament exception set in the browser beats it, and so does the child's own
  standard.

See `findings.md` for the full trace of what each source does and does not
expose.

## What it does — Calendar

Twelve months for one year, with arrows to move between years.

- **A dot per child** on every tournament day, in that child's colour, so you
  can see who is competing when. Grey means a tournament nobody has committed
  to yet; a child who is skipping shows nothing. Hover a day for the names,
  statuses and holiday.
- **Training blocks** as a yellow left edge.
- **School holidays** as the day background — vacations green, public holidays
  amber.
- **Holidays this year**, longest first, each marked clear or with the number of
  tournaments inside it.

Tournaments are dots, not filled days, because league events run for weeks
(Inter-Club 3 Sep–18 Oct, JTTL 19 Sep–15 Nov) and filling them hid the school
holidays underneath.

### Where the school holidays come from

`vercel-deploy/data/sg-school-holidays.json`, hand-entered from the MOE press
releases and carrying its source URLs and a `verifiedOn` date. Currently 2026
and 2027 — **add a year to that file when MOE publishes one.**

They cannot be fetched live: data.gov.sg has no school-holiday dataset and
sends no CORS header, and moe.gov.sg is not readable from the browser either.

## Using it

Drag a session from the palette onto a slot, then give it a start time — the
slot's usual time is filled in, so it is one keystroke to accept. A slot takes
more than one: drop a second session on it, or use the **+** strip under it, and
the two sit in clock order. Drag a placed session to another slot to move it,
which keeps the time it already has; click the time to change it, or its **×**
to remove it. On a phone, tap a session to arm it and then tap a slot — the grid
stacks to one day per row.

Pick a block from the tab row, or **+ New block**. **Starts** shifts the whole
block — the grid, header range and day labels all follow. **Days** changes its
length; shortening a block hides the trailing days rather than deleting them, so
lengthening it again brings the sessions back. **Load suggested plan** fills the
built-in fortnight (only as far as the block is long), **Clear all** empties it,
**Delete block** removes it after a confirm.

Everything is keyboard reachable: sessions and slots are focusable, and Enter or
Space arms and places.

## Run locally

Open `vercel-deploy/index.html` in a browser, or serve the folder. Everything
works except sync, which needs the serverless function and so only runs on a
real deployment:

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

## Syncing across devices

Turn on sync and the laptop and the phone hold the same plan. There is no
account: one device generates a random 16-character **sync code**, you type it
on the other, and from then on every change goes up and every load comes down.

**On the deployed site**, at the foot of the page:

1. **Turn on sync** on the device that has the plan you want to keep. Write the
   code down — the page shows it as `XXXX-XXXX-XXXX-XXXX`.
2. On the other device, **scan the QR code** the first one is showing. The
   planner opens already joined — nothing to type. If the other device is not in
   the room, **Copy link** and send the link to it instead; and if you would
   rather type, press **Use a code** there — *not* Turn on sync, which starts a
   second plan of its own — then enter the code and **Connect**.

   However it joins, that device takes whatever is stored under the code, so
   join *from* the device you are willing to overwrite. It asks first.
3. After that it looks after itself. Changes go up a moment after you make them,
   and coming back to a tab you left open pulls down whatever the other device
   did. **Sync now** forces a check, **Stop syncing** disconnects this device and
   forgets the code.

**Use a code** takes the whole link as readily as the sixteen characters, so
whatever arrived from the other device can be pasted straight in.

If both devices ended up with codes of their own, they are two separate plans.
Pick the one you want to keep, and on the other device press **Use a different
code** and enter the first device's.

**Added to an iPhone or iPad Home Screen**, the planner runs as its own browser
with its own storage — it cannot see what Safari on the same device saved, so it
opens on the default plan and has to join like any other device. Scanning will
not do it, because a scanned link opens Safari rather than the Home Screen app:
copy the link on the other device and paste it into **Use a code**, once.

**What the code is.** It is the whole of the security model, so treat it like a
password: anyone with it — or with the QR code, or the link — can read and
change the plan. The code rides in the URL *fragment*, which browsers never send
to a server, and the page clears it from the address bar as soon as it reads it.
The server only ever sees
its SHA-256, so the code itself never leaves your browser and nothing on the
server can be turned back into one. Losing every device that has it means losing
the plan — the server cannot help you, because it does not know who you are.

**When two devices disagree**, the newer plan wins, and the page says so rather
than deciding quietly. If the other device saved something while this one was
holding a change, the push is refused and you are asked: *take their copy*, or
*keep mine* and overwrite. Nothing is lost without you choosing it.

### Setting it up on your own deployment

The page talks to `/api/plan`, a serverless function in `vercel-deploy/api/`.
It needs somewhere to put a few kilobytes:

1. In the Vercel project → **Storage** → add a **Redis** store and connect it
   to the project. Vercel's own managed Redis and the Upstash marketplace one
   both work, and either free tier is far more than a few kilobytes needs.
2. Redeploy. That is all — there is nothing to configure by hand.

The function takes whichever shape the store arrives in:

| The store injects | How the function reaches it |
| --- | --- |
| `REDIS_URL` or `KV_URL` | the `redis` client, over the connection string |
| `KV_REST_API_URL` + `..._TOKEN` | plain `fetch`, no client at all |
| `UPSTASH_REDIS_REST_URL` + `..._TOKEN` | the same |

REST wins if both are present, since it costs a request rather than a held
connection. The `redis` package in `vercel-deploy/package.json` is imported only
on the connection-string path, and is the one dependency in the project.

Vercel names a store's variables after the store, so a managed Redis called
*tennis plan* arrives as `tennis_plan_REDIS_URL` rather than `REDIS_URL`. The
function takes either — an unprefixed name wins if both exist, and a REST token
is only paired with a url from the same store — so there is nothing to rename.

Until a store is connected the function answers `503` and the page says sync is
not set up — the planner itself carries on working, locally, exactly as before.
Sync also does nothing when you open `index.html` from disk or serve the folder
statically, since there is no function to answer.

A plan is stored under the hash of its code and expires 400 days after its last
write, so an abandoned code does not sit there forever.

## Backing up your data

Sync keeps two devices level; a backup is what saves you from both of them.
Everything you enter also lives in that browser's `localStorage`, and **Safari
deletes script-writable storage after about a week without a visit**, so a plan
left unopened can disappear.

Use **Download backup** at the foot of the page. It writes one dated JSON file
with every training block, child, tournament and entry status. **Restore backup**
reads it back, after confirming, and refuses anything that is not a valid backup
without touching what you already have.

That file is also how you move a plan from laptop to phone without turning sync
on at all.

## Tests

```sh
cd tests && npm install && npm test
```

Two suites. `api.test.mjs` drives `api/plan.js` directly with a stubbed store —
backend choice, key validation, the 409 refusal and the forced write, bodies
that are not plans, junk in the store, and an unreachable one.

The rest is 530 assertions driving the real page under jsdom: cold boot, the v1.0.0
migration, state round-trips, thirteen kinds of corrupt saved state, block
create/rename/switch/delete, variable length and its clamps, calendar alignment
for different start weekdays, the load checks, a timezone regression, view
switching, kids, tournament add/delete, the entry-status cycle, the reward
schemes — per child, per tournament, and the order they resolve in — the payout
arithmetic behind them, and the season checks.

Sync is covered by a fake server that honours the same contract as the real
endpoint — joining, the debounced push, both sides of a conflict, and being
offline. The QR code is verified by decoding: the tests read the page's own
rendered code back with a scanner and check the link that comes out.

Drag-and-drop is **not** covered — jsdom has no real drag implementation. The
tap-to-place and keyboard paths are.

## Notes

- Fonts (Barlow Condensed, Karla) load from Google Fonts; the page falls back to
  system fonts if that request is blocked or offline.
- Saved plans are per-browser until you turn sync on, and there is no account
  either way — a sync code is the only credential. Private-browsing modes that
  block `localStorage` degrade to a working page that just does not remember
  anything, sync included.
- Drag-and-drop uses the HTML5 drag API, which does not fire on touch devices;
  that is what the tap-to-place path is for.
