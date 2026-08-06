# Findings & Decisions

## Requirements

Captured from the user's request:

- The site is an **overview of a kid's tennis schedule**, not just one camp.
- It must hold the **specific training schedule for a period (2 weeks)** — the
  existing planner becomes one part of a larger whole.
- It must show **planned tennis matches across a year**.
- Purpose: **plan ahead** — book tennis holidays and travel around match dates.

Implied but unconfirmed:

- Matches are known in advance and entered/imported somehow.
- Travel decisions are made by looking at gaps between matches.
- The year view is the new entry point; the two-week grid becomes a detail view.

## Research Findings

### What v1.0.0 already provides (read from `vercel-deploy/index.html`)

- Single self-contained HTML file, ~600 lines, no dependencies, no build step.
- 14-day grid on a Sun–Sat calendar, aligned to the arrival weekday.
- Two slots per day (`am` / `pm`); five session types in `TYPES`
  (`p1`, `p15`, `g2`, `phys`, `rest`) with label, duration, hours, colour.
- Per-day load bar (amber at 3h, red past `DAY_CAP` 3.5h), week totals, grand total.
- `runChecks()` — seven load heuristics producing ok/warn/bad notes.
- Persistence: `localStorage`, key `tennis-camp-plan-v1`, storing
  `{start, plan}`; validated on read, falls back to `SUGGESTED`.
- Export: clipboard plain text, plus a print stylesheet.
- Interaction: HTML5 drag-and-drop, plus tap-to-place for touch, plus keyboard.

### What the redesign stresses

- **Time scale.** The current visual language is built for 14 cells. A year is
  ~365 — the court-dark palette and 150px-tall day cells do not scale.
- **Data model.** v1.0.0 stores a plan as `{dayIndex: {am, pm}}` keyed off a
  single arrival date. A year of matches plus multiple training blocks needs
  real dates, not offsets from one start.
- **Storage key.** Any model change must move off `tennis-camp-plan-v1`;
  `sanitise()` will reject the new shape and silently reset the user's plan.

### Source 1 — STA tournaments (`www-new.singtennis.org.sg/tournaments/?type=All`)

Probed 2026-08-05 with curl.

- WebFetch returned truncated content; plain curl needs a **browser User-Agent**
  (default UA is fine on status but the page is 1.7 MB, mostly JS).
- The site is a **Nuxt SPA**. Single bundle `/_nuxt/oTAYnuxS.js`, plus an
  `<script type="application/json" id="__NUXT_DATA__" data-ssr="true">` blob.
- The served HTML contains **no tournament dates** — 10 incidental mentions of
  "tournament" and zero date strings. The list is rendered client-side.
- Implication: a plain `curl` scrape will not work. Either read the Nuxt payload
  (`__NUXT_DATA__` / `_payload.json`) or drive a headless browser.
- Also loads `cdn.omise.co/omise.js` (payment provider) — entry fees are paid
  on-site, so tournament records likely carry entry deadlines and fees.

### Source 2 — JTTL (`jttsingapore.com/page/jttl_information.html`)

Probed 2026-08-05 with curl. WebFetch got 403; curl with a browser UA got 200.

- **Static HTML, 32 KB** — text is readable directly. No SPA, no API needed.
- JTTL = Junior Team Tennis League, sanctioned by STA, managed by UFIT/Savitar.
- **Two seasons a year:** Season 1 (Feb–May), Season 2 (Sep–Nov).
- **Each season runs over 6 weekends**, explicitly "scheduled away from holidays".
- **Season 2, 2026 starts September 19th/20th.**
- Age divisions: 10/U A+B, 12/U A+B, 14/U A+B, 17/U A+B. Eligibility is by birth
  year (10&U = born 2016 or later; 12&U = born 2014 or later; …).
- Each fixture = 6 matches (2 doubles, 4 singles); teams of 5–8 players.
- **The actual fixture dates are not published on this page** — the nav shows
  "Draw & Schedule TBU" and "Team Lists TBU" for Season 2, 2026.

### STA deep dive — how far the data actually is

Traced the Nuxt app to find whether tournaments are machine-readable:

| Probe | Result |
|-------|--------|
| `__NUXT_DATA__` blob | 670 chars — auth/theme state only, **no tournaments** |
| `/tournaments/_payload.json` | 200 but 66 bytes — empty |
| `/api/tournaments` | 404 |
| All 85 `/_nuxt/*.js` chunks (2.3 MB) downloaded and grepped | found the API surface |

The backend API surface is real and REST-ish — endpoints recovered from the
chunks include:

