// Snapshot tests for the JTTL parser.
//
// The snapshots in tools/snapshots/ are real pages saved on 2026-08-05. They
// exist so a layout change at the source fails here, loudly, instead of quietly
// producing an empty calendar that reads as a free year.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  toISODate,
  parseSeasons,
  parseDivisionIds,
  parseDivisionName,
  parseFixtures,
  toMatchRecord,
} from '../lib/jttl-parse.mjs';
import {
  weekendStart,
  weekendsOf,
  weekendOffsets,
  parseSeasonName,
  nextSeason,
  seasonName,
  provisionalWeekends,
} from '../lib/jttl-season.mjs';

const snapshots = join(dirname(fileURLToPath(import.meta.url)), '..', 'snapshots');
const load = (name) => readFileSync(join(snapshots, name), 'utf8');

const S1 = load('fg-2026-season-one-10a-red-1.html');
const S2 = load('fg-2025-season-two-10a-red-1.html');

test('toISODate converts the site MM/DD/YY order', () => {
  assert.equal(toISODate('03/08/26'), '2026-03-08');
  assert.equal(toISODate('11/16/25'), '2025-11-16');
});

test('toISODate rejects junk and impossible dates', () => {
  assert.equal(toISODate('2026-03-08'), null);
  assert.equal(toISODate('13/40/26'), null);
  assert.equal(toISODate('02/30/26'), null);
  assert.equal(toISODate(''), null);
});

test('parseSeasons reads the season dropdown in page order', () => {
  const seasons = parseSeasons(S1);
  assert.equal(seasons.length, 14);
  assert.deepEqual(seasons[0], { id: '117142376', name: '2017 Season Two', selected: false });
  assert.equal(seasons.at(-1).name, '2026 Season One');
  assert.equal(seasons.at(-1).id, '535220283');
  // Every season parses into a year + half.
  for (const s of seasons) assert.ok(parseSeasonName(s.name), `unparsed: ${s.name}`);
});

test('parseSeasons marks the selected season after a season switch', () => {
  assert.equal(parseSeasons(S2).find((s) => s.selected)?.name, '2025 Season Two');
});

test('parseDivisionIds reads every division of the loaded season', () => {
  assert.equal(parseDivisionIds(S1).length, 37);
  assert.equal(parseDivisionIds(S2).length, 25);
  assert.ok(parseDivisionIds(S1).every((d) => /^1_\d+$/.test(d)));
});

test('parseDivisionName strips the site prefix', () => {
  assert.equal(parseDivisionName(S1), '10A Red 1 (1st Half)');
});

test('parseFixtures extracts complete fixture rows', () => {
  const fixtures = parseFixtures(S1);
  // Four teams playing a single round robin = six fixtures.
  assert.equal(fixtures.length, 6);

  const latest = fixtures.find((f) => f.matchId === '42937893');
  assert.deepEqual(latest, {
    matchId: '42937893',
    date: '2026-03-08',
    time: '12:00 PM',
    division: '10A Red 1 (1st Half)',
    home: 'Power Master Atoms',
    away: 'Back to the Future',
  });
});

