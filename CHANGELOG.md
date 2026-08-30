# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] — 2026-08-30

The training grid now says *when*, not only *what*. A day is three slots; each
slot holds as much as the day really holds; every session carries its own start
time and its own length; and there is finally somewhere to put the hours that
are not training at all.

Existing plans load unchanged. A session saved without a time keeps its slot and
simply says so until you give it one, a slot that held one session becomes a
stack of one, and the retired 1.5h private type loads as an ordinary private of
that length.

### Added

**An exact time on every session**

- **Three slots a day** — morning, afternoon and evening — instead of two, so a
  study block can sit alongside training rather than displacing it.
- **Placing a session asks when it starts.** The slot's usual time is filled in
  (09:00, 14:00, 17:00), so accepting it is one keystroke, and the grid then
  shows the real window: `09:00–10:00 · 1h`. The end time follows from the
  session length.
- **Click the time on any placed session to change it.** Dragging a session to
  another slot keeps the time it already has — a move is not a re-booking.
- A session may carry **no time at all**; it stays in its slot and says so.

**A length on every session, not on the chip**

- **One Private chip instead of two.** The length now belongs to the session,
  set in the same dialog that asks for the time, so a 45-minute fitness block or
  a 90-minute group needs no chip of its own. The palette is five chips.
- The dialog **fills in the usual length** for the chip you placed — 1h, 2h, 1h
  — so accepting it is still one keystroke, and the length can be changed later
  from the grid the same way the time can.
- Quarter hours, up to 12. An impossible length falls back to the chip's usual.
- **`p15` still reads.** A plan saved with the old 1.5h private type loads as an
  ordinary private of that length.

**More than one thing in a slot**

- **A slot holds a stack, not a single session.** A morning can be a private and
  then physical; an afternoon can be school and then a lesson after it. Placing
  a second session adds to the slot rather than taking it over.
- The stack is **kept in clock order**, however it was entered, and each slot is
  capped at four — past that a day is a mistake, not a schedule.
- A filled slot keeps a **`+ AM`** strip under it: that is what you tap or drop
  on to add another, and it is what marks where one slot ends and the next
  begins. Dragging one session out of a stack leaves the rest where they were.

**Blocking a slot that is not training**

- A **Study / other** chip takes your own label and length — study, school, a
  piano lesson — and holds the slot for that time.
- **It never counts towards the load.** Daily hours, weekly totals and the block
  total all ignore it, so blocking out an afternoon does not make the week look
  heavier than it is, and a day of nothing but study still reads as a rest day.

**A clash check**

- Two things booked over the same hour is now called out by name — including
  two inside the same slot. Hour caps could never catch this: a day can be
  over-booked without being over-loaded.

### Changed

- **The 1.5h private chip is gone**, replaced by the length field above. Nothing
  is lost — existing 1.5h sessions load unchanged.
- The **suggested plan** puts the second tennis block of a day in the evening
  rather than straight after lunch, which is what its own load check has always
  advised. The total is unchanged.
- The **text export** carries the times: `AM 09:00–10:00 Private 1h`.

## [2.1.0] — 2026-08-07

Two kids, properly. Tournaments now know which child can enter them, and there
is finally a way to get your data off one browser.

No migration: existing plans load unchanged, and a child without a birth year
keeps behaving exactly as before.

### Added

**Per-child age groups**

- Each child has a **birth year**, which sets their age group (U10, 14&U, 16&U,
  Junior). Ages follow the Singapore convention — the age reached during the
  season year, so 10&U in 2026 means born 2016 or later.
- **A tournament only offers the children who can enter it.** A U10 event shows
  the nine-year-old alone; a 16&U event shows the thirteen-year-old alone; an
  event with no age group in its title shows everyone. A child is offered their
  own group and one above it, since juniors play up a group but do not enter
  every event they are technically old enough for.
- **A "Show" filter** — Everyone, or one child — above the tournament list, once
  there is more than one child.
- **The STA import is scoped by child** rather than by raw age group: tick the
  children, and eligibility is judged per tournament against the year it runs
  in, so a child ageing out between seasons is handled correctly.

Two rules stop this hiding anything that matters. A child who already has a
status on a tournament is **always** shown, whatever the age rules say — a
recorded decision must never become unreachable. And a child with no birth year
is shown everywhere, so nothing disappears until you say how old they are.

**Backup**

- **Download backup / Restore backup.** One dated JSON file carries everything:
  training blocks, kids and birth years, tournaments and entry statuses. A data
  bar under every view shows what is stored.
