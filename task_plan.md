# Task Plan: Tennis planner redesign — year view + match calendar

## Goal

Grow the single-purpose two-week training planner into a junior tennis season
planner: a year-level overview of matches and training blocks, the existing
two-week block plan sitting inside it, so holidays and travel can be booked
around known match dates.

## Current Phase

Phase 4 (scraper tool) is **in progress**. `tools/scrape-jttl.mjs` is **built,
tested (18 assertions) and producing real data** — 222 real fixtures across 37
divisions plus 6 projected weekends for 2026 Season Two. Remaining in Phase 4:
`scrape-sta.mjs` and `build-matches.mjs`.

Phase 3 (training block planner) is complete — built, tested (83 assertions
passing), documented. Not released; `main` still holds v1.0.0.

The JTTL build overturned a Phase 1 assumption: the league's site exposes a
**complete machine-readable fixture archive**, so JTTL matches are real data,
not a generated skeleton. See findings.md, "Phase 4 — what JTTL actually
exposes".

Phase 2 (design) remains the reference; see findings.md. Reordering the phases
changed sequencing, not architecture. The v2 data layer now exists with
`players`, `entries`, `trips` and `manualMatches` written but empty.

## Phases

### Phase 1: Requirements & Discovery
- [x] Capture the user's stated intent
- [x] Resolve open questions (answers recorded in findings.md)
- [x] Inventory what v1.0.0 already provides and what must survive the redesign
- [x] Research both named match sources (STA, JTTL)
- [x] Document in findings.md
- **Status:** complete

### Phase 2: Information architecture & data model
- [x] Decide the view structure and how the user moves between views
- [x] Design the data model: players, matches, entries, blocks, trips
- [x] Decide the `matches.json` contract between scraper and site
- [x] Decide storage and the migration path off `tennis-camp-plan-v1`
- [ ] User sign-off on the design before building
- **Status:** in_progress

### Phase 3: Training block planner  ← REORDERED TO FIRST (user request)
Builds the v2 data layer and the multi-block editor. Chosen first because it is
the only part with no dependency on match data.
- [x] `tennis-season-v2` state shape + save/load/validate
- [x] Migration from `tennis-camp-plan-v1` (v1 key left intact)
- [x] Multiple named blocks: create, rename, delete, switch
- [x] Variable block length (1–60, default 14) with a real start date
- [x] Port the v1 grid: AM/PM slots, five session types, drag / tap / keyboard
- [x] Per-week totals generalised beyond exactly two weeks
- [x] Load checks adapted to variable length
- [x] Export as text + print
- [x] `anchorMatchId` carried in the model but inert until matches exist
- [x] Test harness committed to `tests/` — 83 assertions, all passing
- [x] README + CHANGELOG updated
- **Status:** complete

**Session detail: confirmed AM/PM + type** (user chose to keep the v1 model —
no per-session start times, coach, or focus tags). The v1 hour maths survives
unchanged.

### Phase 4: Scraper tool (separate component, `tools/`)
- [x] `scrape-jttl.mjs` — fetch + parse JTTL fixtures. Scope grew: the site
      carries a full fixture archive (14 seasons), not just a season skeleton
- [x] Season switching via the `/fg-set.html` POST + session cookie
- [x] Projection of the next season's weekends from the last comparable season,
      marked `provisional: true`
- [x] Fail-loud guards: exits non-zero and writes nothing on zero fixtures or a
      season mismatch
- [x] Snapshot fixtures + tests so a source layout change fails loudly — 18
      assertions, all passing, no network
- [ ] `scrape-sta.mjs` — Playwright renders the STA SPA, extracts tournaments
- [ ] `build-matches.mjs` — merge both into `vercel-deploy/data/matches.json`
- **Status:** in_progress — JTTL done, STA and the merge step remain

### Phase 5: Visual design direction
- [ ] Year-view visual language (the v1 court palette is built for 14 cells, not 365 days)
- [ ] Per-child colour coding; trip and block bands; conflict markers
- [ ] Verify it holds on a phone
- **Status:** pending

### Phase 6a: Tournaments view  ← DONE (user reorg: "two parts")
The user asked for the page to become two parts: training planner, and
tournaments + who is joining. Built as two top-level views rather than stacked
sections, because the planner is already a tall page.
- [x] Nav between Training and Tournaments; header adapts per view
- [x] Kids: add, remove, per-child colour
- [x] Manual tournament entry; grouped by month, sorted, past ones dimmed
- [x] Per-child entry status cycle (planned/entered/confirmed/skipping/none)
- [x] `data/matches.json` read at load and merged; ships empty
- [x] Season checks: closing deadlines, clashes, provisional dates, travel window
- [x] Tournament inside a training block names that block
- **Status:** complete

### Phase 6b: Season view — remaining
- [x] `matches.json` loading with a `file://` fallback
- [x] Players + per-child entry status
- [x] Conflict checks (deadline approaching, clashes)
- [ ] Year overview: matches, trips, blocks on one timeline
- [ ] Trips CRUD, and trip-vs-entered-match conflicts
- [ ] Activate `anchorMatchId`: taper warnings near match day
- **Status:** pending

### Phase 7: Testing & Verification
- [ ] Extend the jsdom harness (commit it this time — it currently lives only in scratch)
- [ ] Verify a v1.0.0 saved plan survives the upgrade
- [ ] Scraper tests against saved HTML snapshots
- [ ] Phone layout and print output
- **Status:** pending

### Phase 8: Delivery
- [ ] README + CHANGELOG
- [ ] Tag v2.0.0, release, deploy
- **Status:** pending

## Key Questions

1. ~~How does match data actually get in?~~ — **ANSWERED:**
   **JTTL** is parsed from its static HTML. **STA** gets a *separate scraper
   tool*, built as its own component in the repo, decoupled from the site.
   Both feed a generated `matches.json` that the site reads.
