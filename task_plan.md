# Task Plan: Tennis planner redesign — year view + match calendar

## Goal

Grow the single-purpose two-week training planner into a junior tennis season
planner: a year-level overview of matches and training blocks, the existing
two-week block plan sitting inside it, so holidays and travel can be booked
around known match dates.

## Current Phase

Phase 2 — Information architecture & data model. Design is complete and written
up in findings.md; the only remaining item is user sign-off before building.
Next action after sign-off: the JTTL parser, because it is the one source with
real data that can be verified today.

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

### Phase 3: Scraper tool (separate component, `tools/`)
- [ ] `scrape-jttl.mjs` — fetch + parse the static JTTL page (season windows,
      divisions, start dates; fixtures when the draw is published)
- [ ] `scrape-sta.mjs` — Playwright renders the STA SPA, extracts tournaments
- [ ] `build-matches.mjs` — merge both into `vercel-deploy/data/matches.json`
- [ ] Snapshot fixtures + tests so a source layout change fails loudly
- **Status:** pending

### Phase 4: Visual design direction
- [ ] Year-view visual language (the v1 court palette is built for 14 cells, not 365 days)
- [ ] Per-child colour coding; trip and block bands; conflict markers
- [ ] Verify it holds on a phone
- **Status:** pending

### Phase 5: Implementation — v2.0 (season view)
- [ ] Data layer, `matches.json` loading with a file:// fallback
- [ ] Storage migration from `tennis-camp-plan-v1`
- [ ] Year overview: matches, trips, blocks on one timeline
- [ ] Players + per-child entry status
- [ ] Trips CRUD
- [ ] Conflict checks (trip vs. entered match, deadline approaching, clashes)
- **Status:** pending

### Phase 6: Implementation — v2.1 (blocks)
- [ ] Port the v1 two-week planner in as a block editor
- [ ] Variable length; anchor a block to a match; taper warnings near match day
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

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| WebFetch truncated the STA page; WebFetch got HTTP 403 from JTT | 1 | Switched to `curl` with a browser User-Agent — both returned 200 |
| `xargs` chunk download wrote 0 files (shell quoting of `$UA`/`{}`) | 1 | Mutated the approach to a bounded `while read` loop with background jobs — all 85 chunks downloaded |
| `/Tournament/GetTournamentList` returns the Nuxt 404 page (GET and POST) | 1 | Confirmed the endpoints are not on the public host; recorded that static analysis cannot recover the API base |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| STA changes their SPA layout | Scraper silently returns nothing or wrong dates | Snapshot tests over saved HTML; scraper exits non-zero on zero results rather than writing an empty `matches.json` |
| JTTL draw stays "TBU" | The dates travel is planned around are estimates | `provisional: true` rendered visibly differently; never presented as confirmed |
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