```
/Tournament/GetTournamentList      ← the one we would want
/Tournament/GetTournamentInfo
/Tournament/GetEligibleTournamentEvent?id=…&profileId=…
/Venue/VenueList
/Account/*, /Dashboard/*, /Notification/*, /Singpass/*
```

But:

- Calling `https://www-new.singtennis.org.sg/Tournament/GetTournamentList`
  (GET and POST) returns the **Nuxt 404 page** — these paths are not on the
  public web host.
- No external API hostname appears in **any** of the 85 chunks. The API base is
  injected server-side at runtime, so requests are proxied through the app's own
  server. The path prefix is not recoverable from static analysis.
- Chunk filenames are content-hashed (`oTAYnuxS.js`), so they change on every
  STA deploy — anything built on them rots.

**Conclusion at the time: no usable public JSON API.** — **THIS WAS WRONG.
Corrected 2026-08-06, see below.**

### CORRECTION (2026-08-06) — STA does have a public, CORS-open JSON API

Static analysis of the bundles could not find the API hostname because it is
injected at runtime. Loading the page in a real browser and watching the
network revealed it immediately:

```
POST https://api.singtennis.org.sg/web-api/Tournament/GetTournamentList
body: {}
```

Verified directly with curl:

| Property | Result |
|---|---|
| Auth | **None.** A bare `POST {}` returns 200 |
| Payload | ~36 KB, **122 tournaments** grouped by month |
| `GET` | 405 — it is POST-only |
| `Access-Control-Allow-Origin` | **`*`** |
| Preflight `OPTIONS` | 204, allows `POST` + `content-type` |

Per tournament: `tournamentId`, `slug`, `tournamentName`, `entryOpen`,
`tournamentLevelName`, `tournamentTypeName`, `startDate`, `endDate`, `deadline`
(dates as `DD/MM/YYYY`).

**What this changes:** the browser can call this API directly. No proxy, no
serverless function, no headless browser, no scraper — for STA. The earlier
"a static page physically cannot do it" conclusion held only because the
endpoint was unknown; it is not a CORS limitation, since STA sends `*`.

**What it does not change:** JTT/LeagueRepublic still sends no CORS headers, so
JTTL data continues to come from the offline scraper in `tools/`.

**Not available anywhere:** venue. It is absent from the list payload and from
the rendered detail page (`?type=information` shows only deadlines and dates),
so venue stays a manual field. `Tournament/GetTournamentInfo` exists but rejects
`{id}`, `{tournamentId}` and `{slug}` — its request shape was not worth chasing
since the list already carries everything obtainable.

**Lesson:** static analysis of a bundled SPA proves what is *in the bundle*, not
what the app *does*. One browser network trace was worth more than grepping
2.3 MB of chunks.

### What this means for the design

1. **Neither source gives a clean machine-readable fixture list today.** STA
   hides it behind a Nuxt SPA; JTTL has not published its Season 2 draw yet.
2. **A static site cannot fetch either source directly** — cross-origin requests
   from the browser will be blocked, and neither sends CORS headers.
3. So an automatic in-browser import is not achievable. Realistic options are a
   build-time fetch script, a serverless proxy, or manual entry with the season
   skeleton pre-filled.
4. **The JTTL structure is highly predictable** — 6 weekends, known season
   windows, known start date. That skeleton can be generated without scraping
   anything, and refined when the draw is published.

## Answers received from the user (2026-08-05)

| Question | Answer |
|----------|--------|
| Match data source | Wants federation import, naming **STA** and **JTTL** as the two sources |
| Trips / holidays | **Stored as records** — first-class, shown on the year view |
| Training blocks | **Many blocks, anchored to matches** — build-up/taper toward a match |
| Players | **Several kids.** Matches can be pooled/shown together. **Training blocks are shared** — all kids train at the same time |

The last point is the important structural one: **matches are per-child, training
is per-household.** A block is scheduled once and applies to every kid, so the
block does not carry a player dimension — only matches do.

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| ~~No live scraping from the browser~~ | **Superseded.** STA sends `Access-Control-Allow-Origin: *`, so the page reads its API directly. Still true for JTT, which sends no CORS headers |
| STA link lookup runs in the browser | One unauthenticated POST returns all 122 tournaments; matching the slug out of a pasted URL fills the form with no server involved |
| Venue stays a manual field | STA does not publish it in the API or on the tournament page |
| Training blocks are household-level, not per-player | User confirmed all kids train together; putting a player key on blocks would model a distinction that does not exist |
| Matches carry a player reference | Each child enters different events; the year view overlays them |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| WebFetch truncated the STA page and got 403 from JTT | Used curl with a browser User-Agent — both returned 200 |
| `xargs` chunk download failed on shell quoting (0 files) | Mutated approach to a bounded `while read` loop with background jobs — got all 85 |
| STA tournament list not in served HTML | Traced to a Nuxt SPA; recovered the API surface from JS chunks, but the endpoints 404 on the public host |

