# Progress Log

## Session: 2026-08-05

### Phase 1: Requirements & Discovery
- **Status:** complete
- **Started:** 2026-08-05
- Actions taken:
  - Ran session-catchup — no unsynced context from a previous session
  - Captured the user's redesign brief into findings.md
  - Inventoried v1.0.0: data model, storage key, load checks, interaction paths
  - Identified the two structural pressures: time scale (14 days → 365) and the
    date-offset data model
  - Asked four architecture questions; got answers (see findings.md)
  - Researched both named sources the user gave:
    - STA: WebFetch truncated → curl with browser UA → Nuxt SPA, no data in HTML
    - Downloaded all 85 JS chunks, recovered the backend API surface
      (`/Tournament/GetTournamentList` etc.) — but those paths 404 on the public
      host and no API hostname appears anywhere in the client bundles
    - JTTL: WebFetch 403 → curl with browser UA → static HTML, fully readable.
      Season structure captured; fixture dates are "TBU"
  - Concluded: no usable public JSON API; live in-browser import is impossible
- Files created/modified:
  - task_plan.md (created, then updated with answers)
  - findings.md (created, then two research passes appended)
  - progress.md (created)
- Next: user must decide how match data gets in (Q1), then design the data model

### Phase 2: Information architecture & data model
- **Status:** in_progress — design written, awaiting user sign-off
- Actions taken:
  - Established the key structural fact: matches are per-child, training blocks
    are per-household (all kids train together)
  - User decided: JTTL parsed from its website, STA gets a **separate scraper
    tool**; both feed a generated `matches.json`
  - Designed the repo shape (`tools/` decoupled from `vercel-deploy/`), the
    `matches.json` contract, the `tennis-season-v2` state shape, the four views,
    the conflict checks, and the v1 migration path — all in findings.md
  - Split delivery into v2.0 (season view) and v2.1 (block editor)
  - Presented the design to the user, including the two caveats (JTTL draw is
    TBU; the STA scraper is the fragile component)
  - Back-filled everything discussed into the planning files: decisions table
    (11 rows), errors table (3 real errors), and a new Risks table
- Files created/modified:
  - task_plan.md (phases restructured 6 → 8; Current Phase corrected — it still
    said "blocked on Q1" after Q1 was answered; decisions, errors, risks filled in)
  - findings.md (Phase 2 design section, caveats, status)
  - progress.md (this log)
- Next: user sign-off, then build the JTTL parser (easiest real data) first

### Phase 4: Scraper tool — JTTL
- **Status:** in_progress — `scrape-jttl.mjs` complete; STA and merge remain
- **Started:** 2026-08-05
- Actions taken:
  - Re-probed the Phase 1 JTTL URL: **404**. Content had moved to the `www.`
    host; the apex 404s on content paths
  - Discovered the site runs on **LeagueRepublic** and exposes a full
    server-rendered fixture archive — 14 seasons, not the season skeleton
    Phase 1 assumed. Rewrote the phase around real data
  - Mapped the readable surface: only `/fg/{divisionId}.html` is server-rendered;
    `/matchHub/`, `/match/`, `/standingsForDate/`, `/results/` all answer 202
    with an empty body. Cost: no venue data
  - Found season switching is a POST to `/fg-set.html` held in a session cookie
  - Pulled all 37 divisions of 2026 Season One (222 fixtures) and all 25 of
    2025 Season Two (187 fixtures) to measure the real season shape
  - Established that season weekends are **not consecutive** and that the two
    halves of the year are spaced differently — so projection is grounded in the
    last comparable season instead of guessed
  - Built `tools/` as a zero-dependency component: `lib/http.mjs` (cookie jar),
    `lib/jttl-parse.mjs`, `lib/jttl-season.mjs`, `scrape-jttl.mjs`
  - Wrote 18 snapshot assertions over two real saved pages — no network
  - Ran end-to-end: 222 real fixtures + 6 projected weekends written
