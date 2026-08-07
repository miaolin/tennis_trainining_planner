# tools — match data scrapers

Dev-only. Nothing here is deployed; the site never calls it. The only contract
between this folder and `vercel-deploy/` is the generated JSON.

```
lib/           parsers and season maths (pure, unit-tested)
scrape-jttl.mjs  JTTL  -> data/jttl.json       ← built
scrape-sta.mjs   STA   -> data/sta.json        ← not built yet (needs Playwright)
build-matches.mjs merge -> ../vercel-deploy/data/matches.json  ← not built yet
snapshots/     real pages saved 2026-08-05, used by the tests
```

Zero dependencies, so it runs on a bare Node install. Requires Node 20+
(`fetch`, `getSetCookie`, `node:test`).

## Running

```sh
cd tools
npm test              # 18 assertions against the saved snapshots — no network
npm run scrape:jttl   # hits the live site, writes data/jttl.json
```

Flags: `--out <path>`, `--season "2025 Season Two"`, `--first-weekend YYYY-MM-DD`,
`--no-provisional`, `--quiet`.

## What the JTTL scraper produces

`data/jttl.json` holds `{ source, fetchedAt, ok, season, count, matches }` where
each match follows the `matches.json` contract in `findings.md`. As of
2026-08-05: **222 real fixtures** across 37 divisions of 2026 Season One, plus
**6 provisional weekends** for 2026 Season Two.

Provisional records carry `provisional: true` and an extra `note` field naming
the season they were projected from. They must never be rendered as confirmed.

## How the source actually behaves

Learned the hard way; each point is a constraint the code works around.

- **Use `www.jttsingapore.com`.** The apex host 404s on content paths. The
  default Node user-agent is rejected, so requests send a browser UA.
- **Only `/fg/{divisionId}.html` is server-rendered.** `/matchHub/…`,
  `/match/…` and `/standingsForDate/…` all answer `202` with an empty body —
  they are filled in by JavaScript. This is why fixtures carry **no venue**: the
  per-match page that would hold it is unreadable without a browser.
- **The information page is empty.** `/page/jttl_information.html` returns 200
  but its body is now client-rendered, so the published season start date is
  *not* scrapeable. It lives in `NEXT_SEASON_FIRST_WEEKEND` in
  `scrape-jttl.mjs` and is overridable with `--first-weekend`.
- **Season selection is a POST**, not a URL — `/fg-set.html` with
  `fixtureGroupPageContent.filterSeasonID`, remembered in a session cookie.
  Node keeps no cookie jar, so `lib/http.mjs` carries one.
- **The session drifts.** The site sits behind an AWS load balancer; over a long
  sweep a request eventually lands on a backend that has lost the session and
  silently serves the *current* season instead. The scraper therefore re-selects
  the season on every request and asserts the returned page agrees, retrying
  three times before failing. This matters more than it looks: undetected, it
  returns a complete, plausible set of fixtures for the wrong year.
- **Division keys are season-specific.** Passing one from another season makes
  the site follow the division and switch season. Entering a season selects by
  season ID alone.

## Season shape

Six weekends per season, "scheduled away from holidays" — so they are **not six
in a row**, and Season One and Season Two are spaced differently:

| Season | Weekends | Week offsets |
|--------|----------|--------------|
| 2026 Season One | Feb 7/8, Feb 14/15, Mar 7/8, Apr 18/19, Apr 25/26, May 9/10 | 0, 1, 4, 10, 11, 13 |
| 2025 Season Two | Sep 20/21, Sep 27/28, Oct 4/5, Nov 1/2, Nov 8/9, Nov 15/16 | 0, 1, 2, 6, 7, 8 |

Rather than guess, the scraper reads the offsets off the most recent season in
the *same half of the year* and projects them from the next season's published
start date. So 2026 Season Two is projected from 2025 Season Two, landing on
Sep 19/20, Sep 26/27, Oct 3/4, Oct 31–Nov 1, Nov 7/8, Nov 14/15 — inside the
documented Sep–Nov window. If no comparable season is found it falls back to six
consecutive weekends and says so in the `note`.

## Failure behaviour

The scraper **exits non-zero and writes nothing** if it parses zero fixtures, or
if the site serves a season other than the one requested. A silently empty
calendar would look exactly like a free year, which is the one failure this data
must never produce.

The snapshots exist so a layout change at the source breaks `npm test` loudly
instead of breaking the calendar quietly. When the source changes, re-save the
snapshot and fix the parser in the same commit.