## Phase 2 design — architecture

### Repo shape

```
vercel-deploy/          the deployed static site (unchanged deploy contract)
  index.html
  data/matches.json     GENERATED — committed, read by the site
  vercel.json
tools/                  separate scraper component, never deployed
  package.json
  scrape-jttl.mjs       fetch + parse static HTML
  scrape-sta.mjs        Playwright renders the SPA
  build-matches.mjs     merge → ../vercel-deploy/data/matches.json
  snapshots/            saved source HTML for tests
```

The scraper is decoupled: it only ever writes `matches.json`. The site never
calls it, never depends on Playwright, and still deploys as static files.

### `matches.json` contract

```jsonc
{
  "generatedAt": "2026-08-05T00:00:00Z",
  "sources": [ { "id": "sta", "fetchedAt": "…", "ok": true, "count": 12 } ],
  "matches": [
    {
      "id": "sta-2026-junior-champs",
      "source": "sta" | "jttl",
      "name": "STA Junior Championships",
      "start": "2026-11-21",           // ISO, always present
      "end": "2026-11-23",             // ISO, defaults to start
      "venue": "Kallang Tennis Centre",
      "categories": ["12U Boys"],       // free-form
      "entryDeadline": "2026-11-01",    // nullable
      "url": "https://…",
      "provisional": false              // true for generated JTTL weekends
    }
  ]
}
```

`provisional: true` matters — JTTL's Season 2 draw is "TBU", so generated
weekend dates must be visibly marked as estimates, never shown as confirmed.

### App state (localStorage, new key `tennis-season-v2`)

```jsonc
{
  "version": 2,
  "players":  [ { "id", "name", "birthYear", "colour" } ],
  "entries":  [ { "matchId", "playerId", "status" } ],   // planned|entered|confirmed|skipped
  "blocks":   [ { "id", "name", "start", "days", "anchorMatchId", "plan": {} } ],
  "trips":    [ { "id", "name", "start", "end", "destination", "notes" } ],
  "manualMatches": [ /* same shape as matches.json entries, source:"manual" */ ]
}
```

Key modelling decision, straight from the user's answer:

- **`entries` carry a playerId** — each child enters different events.
- **`blocks` do NOT carry a playerId** — all kids train together, so a block is
  a household-level record. Adding a player key would model a distinction that
  does not exist and would multiply the UI for no gain.
- `blocks[].plan` keeps the v1 `{dayIndex: {am, pm}}` shape, so the existing
  planner code ports in largely intact.

### Views

| View | Purpose |
|------|---------|
| **Year** | 12-month timeline. Matches as markers coloured per child, training blocks and trips as bands. The travel-planning surface. |
| **Matches** | List with per-child entry status and entry deadlines. |
| **Block** | The v1 two-week grid, generalised: variable length, anchored to a match, taper warnings as match day approaches. |
| **Trips** | Add/edit holidays. |

### Conflict checks — the actual point of the redesign

- Trip overlaps a match a child is **entered** in → error
- Entry deadline within 14 days and status still `planned` → warning
- Two matches overlap for the same child → error
- A block's anchor match falls outside the block, or with no taper → warning
- Longest match-free window in the year → informational, the travel hint

### Migration from v1.0.0

Read `tennis-camp-plan-v1`; if present, wrap the old `{start, plan}` into
`blocks[0]` with `start` and `days: 14`, then write `tennis-season-v2`. Keep the
v1 key untouched so a rollback to the v1.0.0 deploy still finds its data.

### Staged delivery