- Restore validates before replacing anything and confirms, naming what it is
  about to restore. A file that is not valid JSON, not a planner backup, or
  unreadable is refused with a reason and **nothing is changed**. A bare state
  object restores as well as the wrapped export, and a backup of an empty
  planner restores as empty rather than silently reloading the suggested plan.

Worth knowing why this exists: `localStorage` is per-browser, so a phone and a
laptop share nothing, and **Safari clears script-writable storage after roughly
a week without a visit** — a plan left unopened can simply vanish. The file is
the durable copy, and the way to move a plan between devices. The page now says
so instead of leaving you to find out.

### Fixed

- **Pasting a link to a tournament that is not yet in STA's tournament list now
  works.** The lookup searched `GetTournamentList`, which omits competitions
  that are published but not open for entry — the Red/Orange/Green events linked
  from `/red-orange-green` are a standing example, and
  `sta-spex-u10-red-competition-viii-2026` returned "No STA tournament matches".
  It now resolves the slug directly via `Tournament/GetTournamentInfoBySlug`,
  which is unauthenticated and CORS-open like the list endpoint, and needs one
  request instead of fetching all 122 rows.
- **Venue is filled in.** An earlier note claimed STA did not publish it
  anywhere; that was wrong — the list endpoint omits it, but the by-slug
  endpoint carries it. The lookup no longer tells you to add it by hand.

### Removed

- **The JTTL scraper and the whole `tools/` folder** — `scrape-jttl.mjs`, its
  parsers, snapshots, tests and `build-matches.mjs`.
- The 6 provisional JTTL Season Two weekends it had generated.
  `data/matches.json` ships empty again.

Tournaments now come from the STA import, a pasted STA link, or hand entry — all
in the browser. The `matches.json` feed still works and is still read at load; it
is simply hand-edited now rather than generated, and the README documents its
shape. The 2.0.0 entry below is left as it was: `tools/` genuinely shipped then.

### Tests

291 assertions, up from 223 at 2.0.0 — covering the eligibility rules, the who
filter, the by-slug lookup including a tournament missing from the list, and the
backup round trip with four rejection cases.

## [2.0.0] — 2026-08-07

The two-week camp planner becomes a **season planner**. Three views — Calendar,
Tournaments, Training — so a year of matches, training and school holidays can
be seen together and travel booked around them.

Breaking: state moves to a new `localStorage` key. See **Migration** below —
existing plans are carried over and the v1 key is left untouched.

### Added

**Calendar** (the landing view) — twelve months on one page, with year
navigation.

- One dot per child on every tournament day, in that child's colour, so the
  calendar says *who* is playing when. A tournament nobody has committed to yet
  shows a grey dot; a child who is skipping shows none. Tooltips name each child
  and their status.
- Training blocks as a yellow left edge.
- Singapore school holidays as the day background — vacations green, public
  holidays amber.
- "Holidays this year", longest first, each marked clear or with the number of
  tournaments inside it. That is the travel-planning list.
- The legend is built from your actual kids.

**Tournaments**

- Kids: add and remove children, each with its own colour.
- Tournaments with dates, venue, categories and entry deadline, grouped by month
  and sorted; past ones dim.
- Per-child entry status on every tournament, cycling planned → entered →
  confirmed → skipping → not going.
- **Paste an STA tournament link** and the name, dates, entry deadline and
  categories fill themselves in. Fires on paste, on Enter, or from the button.
  The link is kept on the row.
- **Import the whole STA calendar**, filtered by age group — U10, 14&U, 16&U,
  Junior — other, Adult / Open — with "Upcoming only" on by default. Re-import
  is a no-op; tournaments are matched by STA id.
- Season checks: an entry deadline inside 21 days that nobody has committed to,
  the same child in two overlapping tournaments, provisional dates, and the
  longest clear gap between tournaments.
- A tournament falling inside a training block is labelled with that block's
  name, so build-up blocks are visible from the list.

**Training**

- Multiple named blocks: create, rename, switch, delete. A new block starts the
  day after the previous one ends.
- Variable length, 1–60 days (was a fixed fortnight).
- Per-week totals as 7-day chunks from the block start, so any length reports
  sensible weekly loads.
- On-court days and rest days in the header readout.

**Data and tooling**

- `data/matches.json` — generated tournament feed, read at load and merged with
  locally held tournaments. Ships with the **6 provisional JTTL Season Two
  weekends**, built from the scraper output.
- `tools/build-matches.mjs` — merges the scraped fragments in `tools/data/` into
  that feed. Finished fixtures are dropped by default (`--all` keeps them):
  JTTL publishes every team fixture in every division — 222 for one past season
  — and shipping those buries the dates you can still plan around. Provisional
  records are always kept, and the build refuses to write an empty feed.
