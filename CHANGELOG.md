# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Work toward v2: the two-week camp planner becomes a multi-block training
planner, the first step of the season planner described in `task_plan.md`.

### Added

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
