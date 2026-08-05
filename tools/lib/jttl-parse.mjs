// Parsers for jttsingapore.com fixture-group pages.
//
// The site runs on LeagueRepublic. Only `/fg/{divisionId}.html` is rendered
// server-side; `/matchHub/...`, `/match/...` and `/standingsForDate/...` all
// answer 202 with an empty body because they are filled in by JavaScript. So
// the fixture-group page is the whole readable surface, and everything below
// parses it with plain string work — no DOM library, which keeps this path
// dependency-free and runnable anywhere.

const stripTags = (s) => s.replace(/<[^>]+>/g, ' ');

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");

const clean = (s) => decode(stripTags(s)).replace(/\s+/g, ' ').trim();

/** `MM/DD/YY` (the site renders US order) -> `YYYY-MM-DD`. */
export function toISODate(usDate) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(usDate.trim());
  if (!m) return null;
  const [, mm, dd, yy] = m;
  const iso = `20${yy}-${mm}-${dd}`;
  // Reject impossible dates rather than passing them downstream.
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(dd)) return null;
  return iso;
}

/** Season dropdown: `[{ id, name }]`, page order (oldest first). */
export function parseSeasons(html) {
  const select = /filterSeasonID"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  if (!select) return [];
  return [...select[1].matchAll(/<option value="(\d+)"([^>]*)>([\s\S]*?)<\/option>/g)].map(
    ([, id, attrs, label]) => ({
      id,
      name: clean(label),
      selected: /\bselected\b/.test(attrs),
    }),
  );
}

/** Every division key (`1_123456`) offered by the page's division dropdown. */
export function parseDivisionIds(html) {
  const select = /filterFixtureGroupKey"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  const scope = select ? select[1] : html;
  return [...new Set([...scope.matchAll(/value="(1_\d+)"/g)].map((m) => m[1]))];
}

/** The division this page is showing, from its `<title>`. */
export function parseDivisionName(html) {
  const t = /<title>([\s\S]*?)<\/title>/.exec(html);
  if (!t) return null;
  return clean(t[1]).replace(/^JTT\s*[-–]\s*/, '').trim() || null;
}

/**
 * Fixtures on a fixture-group page.
 *
 * Rather than locating the "Results" / "Fixtures" section by heading — the
 * headings change once a draw is published, and a page can carry both — this
 * walks every table row and keeps the ones that look like a fixture: a date
 * cell plus a link to a match. Standings rows carry neither.
 */
export function parseFixtures(html) {
  const fallbackDivision = parseDivisionName(html);
  const fixtures = [];

  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map(([, attrs, body]) => ({
      attrs,
      body,
      text: clean(body),
    }));
    if (cells.length < 5) continue;

    const dateCell = cells.find((c) => /\b\d{2}\/\d{2}\/\d{2}\b/.test(c.text));
    const matchId = /\/match\/(\d+)\.html/.exec(row)?.[1];
    if (!dateCell || !matchId) continue;

    const date = toISODate(/\b(\d{2}\/\d{2}\/\d{2})\b/.exec(dateCell.text)[1]);
    if (!date) continue;

    // The division sits in the first cell's tooltip; fall back to the page title
    // for the (rare) row rendered without one.
    const division =
      cells.map((c) => /<strong>([\s\S]*?)<\/strong>/.exec(c.attrs + c.body)?.[1]).find(Boolean);

    const teamCells = cells.filter((c) => /<a[^>]*class="bold"/.test(c.body));
    const [home, away] = teamCells.map((c) => c.text);

    fixtures.push({
      matchId,
      date,
      time: /\b(\d{1,2}:\d{2}\s*[AP]M)\b/i.exec(dateCell.text)?.[1] ?? null,
      division: division ? clean(division) : fallbackDivision,
      home: home ?? null,
      away: away ?? null,
    });
  }

  // One row per match id — a fixture can appear in more than one table on the page.
  const seen = new Set();
  return fixtures.filter((f) => !seen.has(f.matchId) && seen.add(f.matchId));
}

/** A fixture -> a `matches.json` record, per the Phase 2 contract. */
export function toMatchRecord(fixture, { baseUrl }) {
  const teams = fixture.home && fixture.away ? `${fixture.home} v ${fixture.away}` : null;
  const name = [fixture.division, teams].filter(Boolean).join(': ') || 'JTTL fixture';
  return {
    id: `jttl-${fixture.matchId}`,
    source: 'jttl',
    name,
    start: fixture.date,
    end: fixture.date,
    // No venue is recoverable: the per-match page that would carry it is
    // client-rendered and answers 202 with an empty body.
    venue: null,
    categories: fixture.division ? [fixture.division] : [],
    entryDeadline: null,
    url: `${baseUrl}/match/${fixture.matchId}.html`,
    provisional: false,
  };
}