test('parseFixtures ignores standings rows and never yields a partial record', () => {
  for (const html of [S1, S2]) {
    for (const f of parseFixtures(html)) {
      assert.match(f.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(f.matchId, /^\d+$/);
      assert.ok(f.division, 'every fixture carries a division');
      assert.ok(f.home && f.away, 'every fixture carries both teams');
    }
  }
});

test('parseFixtures returns nothing for a page with no fixture table', () => {
  assert.deepEqual(parseFixtures('<html><body><p>Draw &amp; Schedule TBU</p></body></html>'), []);
});

test('toMatchRecord matches the matches.json contract', () => {
  const fixture = parseFixtures(S1).find((f) => f.matchId === '42937893');
  assert.deepEqual(toMatchRecord(fixture, { baseUrl: 'https://www.jttsingapore.com' }), {
    id: 'jttl-42937893',
    source: 'jttl',
    name: '10A Red 1 (1st Half): Power Master Atoms v Back to the Future',
    start: '2026-03-08',
    end: '2026-03-08',
    venue: null,
    categories: ['10A Red 1 (1st Half)'],
    entryDeadline: null,
    url: 'https://www.jttsingapore.com/match/42937893.html',
    provisional: false,
  });
});

test('real fixtures are never marked provisional', () => {
  const records = parseFixtures(S2).map((f) => toMatchRecord(f, { baseUrl: 'https://x' }));
  assert.ok(records.length > 0);
  assert.ok(records.every((r) => r.provisional === false));
});

test('weekendStart rolls a Sunday back to its Saturday', () => {
  assert.equal(weekendStart('2025-09-20'), '2025-09-20'); // Saturday
  assert.equal(weekendStart('2025-09-21'), '2025-09-20'); // Sunday
  assert.equal(weekendStart('2026-03-08'), '2026-03-07'); // Sunday
});

test('weekendsOf collapses a Sat/Sun pair into one weekend', () => {
  assert.deepEqual(weekendsOf(['2025-09-21', '2025-09-20', '2025-09-27']), [
    '2025-09-20',
    '2025-09-27',
  ]);
});

test('weekendOffsets reproduces the real 2025 Season Two shape', () => {
  // Sep 20/21, Sep 27/28, Oct 4/5, Nov 1/2, Nov 8/9, Nov 15/16 — six weekends
  // with a three-week gap through October, not six in a row.
  const dates = [
    '2025-09-20', '2025-09-21', '2025-09-27', '2025-09-28',
    '2025-10-04', '2025-10-05', '2025-11-01', '2025-11-02',
    '2025-11-08', '2025-11-09', '2025-11-15', '2025-11-16',
  ];
  assert.deepEqual(weekendOffsets(dates), [0, 1, 2, 6, 7, 8]);
});

test('weekendOffsets handles the empty case', () => {
  assert.deepEqual(weekendOffsets([]), []);
});

test('season names parse and advance', () => {
  assert.deepEqual(parseSeasonName('2026 Season One'), { year: 2026, half: 1 });
  assert.deepEqual(parseSeasonName('2025 Season Two'), { year: 2025, half: 2 });
  assert.equal(parseSeasonName('Grading Day'), null);
  assert.deepEqual(nextSeason({ year: 2026, half: 1 }), { year: 2026, half: 2 });
  assert.deepEqual(nextSeason({ year: 2026, half: 2 }), { year: 2027, half: 1 });
  assert.equal(seasonName({ year: 2026, half: 2 }), '2026 Season Two');
});

test('provisionalWeekends projects the next season onto the reference shape', () => {
  const weekends = provisionalWeekends({
    season: { year: 2026, half: 2 },
    firstWeekend: '2026-09-19',
    offsets: [0, 1, 2, 6, 7, 8],
    url: 'https://www.jttsingapore.com/page/jttl_information.html',
    reference: '2025 Season Two',
  });

  assert.equal(weekends.length, 6);
  assert.deepEqual(
    weekends.map((w) => [w.start, w.end]),
    [
      ['2026-09-19', '2026-09-20'],
      ['2026-09-26', '2026-09-27'],
      ['2026-10-03', '2026-10-04'],
      ['2026-10-31', '2026-11-01'],
      ['2026-11-07', '2026-11-08'],
      ['2026-11-14', '2026-11-15'],
    ],
  );
  // Every projected weekend must be flagged, or it will be read as confirmed.
  assert.ok(weekends.every((w) => w.provisional === true));
  assert.ok(weekends.every((w) => w.note.includes('2025 Season Two')));
  assert.equal(weekends[0].id, 'jttl-provisional-2026-s2-w1');
  // Season 2 is documented as running Sep–Nov; the projection must stay in it.
  assert.ok(weekends.every((w) => w.start >= '2026-09-01' && w.end <= '2026-11-30'));
});

test('provisionalWeekends refuses a start date that is not a Saturday', () => {
  assert.throws(
    () =>
      provisionalWeekends({
        season: { year: 2026, half: 2 },
        firstWeekend: '2026-09-20', // Sunday
        offsets: [0],
        url: 'https://x',
      }),
    /not a Saturday/,
  );
});
