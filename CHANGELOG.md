# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