- Errors hit and fixed (both recorded in task_plan.md):
  - First end-to-end run silently produced the **wrong season's** fixtures for
    the reference scrape — AWS load-balancer session drift. Fixed by
    re-selecting the season per request and asserting the response
  - The added assertion then caught a second bug: passing a Season One division
    key while requesting Season Two switched the season back. Fixed by entering
    a season with the season ID alone
- Files created:
  - `tools/README.md`, `tools/package.json`, `tools/scrape-jttl.mjs`
  - `tools/lib/{http,jttl-parse,jttl-season}.mjs`
  - `tools/test/jttl.test.mjs` (18 assertions, passing)
  - `tools/snapshots/` (3 real pages), `tools/data/jttl.json` (228 records)
- Next: `scrape-sta.mjs` (Playwright) and `build-matches.mjs`; Phase 2 sign-off
  is still formally open

## Prior work this session (v1.0.0, before planning started)

| Step | Result |
|------|--------|
| Ported artifact HTML to a deployable static site | `vercel-deploy/index.html` |
| Fixed dead `window.storage` persistence → `localStorage` | verified by jsdom round-trip |
| Fixed hardcoded header date range | now derived from arrival date |
| Fixed Saturday-only calendar alignment | lead/trail computed from arrival weekday |
| Added README + CHANGELOG | committed `666b076` |
| Tagged and released v1.0.0 | published on GitHub |

### Phase 3: Training block planner
- **Status:** complete
- Actions taken:
  - User reordered the work: block planner before the scraper and season view
  - User confirmed the session model stays **AM/PM + type** (no per-session
    times, coach or focus tags), so the v1 hour maths ported over unchanged
  - Rewrote `vercel-deploy/index.html` as the v2 multi-block planner
  - Built the `tennis-season-v2` state layer with sanitising on read
  - Wrote the v1.0.0 migration; v1 key deliberately left intact
  - Caught and fixed a `toISOString()` timezone bug before testing — it would
    have shifted a new block's start date a day earlier in Singapore
  - Committed the test harness to `tests/` and grew it 33 → 83 assertions
  - Fixed one real gap the tests found: a fresh boot never persisted its
    default block until the first edit
  - Updated README and CHANGELOG
- Files created/modified:
  - vercel-deploy/index.html (rewritten)
  - tests/planner.test.mjs, tests/package.json (created)
  - .gitignore (created)
  - README.md, CHANGELOG.md (updated)
  - task_plan.md, progress.md (updated)

### Phase 6a: Tournaments view
- **Status:** complete
- Actions taken:
  - User asked for the page to become two parts: training, and tournaments +
    who is joining. Built as two top-level views (nav under the header) rather
    than stacked sections — the planner alone is already ~6000px on a phone
  - Kept the tested training code untouched: renamed `render()` to
    `renderTraining()` and added a dispatcher, so every existing call site
    stayed correct and all 83 prior assertions passed unchanged
  - Built kids, manual tournament entry, the per-child entry-status cycle,
    month grouping, and the season checks
  - Wired `data/matches.json` loading, merged with manual entries
  - Shipped an empty `data/matches.json` so the page does not 404 on every
    load and the scraper has a target file
  - Drove it in Chromium: 4 tournaments, 2 kids, statuses set, reload
    persistence confirmed, phone layout checked, zero console errors
  - Grew the suite 83 → 140 assertions
- Files created/modified:
  - vercel-deploy/index.html (two views)
  - vercel-deploy/data/matches.json (created, empty)
  - tests/planner.test.mjs (+57 assertions)
  - README.md, CHANGELOG.md, task_plan.md, progress.md

