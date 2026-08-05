// Season shape: deriving the weekend pattern from played seasons, and using it
// to project the weekends of a season whose draw has not been published yet.
//
// JTTL runs two seasons a year over six weekends each, "scheduled away from
// holidays" — so the weekends are NOT six in a row, and the gaps differ between
// Season One and Season Two. Rather than guess, we read the gaps off the most
// recent comparable season and reuse them.

const DAY_MS = 86_400_000;

const utc = (iso) => new Date(`${iso}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (isoDate, n) => iso(new Date(utc(isoDate).getTime() + n * DAY_MS));

/** The Saturday of the weekend an ISO date falls in (Sun rolls back to Sat). */
export function weekendStart(isoDate) {
  const d = utc(isoDate);
  const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
  const back = dow === 6 ? 0 : dow + 1; // Sat -> 0, Sun -> 1, Mon -> 2 ...
  return addDays(isoDate, -back);
}

/** Distinct weekends (Saturday dates), ascending, from a list of fixture dates. */
export function weekendsOf(isoDates) {
  return [...new Set(isoDates.map(weekendStart))].sort();
}

/**
 * Week offsets of a season's weekends relative to its first, e.g. 2025 Season
 * Two ran Sep 20, Sep 27, Oct 4, Nov 1, Nov 8, Nov 15 -> [0, 1, 2, 6, 7, 8].
 */
export function weekendOffsets(isoDates) {
  const weekends = weekendsOf(isoDates);
  if (weekends.length === 0) return [];
  const first = utc(weekends[0]).getTime();
  return weekends.map((w) => Math.round((utc(w).getTime() - first) / (7 * DAY_MS)));
}

/** "2026 Season One" -> { year: 2026, half: 1 }; unparseable -> null. */
export function parseSeasonName(name) {
  const m = /(\d{4})\s+Season\s+(One|Two)/i.exec(name ?? '');
  if (!m) return null;
  return { year: Number(m[1]), half: /one/i.test(m[2]) ? 1 : 2 };
}

/** The season that follows the given one. */
export function nextSeason({ year, half }) {
  return half === 1 ? { year, half: 2 } : { year: year + 1, half: 1 };
}

export const seasonName = ({ year, half }) => `${year} Season ${half === 1 ? 'One' : 'Two'}`;

/**
 * Provisional weekend records for a season with no published draw.
 *
 * One record per weekend spanning Saturday to Sunday, because that is the unit
 * a family plans travel around — not the individual division fixture, which is
 * unknowable until the draw lands. Every record is `provisional: true` and must
 * never be rendered as a confirmed date.
 */
export function provisionalWeekends({ season, firstWeekend, offsets, url, reference }) {
  const sat = weekendStart(firstWeekend);
  if (sat !== firstWeekend) {
    throw new Error(`firstWeekend ${firstWeekend} is not a Saturday`);
  }
  const label = seasonName(season);
  const basis = reference
    ? `weekend spacing taken from ${reference}`
    : 'weekend spacing assumed weekly';

  return offsets.map((weeks, i) => {
    const start = addDays(sat, weeks * 7);
    return {
      id: `jttl-provisional-${season.year}-s${season.half}-w${i + 1}`,
      source: 'jttl',
      name: `JTTL ${label} — weekend ${i + 1} of ${offsets.length} (provisional)`,
      start,
      end: addDays(start, 1),
      venue: null,
      categories: [],
      entryDeadline: null,
      url,
      provisional: true,
      note: `Draw not yet published; ${basis}.`,
    };
  });
}
