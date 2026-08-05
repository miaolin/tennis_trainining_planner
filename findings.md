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

**Conclusion: no usable public JSON API.** Extracting STA tournaments would
require a headless browser (Playwright) rendering the SPA and reading the DOM or
intercepting its network calls — a real sub-project with ongoing maintenance,
not a small import feature.

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
| No live scraping from the browser | Cross-origin fetch to STA/JTT is blocked and neither sends CORS headers; a static site physically cannot do it |
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
