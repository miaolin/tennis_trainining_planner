# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Work toward v2: the two-week camp planner becomes a multi-block training
planner, the first step of the season planner described in `task_plan.md`.

### Changed — tab order and size

- Tabs run **Calendar, Tournaments, Training**, and **Calendar is now the
  landing view** — the year is the question the app exists to answer.
- Tabs are larger and clearer: 22px, a 152×53 target, with the active one
  carrying a tinted background as well as the underline.

### Added — part 3, year calendar

A third view: twelve months on one page, with year navigation.

- **Per-kid tournament dots.** Each day carries one dot per child who is
  playing, in that child's colour, so you can see who competes when. A
  tournament nobody is going to yet gets a grey "Nobody yet" dot; a child who
  is skipping gets none. The tooltip names each child and their status.
- **Training blocks** as a yellow left edge on each day.
- **Singapore school holidays** as the day background — school vacations in
  green, public holidays in amber.
- **Holidays this year**, sorted longest first, each saying whether it is clear
  or how many tournaments fall inside it. That is the travel-planning list.
- The legend is built from your actual kids.

Tournaments are dots rather than a fill because league events run for weeks —
Inter-Club 3 Sep–18 Oct, JTTL 19 Sep–15 Nov — and filling those days painted
over the school holidays, which are the point of the view.

School holidays ship as `data/sg-school-holidays.json`, hand-entered from the
MOE press releases for 2026 and 2027 and carrying their source URLs. They
cannot be fetched live: data.gov.sg has no school-holiday dataset and sends no
CORS header, and moe.gov.sg is not readable from the browser either. Add a year
to that file when MOE publishes one.

### Added — import the whole STA calendar, filtered by age group

- **Import from STA** pulls all 122 tournaments in one call and keeps the age
  groups you tick: **U10**, **14&U**, **16&U**, **Junior — other**, and
  **Adult / Open**. The four junior groups are ticked by default.
- **Upcoming only** (on by default) drops tournaments that have already
  finished.
- Re-importing is a no-op — existing tournaments are matched by STA id, not
  duplicated. The note reports added / already there / already finished.
- Imported tournaments carry the STA badge, link back to their page, and can be
  deleted like any locally held one.

STA has no age-group field, so the bucket is derived: `Junior (U10)` as a level
or a `U10` token in the title, then `14&U` / `16&U` tokens, then anything else
marked Junior, with everything remaining as Adult / Open.

Live against the real API this pulls 17 upcoming junior tournaments out of 122,
running through July 2027.

### Added — paste a tournament link, get the details

- **STA link lookup.** Paste a `singtennis.org.sg` tournament link into the add
  form and the name, start, end, entry deadline and categories fill themselves
  in. Lookup fires on paste, on Enter, or from the button.
- The link is stored on the tournament and shown as a "Tournament page" link.

This runs entirely in the browser. `api.singtennis.org.sg` answers an
unauthenticated `POST {}` with all 122 tournaments and sends
`Access-Control-Allow-Origin: *`, so no proxy or scraper is involved — this
corrects an earlier finding in `findings.md` that claimed no usable public API
existed. JTTL links cannot be looked up this way (no CORS headers); those
fixtures still come from the scraper in `tools/`.

Venue is not filled — STA does not publish it in the API or on the tournament
page — and the lookup says so rather than leaving you guessing.

Only `http(s)` URLs are ever rendered as links; a stored `javascript:` URL is
stripped rather than made clickable.

### Added — part 2, tournaments

The page is now two top-level views, **Training** and **Tournaments**, switched
from a nav under the header. Views rather than stacked sections, because the
planner is already a tall page.

- **Kids.** Add and remove children, each with its own colour.
- **Tournaments.** Add by hand (name, dates, venue, categories, entry deadline),
  grouped by month and sorted by date. Past ones dim.
- **Per-child entry status** on every tournament: click to cycle
  planned → entered → confirmed → skipping → not going.
- **`data/matches.json`** is read at load if present, and merged with anything
  added by hand. Ships empty; `tools/` will fill it. Feed tournaments are shown
  with an STA/JTTL badge and cannot be edited in the browser; a `provisional`
  flag renders as its own badge.
- **Season checks** — entry deadline inside 21 days that nobody has committed
  to, the same child in two overlapping tournaments, provisional dates present,
  and the longest clear gap between tournaments as the travel window.
- A tournament falling inside a training block is labelled with that block's
  name, so build-up blocks are visible from the tournament list.

### Added — part 1, training blocks

- **Multiple training blocks.** Create, rename, switch and delete named blocks;
  a new block starts the day after the previous one ends.
- **Variable block length** (1–60 days, default 14) instead of a fixed fortnight.
- Per-week totals computed as 7-day chunks from the block start, so a block of
  any length reports sensible weekly loads.
- On-court days and rest days in the header readout.
- `tests/` — the jsdom harness is now committed and runnable (`npm test`),
  83 assertions. It previously lived only in a scratch directory.
- `.gitignore`.

### Changed

- Storage moves to `tennis-season-v2`, holding `blocks[]` plus `players`,
  `entries`, `trips` and `manualMatches` reserved (empty) for the season view.
- Blocks carry an inert `anchorMatchId`, ready for match anchoring.
- The weekly-load check only judges a **full** 7-day week, so a short tail is
  not reported as if it were under target.
- The suggested plan now fills only the days that fit a shorter block.

### Fixed

- A new block's start date is computed with local date parts. `toISOString()`
  would have shifted it a day earlier in any timezone east of UTC — including
  Singapore, where this is used.

### Migration

A v1.0.0 plan under `tennis-camp-plan-v1` is folded into a single block named
"Camp plan", keeping its start date and sessions. The v1 key is **left intact**,
so rolling back to the v1.0.0 deploy still finds its data.

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

[1.0.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v1.0.0