### Phase 6c: STA link lookup
- **Status:** complete
- Actions taken:
  - User asked to paste a tournament link and have the details filled in
  - Re-probed STA **in a real browser** instead of by static analysis, and found
    the API host that grepping 2.3 MB of chunks had missed:
    `api.singtennis.org.sg/web-api/Tournament/GetTournamentList`
  - Verified it: unauthenticated `POST {}` → 200, 122 tournaments,
    `Access-Control-Allow-Origin: *`, preflight allows POST — so the **browser
    can call it directly**. This overturns the Phase 1 conclusion
  - Built the link field, slug matching, `DD/MM/YYYY` → ISO conversion, and
    lookup on paste / Enter / button
  - Confirmed venue is unavailable in both the API and the rendered detail page,
    so the lookup says so rather than silently leaving it blank
  - Verified live in Chromium against the real API, not just a stub
  - Corrected findings.md — the old conclusion is left visible and marked wrong
- Files created/modified:
  - vercel-deploy/index.html, tests/planner.test.mjs (+20 assertions)
  - findings.md (correction), README.md, CHANGELOG.md, task_plan.md, progress.md
- Lesson recorded: static analysis of a bundled SPA proves what is in the
  bundle, not what the app does. One network trace beat 85 chunk greps.

## Test Results

| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| v1.0.0 jsdom suite | `vercel-deploy/index.html` | 33 assertions pass | 33 passed, 0 failed | ✓ |
| v2 block planner suite | `tests/planner.test.mjs` | all pass | 83 passed, 0 failed | ✓ |
| v2 two-view suite | `tests/planner.test.mjs` | all pass | 140 passed, 0 failed | ✓ |
| Chromium drive, part 1 | headless Playwright | renders + drag works | moved not duplicated; no console errors | ✓ |
| Chromium drive, part 2 | headless Playwright | tournaments + statuses persist | 4 tournaments, 2 kids, survives reload; no console errors | ✓ |

Four failures on the first v2 run, all resolved:

| Failure | Cause | Fix |
|---------|-------|-----|
| state not persisted under the v2 key | real gap — cold boot only saved on first edit | added `save()` to the init path |
| 5-day suggested total expected 7.0h | wrong test expectation (days 0–4 sum to 9.0) | corrected the assertion |
| suggested plan expected "Balanced" | wrong assumption — it trips two warnings, and did in v1 too | assert the real behaviour: warnings but no red flags |
| "no toISOString" hygiene check | brittle — matched the explanatory comment | match an actual `.toISOString(` call instead |

Note: the harness lives in the session scratchpad, not the repo. It covers cold
boot, localStorage round-trip, four corrupt-state cases, grid alignment for
Sat/Sun/Wed arrivals, buttons, and tap-to-place. Drag-and-drop is untested
(jsdom has no real drag implementation).

## Error Log

| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-08-05 | WebFetch returned truncated content for the STA tournaments page | 1 | Re-fetched with `curl` + browser User-Agent → 200, 1.7 MB |
| 2026-08-05 | WebFetch got HTTP 403 from the JTTL page | 1 | Same fix — `curl` + browser User-Agent → 200, 32 KB static HTML |
| 2026-08-05 | `xargs` parallel chunk download wrote 0 files (shell quoting of `$UA` and `{}`) | 1 | Did not retry the same command; switched to a bounded `while read` loop with background jobs — all 85 chunks fetched |
| 2026-08-05 | `/Tournament/GetTournamentList` returned the Nuxt 404 page on GET and POST | 1 | Confirmed the API is not on the public host; stopped static analysis and recorded that a headless browser is required |

## 5-Question Reboot Check

| Question | Answer |
|----------|--------|
| Where am I? | Phase 2 — design complete, awaiting user sign-off |
| Where am I going? | Phase 3 scraper (`tools/`) → Phase 4 visual direction → Phase 5 v2.0 season view → Phase 6 v2.1 blocks → Phase 7 tests → Phase 8 release |
| What's the goal? | Turn the two-week planner into a season planner with a year match calendar, so travel can be planned around match dates |
| What have I learned? | See findings.md — v1.0.0 inventory, STA/JTTL source research, and the full v2 design |
| What have I done? | Shipped and tagged v1.0.0; researched both match sources; designed the v2 architecture and recorded it |

---
*Update after completing each phase or encountering errors*