- Provisional tournaments show **why** their dates are estimates, e.g. "Draw not
  yet published; weekend spacing taken from 2025 Season Two", rather than a bare
  badge.
- `data/sg-school-holidays.json` — Singapore MOE school calendar for 2026 and
  2027, hand-entered from the MOE press releases with source URLs and a
  `verifiedOn` date. Add a year when MOE publishes one.
- `tools/` — the JTTL scraper, producing 222 real fixtures plus projected
  weekends for an unpublished draw.
- `tests/` — jsdom harness, committed and runnable with `npm test`. 223
  assertions, up from nothing in the repo at 1.0.0.
- `.gitignore`.

### Changed

- Tabs run Calendar, Tournaments, Training, with **Calendar as the landing
  view**. They are 22px in a 152×53 target, and the active one carries a tinted
  background as well as an underline.
- Storage moves to `tennis-season-v2`, holding `blocks[]`, `players`,
  `entries`, `manualMatches` and `trips`.
- Blocks carry an inert `anchorMatchId`, ready for match anchoring.
- The weekly-load check only judges a **full** 7-day week, so a short tail is
  not reported as if it were under target.
- The suggested plan fills only the days that fit a shorter block.
- Week totals split 7/7 from the block start, replacing 1.0.0's 8/6 split which
  had encoded calendar rows for a Saturday arrival.

### Fixed

- A new block's start date is computed from local date parts. `toISOString()`
  would have shifted it a day earlier anywhere east of UTC — including
  Singapore, where this is used.
- Locally held tournaments keep their source, so an imported STA tournament no
  longer loses its badge on reload.
- Tournaments can be deleted whether they were typed in or imported; the delete
  control previously keyed off `source === 'manual'`.
- A cold boot persists its default block immediately rather than on first edit.
- Only `http(s)` URLs are rendered as links; a stored `javascript:` URL is
  stripped rather than made clickable.

### Migration

A 1.0.0 plan under `tennis-camp-plan-v1` is folded into a single block named
"Camp plan", keeping its start date and sessions. **The v1 key is left intact**,
so rolling back to the 1.0.0 deploy still finds its data.

### Note on an earlier finding

`findings.md` originally concluded that STA had no usable public API and that a
static page could never read it. That was wrong: the API host is injected at
runtime, so it is absent from the JS bundles, and one browser network trace
found it. `api.singtennis.org.sg` answers an unauthenticated `POST {}` and sends
`Access-Control-Allow-Origin: *`. The correction is recorded in `findings.md`
with the original conclusion left visible. JTT still sends no CORS headers,
which is why its scraper remains.

## [1.0.0] — 2026-08-05

First deployable release. The baseline is the original single-file planner that
ran inside a Claude artifact sandbox; this release makes it a standalone static
site that works on any host.

### Added

- `vercel-deploy/` — the deployable site: `index.html` (the whole app) and
  `vercel.json` (cache and security headers).
- Plan persistence via `localStorage`, keyed `tennis-camp-plan-v1`. The arrival
  date is saved alongside the plan.
- Saved state is validated on read: unknown session types, malformed days, and
  unparseable blobs are rejected and the suggested plan loads instead.
- Favicon (inline SVG, no extra request), meta description, `theme-color`, and
  Open Graph tags.
- `<noscript>` notice for browsers with JavaScript disabled.
- README covering local use, deployment, and the configuration constants.

### Changed

- Week totals now split 7/7 from the arrival date. They were previously days
  0–7 and 8–13, an 8/6 split that encoded the calendar grid rows for a Saturday
  arrival. Totals are unchanged for the suggested plan, since the boundary day
  is a rest day either way.
- The date `<label>` is associated with its input via `for`.

### Fixed

- **Plans were never saved.** Persistence called `window.storage`, a
  host-provided API that does not exist in a browser, so every write silently
  failed and plans were lost on refresh.
- **The header date range was hardcoded** to `21 Nov – 4 Dec` while the arrival
  date was editable, so the title went stale as soon as the date changed. It is
  now derived from the arrival date.
- **The calendar only aligned for a Saturday arrival.** The leading blank count
  was hardcoded to 6 and the trailing count to a fixed grid size, so any other
  arrival weekday placed days under the wrong columns. Both are now computed
  from the arrival date.
- `place()` now ignores unknown session types rather than writing them into the
  plan.

[2.2.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.2.0
[2.1.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.1.0
[2.0.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.0.0
[1.0.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v1.0.0