2. ~~One child or several?~~ — **ANSWERED: several kids.** Matches are
   per-child; training blocks are shared across all of them.
3. ~~Are trips first-class?~~ — **ANSWERED: yes, stored as records.**
4. ~~Do training blocks attach to matches?~~ — **ANSWERED: yes**, many blocks
   across the year, each anchored to the match it builds toward.
5. ~~How many training blocks per year?~~ — **ANSWERED: many.**
6. **Does the two-week block stay fixed-length?** — still open, but low risk:
   "anchored to a match" implies variable length. Assume variable, default 14 days.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Plan before coding | The redesign changes the data model, not just the layout; building first would mean rewriting storage twice |
| Keep v1.0.0 deployed and tagged | Gives a known-good rollback point while the redesign is in flight |
| Scraper lives in `tools/`, decoupled from the site | The site stays a static deploy with no Playwright dependency; the scraper's only output is `matches.json` |
| Site reads a generated, committed `matches.json` | Same-origin fetch works on a static host; the data is version-controlled and diffable |
| No live fetch from the browser to STA/JTT | Cross-origin and neither source sends CORS headers — physically impossible from a static page |
| `entries` carry a `playerId`; `blocks` do not | Each child enters different events, but all kids train together, so a block is a household-level record |
| `blocks[].plan` keeps the v1 `{dayIndex:{am,pm}}` shape | Lets the existing planner port in largely intact |
| New storage key `tennis-season-v2`, v1 key left untouched | v1's `sanitise()` would reject the new shape and silently wipe the plan; leaving the old key intact keeps a v1.0.0 rollback working |
| Generated JTTL weekends marked `provisional: true` | The Season 2 draw is "TBU" — estimated dates must never render as confirmed |
| Staged delivery: v2.0 season view, then v2.1 block editor | The year view is the new value; the block editor is a port and can follow |
| Drive STA's rendered page, not its internals | Chunk filenames are content-hashed and change every deploy |
| JTTL fixtures are scraped as real data, not generated | The league publishes a complete fixture archive; generating a skeleton when real dates exist would be strictly worse |
| `tools/` stays zero-dependency | The JTTL path must keep running once STA drags Playwright into the folder |
| Re-select the season on every request and assert the response | Session drift behind the load balancer silently serves the wrong season — a complete, plausible, wrong-year fixture set |
| Weekend spacing projected from the last same-half season | Seasons skip weekends around holidays; six-in-a-row would have put half of Season Two in the wrong month |
| Provisional records carry an extra `note` field | Additive to the contract; records why a date is a projection so the UI can say so |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| WebFetch truncated the STA page; WebFetch got HTTP 403 from JTT | 1 | Switched to `curl` with a browser User-Agent — both returned 200 |
| `xargs` chunk download wrote 0 files (shell quoting of `$UA`/`{}`) | 1 | Mutated the approach to a bounded `while read` loop with background jobs — all 85 chunks downloaded |
| `/Tournament/GetTournamentList` returns the Nuxt 404 page (GET and POST) | 1 | Confirmed the endpoints are not on the public host; recorded that static analysis cannot recover the API base |
| The JTTL URL from Phase 1 now 404s | 1 | Content moved to the `www.` host; the apex 404s on content paths. Scraper pins `www.` |
| `/matchHub/`, `/match/`, `/standingsForDate/` answer 202 with an empty body | 1 | Client-rendered, not transient. Treated as "no data here"; `/fg/` is the only readable surface. Costs us venue data |
| The JTTL information page body is now empty | 1 | Client-rendered. The season start date is no longer scrapeable — pinned as a constant, overridable with `--first-weekend` |
| Reference-season scrape silently returned the wrong season's fixtures | 2 | AWS load-balancer session drift. Fixed by re-selecting the season per request and asserting the response; caught only because the assertion was added |
| Passing a Season One division key while asking for Season Two switched the season back | 1 | Division keys are season-specific; entering a season now selects by season ID alone |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| STA changes their SPA layout | Scraper silently returns nothing or wrong dates | Snapshot tests over saved HTML; scraper exits non-zero on zero results rather than writing an empty `matches.json` |
| JTTL draw stays "TBU" | The dates travel is planned around are estimates | `provisional: true` rendered visibly differently; never presented as confirmed. Projection is now grounded in the last comparable season rather than guessed |
| JTTL session drift serves the wrong season | A full set of plausible fixtures, wrong year — worse than no data | Season re-selected per request and asserted; scraper aborts rather than mixing seasons |
| JTTL fixtures carry no venue | Cannot tell which court a match is at | Accepted: the per-match page is client-rendered. Revisit only if the STA Playwright work makes a browser available to `tools/` |
| Scope creep — v2 is much larger than v1 | Half-finished redesign replaces a working v1 | Ship v2.0 and v2.1 separately; v1.0.0 stays tagged and deployable |
| `matches.json` fetch fails on `file://` | Page opens empty when double-clicked locally | Graceful fallback to manual/localStorage data plus a visible notice |
| Playwright in the repo | Heavy dev dependency | Confined to `tools/`, never installed or shipped by the site |

## Notes

- v1.0.0 is tagged, released, and deployed from `vercel-deploy/`. Do not break
  that folder's deploy contract without updating README + `vercel.json`.
- The existing jsdom harness (33 assertions) lives in the session scratchpad,
  not in the repo. Phase 7 commits it.
- Research artefacts (85 STA chunks, both source HTML files) are in the session
  scratchpad — they will not survive; `tools/snapshots/` is the durable home.
- Update phase status as work progresses: pending → in_progress → complete
- Re-read this plan before major decisions
- Log ALL errors
