# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- **The JTTL scraper and the whole `tools/` folder** — `scrape-jttl.mjs`, its
  parsers, snapshots, tests and `build-matches.mjs`. Not wanted.
- The 6 provisional JTTL Season Two weekends it had generated.
  `data/matches.json` ships empty again.

Tournaments now come from the STA import, a pasted STA link, or hand entry —
all in the browser. The `matches.json` feed still works and is still read at
load; it is simply hand-edited now rather than generated, and the README
documents its shape.

The 2.0.0 entry below is left as it was: `tools/` genuinely shipped in that
release.

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

[2.0.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.0.0
[1.0.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v1.0.0