- **v2.0** — data layer, year view, matches, trips, conflicts, migration
- **v2.1** — block editor ported in and anchored to matches
- **tools/** — ships alongside; JTTL parser first (easy, static HTML), STA
  Playwright scraper second

### Caveats the user has been told explicitly

1. **JTTL fixtures do not exist yet.** The Season 2 2026 draw is "TBU". The six
   weekends can be generated from the Sep 19/20 start, but they are estimates
   and will be rendered as such (`provisional: true`), never as confirmed dates.
2. **The STA scraper is the fragile part of this build.** Chunk filenames are
   content-hashed and change on every STA deploy, so the scraper must drive the
   rendered page rather than their internals, backed by snapshot tests so
   breakage fails loudly instead of silently producing an empty calendar.

### Status

Design complete. **Awaiting user sign-off** before Phase 3 begins. First build
step after sign-off: `tools/scrape-jttl.mjs`, because JTTL is the only source
with real, verifiable data available today.

## Phase 4 — what JTTL actually exposes (2026-08-05)

Building the scraper overturned the Phase 1 reading of this source. Phase 1
looked at one editorial page and concluded JTTL offered a *season skeleton* to
be generated. It offers a **complete fixture archive**.

### The correction

The site runs on **LeagueRepublic**, a league-management platform. Its
fixture-group pages are server-rendered and carry real fixtures with dates,
times, teams and scores, for **14 seasons back to 2017**.

- Entry point: `/fg/{divisionId}.html` — one page per division.
- 2026 Season One: **37 divisions, 222 fixtures**, all parsed.
- The Phase 1 URL (`jttsingapore.com/page/jttl_information.html`) now **404s**;
  content moved to the `www.` host, and that page's body is now empty anyway.

So JTTL matches are **real data** (`provisional: false`). Only the unpublished
next season is projected.

### What is still not available

| Wanted | Status |
|--------|--------|
| Venue per fixture | **Unavailable.** `/match/{id}.html` is client-rendered — 202, empty body |
| 2026 Season Two draw | **Unpublished.** Nav still says "Draw & Schedule TBU"; the season is absent from the dropdown |
| Season start date | **No longer scrapeable.** The information page body is client-rendered |

Only `/fg/` is server-rendered. `/matchHub/…`, `/match/…`,
`/standingsForDate/…`, `/results/…` all answer `202` with an empty body. That is
a permanent property, not a transient failure, so the scraper treats a 202-empty
as "no data here" rather than retrying.

### Season shape — measured, not assumed

Phase 1 recorded "6 weekends, scheduled away from holidays". The archive shows
what that means: the weekends are **not consecutive**, and the two halves of the
year are spaced differently.

| Season | Weekends | Week offsets from the first |
|--------|----------|------------------------------|
| 2026 Season One | Feb 7/8, Feb 14/15, Mar 7/8, Apr 18/19, Apr 25/26, May 9/10 | 0, 1, 4, 10, 11, 13 |
| 2025 Season Two | Sep 20/21, Sep 27/28, Oct 4/5, Nov 1/2, Nov 8/9, Nov 15/16 | 0, 1, 2, 6, 7, 8 |

This matters directly. Generating six consecutive weekends from the published
2026 Season Two start (Sep 19) would have ended the season on Oct 25 — a month
before it actually ends, and outside the documented Sep–Nov window. The scraper
instead reads the offsets off the most recent season in the **same half of the
year** and projects them forward:

> 2026 Season Two (projected): Sep 19/20, Sep 26/27, Oct 3/4, Oct 31–Nov 1,
> Nov 7/8, Nov 14/15 — all `provisional: true`.

### Source quirks the scraper works around

1. **Host.** The apex 404s on content paths; the default Node UA is rejected.
2. **Season selection is a POST**, not a URL — `/fg-set.html` with
   `fixtureGroupPageContent.filterSeasonID`, held in a session cookie. Node's
   `fetch` keeps no cookie jar, so `tools/lib/http.mjs` carries one.
3. **Session drift.** The site is behind an AWS load balancer. Over a 37-page
   sweep a request eventually lands on a backend that has lost the session and
   silently serves the *current* season. This produced a complete, plausible,
   **wrong-year** fixture set on the first end-to-end run. Fixed by re-selecting
   the season on every request and asserting the returned page agrees. It was
   caught only because the assertion existed — worth keeping in mind for STA.
4. **Division keys are season-specific.** Passing a Season One key while asking
   for Season Two makes the site follow the division and switch season back.
   Entering a season selects by season ID alone.

### Contract note

`matches.json` records are emitted exactly per the Phase 2 contract, with one
**additive** field: provisional records carry `note`, a sentence naming the
season the projection came from. Consumers that ignore unknown fields are
unaffected. Division names go in `categories`; team names are folded into
`name`. If the year view later needs per-team filtering ("only my kid's team"),
that wants a real contract change, not more string parsing — flagged, not done.

## Resources

- Repo: https://github.com/miaolin/tennis_trainining_planner
- v1.0.0 release: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v1.0.0
- Site source: `vercel-deploy/index.html`
- Deploy contract: `vercel-deploy/vercel.json`, Vercel Root Directory = `vercel-deploy`

## Visual/Browser Findings

- Not yet run against a browser in this phase. The v1.0.0 layout was verified
  under jsdom only (33 assertions); no visual screenshot capture has been done.

---
*Update this file after every 2 view/browser/search operations*
