#!/usr/bin/env node
// Scrape JTTL fixtures from jttsingapore.com into a matches.json source fragment.
//
//   node scrape-jttl.mjs [--out tools/data/jttl.json] [--season "2026 Season One"]
//                        [--first-weekend YYYY-MM-DD] [--no-provisional] [--quiet]
//
// Writes `{ source, fetchedAt, ok, count, matches }` — the shape build-matches.mjs
// merges into vercel-deploy/data/matches.json. Exits non-zero, and writes
// nothing, if it cannot parse a single real fixture: a silent empty calendar
// would look exactly like a free year.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session } from './lib/http.mjs';
import { parseSeasons, parseDivisionIds, parseFixtures, toMatchRecord } from './lib/jttl-parse.mjs';
import {
  weekendOffsets,
  parseSeasonName,
  nextSeason,
  seasonName,
  provisionalWeekends,
} from './lib/jttl-season.mjs';

const BASE_URL = 'https://www.jttsingapore.com';
const ENTRY_DIVISION = '1_691250457'; // any division page: it carries both dropdowns
const INFO_URL = `${BASE_URL}/page/jttl_information.html`;

// The published start of the next season. It is not scrapeable — the JTTL
// information page body is now client-rendered and served empty — so it is
// recorded here and overridable with --first-weekend.
const NEXT_SEASON_FIRST_WEEKEND = '2026-09-19';

const here = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { out: resolve(here, 'data/jttl.json'), provisional: true, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = resolve(argv[++i]);
    else if (a === '--season') args.season = argv[++i];
    else if (a === '--first-weekend') args.firstWeekend = argv[++i];
    else if (a === '--no-provisional') args.provisional = false;
    else if (a === '--quiet') args.quiet = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

/**
 * Fetch one division page with the season pinned.
 *
 * The season lives in a session cookie, but the site sits behind an AWS load
 * balancer and a long sweep eventually lands on a backend that has lost the
 * session — silently serving the *current* season instead. Selecting season and
 * division together on every request makes each page self-contained, and the
 * assertion below catches it if the site ever ignores us anyway. Getting this
 * wrong is expensive: it yields a full set of plausible fixtures for the wrong
 * season.
 */
async function fetchDivision(session, season, division) {
  // Division keys are season-specific. Passing one from another season makes the
  // site follow the division and quietly switch season, so entering a season
  // (division === null) selects by season alone.
  const fields = { 'fixtureGroupPageContent.filterSeasonID': season.id };
  if (division) fields['fixtureGroupPageContent.filterFixtureGroupKey'] = division;

  let served = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { body } = await session.postForm('/fg-set.html', fields);
    const selected = parseSeasons(body).find((s) => s.selected);
    if (selected?.id === season.id) return body;
    served = selected?.name ?? 'an unknown season';
  }
  throw new Error(
    `asked for ${season.name}${division ? ` on division ${division}` : ''} but the site ` +
      `served ${served} three times — refusing to mix seasons`,
  );
}

/** Load a season and return every fixture across all of its divisions. */
async function scrapeSeason(session, season, log) {
  const entry = await fetchDivision(session, season, null);
  const divisions = parseDivisionIds(entry);
  log(`  ${divisions.length} divisions`);

  const fixtures = [];
  const seen = new Set();
  for (const division of divisions) {
    const body = await fetchDivision(session, season, division);
    for (const f of parseFixtures(body)) {
      if (seen.has(f.matchId)) continue;
      seen.add(f.matchId);
      fixtures.push(f);
    }
  }
  return fixtures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const log = args.quiet ? () => {} : (m) => console.error(m);

  const session = new Session(BASE_URL);
  const { body: entry } = await session.get(`/fg/${ENTRY_DIVISION}.html`);

  const seasons = parseSeasons(entry);
  if (seasons.length === 0) throw new Error('no seasons found — the page layout has changed');

  const target = args.season
    ? seasons.find((s) => s.name === args.season)
    : seasons[seasons.length - 1];
  if (!target) {
    throw new Error(`season "${args.season}" not found. Available: ${seasons.map((s) => s.name).join(', ')}`);
  }

  log(`Latest published season: ${target.name}`);
  const fixtures = await scrapeSeason(session, target, log);
  log(`  ${fixtures.length} fixtures`);

  if (fixtures.length === 0) {
    throw new Error(
      `parsed 0 fixtures from ${target.name} — refusing to write an empty result. ` +
        'The page layout has most likely changed; re-check tools/snapshots/.',
    );
  }

  const matches = fixtures.map((f) => toMatchRecord(f, { baseUrl: BASE_URL }));

  // Project the next season's weekends, using the last comparable season (same
  // half of the year) as the template for how the six weekends are spaced.
  const upcoming = [];
  const parsed = parseSeasonName(target.name);
  if (args.provisional && parsed) {
    const next = nextSeason(parsed);
    const reference = [...seasons]
      .reverse()
      .find((s) => parseSeasonName(s.name)?.half === next.half);

    let offsets = [0, 1, 2, 3, 4, 5];
    let referenceName = null;
    if (reference) {
      const refFixtures = await scrapeSeason(session, reference, () => {});
      const refOffsets = weekendOffsets(refFixtures.map((f) => f.date));
      if (refOffsets.length > 0) {
        offsets = refOffsets;
        referenceName = reference.name;
      }
    }

    log(
      `Projecting ${seasonName(next)}: ${offsets.length} weekends, offsets [${offsets}]` +
        (referenceName ? ` from ${referenceName}` : ' (fallback: consecutive)'),
    );

    upcoming.push(
      ...provisionalWeekends({
        season: next,
        firstWeekend: args.firstWeekend ?? NEXT_SEASON_FIRST_WEEKEND,
        offsets,
        url: INFO_URL,
        reference: referenceName,
      }),
    );
  }

  const payload = {
    source: 'jttl',
    fetchedAt: new Date().toISOString(),
    ok: true,
    season: target.name,
    count: matches.length + upcoming.length,
    matches: [...matches, ...upcoming].sort((a, b) => a.start.localeCompare(b.start)),
  };

  await mkdir(dirname(args.out), { recursive: true });
  await writeFile(args.out, `${JSON.stringify(payload, null, 2)}\n`);
  log(`Wrote ${payload.count} records (${matches.length} real, ${upcoming.length} provisional) to ${args.out}`);
}

main().catch((err) => {
  console.error(`scrape-jttl failed: ${err.message}`);
  process.exit(1);
});
