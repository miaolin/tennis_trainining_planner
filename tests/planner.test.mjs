// jsdom harness for vercel-deploy/index.html
//
//   cd tests && npm install && npm test
//
// The page is a single self-contained file, so the tests boot the real HTML
// rather than importing anything. Seeds must be written in `beforeParse`,
// before the inline script runs, or the app never sees them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(HERE, '..', 'vercel-deploy', 'index.html');
const SRC = fs.readFileSync(HTML, 'utf8');

const KEY = 'tennis-season-v2';
const LEGACY = 'tennis-camp-plan-v1';

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else {
    fail++; failures.push(name);
    console.log('  FAIL ' + name + (extra !== undefined ? '  -> ' + extra : ''));
  }
}
function group(name) { console.log('\n[' + name + ']'); }

// seed must land BEFORE the inline script runs, or restore() never sees it
function bootRaw(seed) {
  return new JSDOM(SRC, {
    runScripts: 'dangerously',
    url: 'https://example.test/',
    pretendToBeVisual: true,
    beforeParse(window) {
      if (seed) for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v);
    },
  });
}
// Calendar is the landing view, but most of these tests read the training
// header, so switch to it on boot. Use bootRaw() to assert the real default.
function boot(seed) {
  const dom = bootRaw(seed);
  click(dom, dom.window.document.getElementById('nav-training'));
  return dom;
}
const click = (dom, el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const change = (dom, el, value) => {
  el.value = value;
  el.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
};
const input = (dom, el, value) => {
  el.value = value;
  el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
};
const $ = (d, s) => d.querySelector(s);
const $$ = (d, s) => [...d.querySelectorAll(s)];
const realDays = d => $$(d, '#grid .day:not(.blank)').length;
const saved = dom => JSON.parse(dom.window.localStorage.getItem(KEY));

/* ------------------------------------------------------------------ */
group('cold boot — default block with the suggested plan');
{
  const dom = boot();
  const d = dom.window.document;
  ok('one block exists', $$(d, '.btab:not(.btab-add)').length === 1);
  ok('14 day cells', realDays(d) === 14, realDays(d));
  ok('21 grid cells (Sat start pads to 3 weeks)', $$(d, '#grid .day').length === 21,
     $$(d, '#grid .day').length);
  ok('total 19.0h', $(d, '#tot').textContent === '19.0', $(d, '#tot').textContent);
  ok('11 on-court days', $(d, '#ondays').textContent === '11', $(d, '#ondays').textContent);
  ok('3 rest days', $(d, '#restdays').textContent === '3', $(d, '#restdays').textContent);
  ok('header range', $(d, '#range').textContent === '21 Nov – 4 Dec', $(d, '#range').textContent);
  ok('two week caps + block cap', $$(d, '.wcap').length === 3, $$(d, '.wcap').length);
  ok('week 1 = 10.0h', $$(d, '.wcap')[0].textContent.includes('10.0'), $$(d, '.wcap')[0].textContent);
  ok('week 2 = 9.0h', $$(d, '.wcap')[1].textContent.includes('9.0'), $$(d, '.wcap')[1].textContent);
  ok('load checks rendered', $$(d, '#notes .note').length > 0);
  ok('5 session chips', $$(d, '#chips .chip').length === 5);
  ok('state persisted under the v2 key', !!dom.window.localStorage.getItem(KEY));
}

/* ------------------------------------------------------------------ */
group('v1.0.0 migration');
{
  // v1 stored a single {start, plan} keyed by day offset.
  const v1 = JSON.stringify({
    start: '2026-03-07',
    plan: { 0: { am: 'p1', pm: null }, 1: { am: 'g2', pm: 'phys' }, 2: { am: 'rest', pm: null } },
  });
  const dom = boot({ [LEGACY]: v1 });
  const d = dom.window.document;
  ok('legacy plan becomes one block', $$(d, '.btab:not(.btab-add)').length === 1);
  ok('block named "Camp plan"', $(d, '#blockname').value === 'Camp plan', $(d, '#blockname').value);
  ok('legacy start date kept', $(d, '#start').value === '2026-03-07', $(d, '#start').value);
  ok('hours carried over (1 + 2 + 1 = 4.0)', $(d, '#tot').textContent === '4.0', $(d, '#tot').textContent);
  ok('rest day carried over', $$(d, '#grid .day.rest').length === 1);
  ok('migrated state written to the v2 key', !!dom.window.localStorage.getItem(KEY));
  ok('v1 key left intact for rollback',
     dom.window.localStorage.getItem(LEGACY) === v1);
}

/* ------------------------------------------------------------------ */
group('v2 state round-trip');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '.placed .x'));                       // remove one 1h private
  ok('removal drops the total to 18.0', $(d, '#tot').textContent === '18.0', $(d, '#tot').textContent);

  const dom2 = boot({ [KEY]: dom.window.localStorage.getItem(KEY) });
  ok('reboot restores 18.0', $(dom2.window.document, '#tot').textContent === '18.0',
     $(dom2.window.document, '#tot').textContent);
}

/* ------------------------------------------------------------------ */
group('corrupt or stale state falls back without wedging');
{
  const cases = [
    ['garbage', 'not json'],
    ['null', JSON.stringify(null)],
    ['no blocks array', JSON.stringify({ version: 2, blocks: 'nope' })],
    ['empty blocks', JSON.stringify({ version: 2, blocks: [] })],
    ['unknown session type', JSON.stringify({ version: 2, blocks: [{ id: 'b1', name: 'X', start: '2026-11-21', days: 14, plan: { 0: { am: 'lasers', pm: null } } }] })],
    ['absurd day count', JSON.stringify({ version: 2, blocks: [{ id: 'b1', name: 'X', start: '2026-11-21', days: 9999, plan: {} }] })],
    ['bad start date', JSON.stringify({ version: 2, blocks: [{ id: 'b1', name: 'X', start: 'tuesday', days: 7, plan: {} }] })],
  ];
  for (const [label, seed] of cases) {
    const d = boot({ [KEY]: seed }).window.document;
    const days = realDays(d);
    ok(`${label} -> renders a usable grid`, days >= 1 && days <= 60, days);
  }
  // the surviving block from 'unknown session type' must have dropped it, not kept it
  const d2 = boot({ [KEY]: cases[4][1] }).window.document;
  ok('unknown type dropped, block kept', $(d2, '#tot').textContent === '0.0', $(d2, '#tot').textContent);
  const d3 = boot({ [KEY]: cases[5][1] }).window.document;
  ok('day count clamped to 60', realDays(d3) === 60, realDays(d3));
}

/* ------------------------------------------------------------------ */
group('multiple blocks');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-add'));
  ok('two blocks', $$(d, '.btab:not(.btab-add)').length === 2);
  ok('new block is active', $$(d, '.btab.on').length === 1);
  ok('new block is empty', $(d, '#tot').textContent === '0.0', $(d, '#tot').textContent);
  ok('new block starts the day after the previous one ends',
     $(d, '#start').value === '2026-12-05', $(d, '#start').value);

  input(dom, $(d, '#blockname'), 'Spring camp');
  ok('rename updates the heading', $(d, '#title').textContent === 'Spring camp', $(d, '#title').textContent);
  ok('rename updates the tab', $(d, '.btab.on').textContent.includes('Spring camp'));

  const first = $$(d, '.btab:not(.btab-add)')[0];
  click(dom, first);
  ok('switching back restores the first block', $(d, '#tot').textContent === '19.0', $(d, '#tot').textContent);

  ok('both blocks persisted', saved(dom).blocks.length === 2, saved(dom).blocks.length);
  ok('reserved season keys are written', ['players','entries','trips','manualMatches']
     .every(k => Array.isArray(saved(dom)[k])));
  ok('anchorMatchId present but inert', saved(dom).blocks[0].anchorMatchId === null);
}

/* ------------------------------------------------------------------ */
group('delete a block');
{
  const dom = boot();
  const d = dom.window.document;
  dom.window.confirm = () => true;
  click(dom, $(d, '#btn-add'));
  click(dom, $(d, '#btn-delete'));
  ok('one block left after delete', $$(d, '.btab:not(.btab-add)').length === 1);
  ok('remaining block became active', $(d, '#tot').textContent === '19.0', $(d, '#tot').textContent);

  click(dom, $(d, '#btn-delete'));
  ok('deleting the last block leaves an empty state', $$(d, '.btab:not(.btab-add)').length === 0);
  ok('empty state shows guidance', $(d, '#notes').textContent.includes('No training blocks'));
  ok('empty state does not throw on the grid', $$(d, '#grid .day').length === 0);

  const dom3 = boot();
  const d3 = dom3.window.document;
  dom3.window.confirm = () => false;
  click(dom3, $(d3, '#btn-delete'));
  ok('cancelling the confirm keeps the block', $$(d3, '.btab:not(.btab-add)').length === 1);
}

/* ------------------------------------------------------------------ */
group('variable block length');
{
  const dom = boot();
  const d = dom.window.document;

  change(dom, $(d, '#days'), '7');
  ok('7 days renders 7 cells', realDays(d) === 7, realDays(d));
  ok('7-day block reports one week + block cap', $$(d, '.wcap').length === 2, $$(d, '.wcap').length);
  ok('7-day total is week 1 only (10.0)', $(d, '#tot').textContent === '10.0', $(d, '#tot').textContent);

  change(dom, $(d, '#days'), '14');
  ok('growing back restores the hidden days', $(d, '#tot').textContent === '19.0', $(d, '#tot').textContent);

  change(dom, $(d, '#days'), '10');
  ok('10 days -> 2 week caps (7 + 3)', $$(d, '.wcap').length === 3, $$(d, '.wcap').length);
  ok('10-day grid pads to whole weeks', $$(d, '#grid .day').length % 7 === 0,
     $$(d, '#grid .day').length);

  change(dom, $(d, '#days'), '0');
  ok('0 clamps to 1 day', realDays(d) === 1, realDays(d));
  change(dom, $(d, '#days'), '999');
  ok('999 clamps to 60 days', realDays(d) === 60, realDays(d));
  change(dom, $(d, '#days'), 'abc');
  ok('non-numeric falls back to 14', realDays(d) === 14, realDays(d));
}

/* ------------------------------------------------------------------ */
group('start date drives the calendar');
{
  const dom = boot();
  const d = dom.window.document;

  change(dom, $(d, '#start'), '2026-11-25');            // Wednesday
  ok('Wed start -> 3 leading blanks',
     $$(d, '#grid .day').slice(0, 4).filter(c => c.classList.contains('blank')).length === 3);
  ok('grid stays a whole number of weeks', $$(d, '#grid .day').length % 7 === 0);
  ok('range follows the start date', $(d, '#range').textContent === '25 Nov – 8 Dec',
     $(d, '#range').textContent);
  ok('tab label follows too', $(d, '.btab.on').textContent.includes('25 Nov'));

  change(dom, $(d, '#start'), '2026-11-22');            // Sunday
  ok('Sun start -> exactly 14 cells', $$(d, '#grid .day').length === 14,
     $$(d, '#grid .day').length);
}

/* ------------------------------------------------------------------ */
group('buttons and placement');
{
  const dom = boot();
  const d = dom.window.document;

  click(dom, $(d, '#btn-clear'));
  ok('clear empties the block', $(d, '#tot').textContent === '0.0', $(d, '#tot').textContent);
  ok('empty block warns', $(d, '#notes').textContent.includes('Empty block'));

  const g2 = $$(d, '.chip').find(c => c.dataset.type === 'g2');
  click(dom, g2);
  ok('chip arms', g2.classList.contains('armed'));
  click(dom, $(d, '#grid .day:not(.blank) .slot'));
  ok('tap places 2h', $(d, '#tot').textContent === '2.0', $(d, '#tot').textContent);

  const rest = $$(d, '.chip').find(c => c.dataset.type === 'rest');
  click(dom, rest);
  click(dom, $(d, '#grid .day:not(.blank) .slot'));
  ok('rest clears the day it lands on', $(d, '#tot').textContent === '0.0', $(d, '#tot').textContent);
  ok('rest day renders as rest', $$(d, '#grid .day.rest').length === 1);

  click(dom, $(d, '#btn-reset'));
  ok('suggested plan reloads to 19.0', $(d, '#tot').textContent === '19.0', $(d, '#tot').textContent);
}

/* ------------------------------------------------------------------ */
group('suggested plan respects a short block');
{
  const dom = boot();
  const d = dom.window.document;
  change(dom, $(d, '#days'), '5');
  click(dom, $(d, '#btn-reset'));
  ok('suggested only fills the first 5 days', realDays(d) === 5, realDays(d));
  // days 0-4 of SUGGESTED: 1 + 2 + 2 + 2 + 2
  ok('5-day suggested total is 9.0h', $(d, '#tot').textContent === '9.0', $(d, '#tot').textContent);
  ok('no sessions beyond the block end',
     Object.keys(saved(dom).blocks.find(b => b.id === saved(dom).activeBlockId).plan)
       .every(k => Number(k) < 5));
}

/* ------------------------------------------------------------------ */
group('load checks');
{
  const dom = boot();
  const d = dom.window.document;
  // The shipped suggested plan is not "Balanced" — it trips two warnings
  // (a 5-day run, and only 2 group sessions). Carried over unchanged from
  // v1.0.0; asserted here so a future change to SUGGESTED is deliberate.
  ok('suggested plan raises no red flags', $(d, '#notes .note.bad') === null,
     $(d, '#notes').textContent.slice(0, 100));
  ok('suggested plan warns about the 5-day run',
     $(d, '#notes').textContent.includes('Long run'));
  ok('suggested plan warns about thin peer time',
     $(d, '#notes').textContent.includes('Thin peer time'));

  // stack four sessions onto one day -> heavy day
  click(dom, $(d, '#btn-clear'));
  const g2 = $$(d, '.chip').find(c => c.dataset.type === 'g2');
  click(dom, g2);
  const slots = $$(d, '#grid .day:not(.blank)')[0].querySelectorAll('.slot');
  click(dom, slots[0]);
  click(dom, $$(d, '#grid .day:not(.blank)')[0].querySelectorAll('.slot')[1]);
  ok('4h on one day trips the heavy-day check', $(d, '#notes').textContent.includes('Heavy days'),
     $(d, '#notes').textContent.slice(0, 120));

  // no group sessions at all -> peer-time check
  const dom2 = boot();
  const d2 = dom2.window.document;
  click(dom2, $(d2, '#btn-clear'));
  const p1 = $$(d2, '.chip').find(c => c.dataset.type === 'p1');
  click(dom2, p1);
  click(dom2, $(d2, '#grid .day:not(.blank) .slot'));
  ok('a plan with no groups warns about peer time',
     d2.querySelector('#notes').textContent.includes('peer time'),
     d2.querySelector('#notes').textContent.slice(0, 120));
}

/* ------------------------------------------------------------------ */
group('timezone safety');
{
  // A block starting on the 1st, 31 days long, must hand the next block a
  // local date — toISOString() would shift it back a day east of UTC.
  const dom = boot();
  const d = dom.window.document;
  change(dom, $(d, '#start'), '2026-03-01');
  change(dom, $(d, '#days'), '31');
  click(dom, $(d, '#btn-add'));
  ok('next block starts 1 Apr, not 31 Mar', $(d, '#start').value === '2026-04-01',
     $(d, '#start').value);
}

/* ------------------------------------------------------------------ */
group('deploy hygiene');
{
  ok('no window.storage dependency', !SRC.includes('window.storage'));
  ok('no toISOString() call (it shifts dates east of UTC)', !/\.toISOString\s*\(/.test(SRC));
  ok('local iso() helper present', /function iso\(/.test(SRC));
  ok('has favicon', SRC.includes('rel="icon"'));
  ok('has meta description', SRC.includes('name="description"'));
  ok('legacy key is read but never written',
     SRC.includes("setItem(STORE_KEY") && !SRC.includes('setItem(LEGACY_KEY'));
}

/* ================================ part 2: tournaments ================== */

// Deadline logic is relative to today, so build dates relative to today too.
const offset = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const addKid = (dom, d, name, birthYear) => {
  input(dom, $(d, '#kid-name'), name);
  if (birthYear !== undefined) input(dom, $(d, '#kid-year'), String(birthYear));
  click(dom, $(d, '#kid-add'));
};
const addTourn = (dom, d, { name, start, end, venue, cat, deadline }) => {
  input(dom, $(d, '#t-name'), name);
  input(dom, $(d, '#t-start'), start);
  if (end) input(dom, $(d, '#t-end'), end);
  if (venue) input(dom, $(d, '#t-venue'), venue);
  if (cat) input(dom, $(d, '#t-cat'), cat);
  if (deadline) input(dom, $(d, '#t-deadline'), deadline);
  click(dom, $(d, '#t-add'));
};

group('three views');
{
  const dom = bootRaw();
  const d = dom.window.document;
  ok('calendar is the default view', $(d, '#view-calendar').classList.contains('on'));
  ok('calendar nav marked active', $(d, '#nav-calendar').classList.contains('on'));
  ok('training hidden by default', !$(d, '#view-training').classList.contains('on'));
  ok('tournaments hidden by default', !$(d, '#view-matches').classList.contains('on'));
  ok('tab order is calendar, tournaments, training',
     $$(d, '.navbtn').map(b => b.id).join(',') === 'nav-calendar,nav-matches,nav-training',
     $$(d, '.navbtn').map(b => b.id).join(','));

  click(dom, $(d, '#nav-matches'));
  ok('switches to tournaments', $(d, '#view-matches').classList.contains('on'));
  ok('training hidden', !$(d, '#view-training').classList.contains('on'));
  ok('header retitles', $(d, '#title').textContent === 'Tournaments', $(d, '#title').textContent);
  ok('stat labels swap', $(d, '#lab1').textContent === 'Upcoming', $(d, '#lab1').textContent);

  click(dom, $(d, '#nav-training'));
  ok('switches back', $(d, '#view-training').classList.contains('on'));
  ok('training header restored', $(d, '#lab1').textContent === 'Total hrs', $(d, '#lab1').textContent);
  ok('block total intact after view switching', $(d, '#tot').textContent === '19.0', $(d, '#tot').textContent);
}

group('kids');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#nav-matches'));
  ok('starts with no kids', $(d, '#kidrow').textContent.includes('No kids yet'));

  addKid(dom, d, 'Mia');
  addKid(dom, d, 'Leo');
  ok('two kids listed', $$(d, '.kid').length === 2, $$(d, '.kid').length);
  ok('kid count in header', $(d, '#ondays').textContent === '2', $(d, '#ondays').textContent);
  ok('kids get distinct colours',
     $$(d, '.kid').map(e => e.getAttribute('style'))[0] !== $$(d, '.kid').map(e => e.getAttribute('style'))[1]);
  ok('blank name is ignored', (addKid(dom, d, '   '), $$(d, '.kid').length === 2), $$(d, '.kid').length);
  ok('kids persist', saved(dom).players.length === 2);

  dom.window.confirm = () => true;
  click(dom, $(d, '.kid .kx'));
  ok('removing a kid works', $$(d, '.kid').length === 1, $$(d, '.kid').length);
}

group('adding tournaments');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#nav-matches'));
  ok('empty state shown', $(d, '#tournlist').textContent.includes('No tournaments yet'));
  ok('no feed note explains the missing file',
     $(d, '#feednote').textContent.includes('No data/matches.json'));

  addTourn(dom, d, { name: 'STA Junior Champs', start: '2026-11-21', end: '2026-11-23',
                     venue: 'Kallang', cat: '12U Girls, 14U Girls', deadline: '2026-11-01' });
  ok('one tournament row', $$(d, '.tourn').length === 1, $$(d, '.tourn').length);
  ok('date span collapses to one month', $(d, '.tourn .tdate').textContent.includes('21–23 Nov'),
     $(d, '.tourn .tdate').textContent);
  ok('venue and categories shown', $(d, '.tourn .tmeta').textContent.includes('Kallang') &&
     $(d, '.tourn .tmeta').textContent.includes('12U Girls'));
  ok('month heading rendered', $(d, '.monthhead').textContent === 'Nov 2026', $(d, '.monthhead')?.textContent);
  ok('nav shows the count', $(d, '#nav-ct').textContent === '1', $(d, '#nav-ct').textContent);
  ok('form cleared after add', $(d, '#t-name').value === '');
  ok('tournament persisted', saved(dom).manualMatches.length === 1);

  addTourn(dom, d, { name: 'No date', start: '' });
  ok('a tournament with no start date is rejected', $$(d, '.tourn').length === 1, $$(d, '.tourn').length);

  addTourn(dom, d, { name: 'Single day', start: '2026-12-05' });
  ok('single-day tournament shows one date',
     $$(d, '.tourn .tdate')[1].textContent.includes('5 Dec'), $$(d, '.tourn .tdate')[1].textContent);
  ok('sorted by date', $$(d, '.tourn .tnm').map(e => e.textContent).join('|').indexOf('STA Junior Champs') === 0);

  dom.window.confirm = () => true;
  click(dom, $(d, '.tdel'));
  ok('delete removes it', $$(d, '.tourn').length === 1, $$(d, '.tourn').length);
}

group('entry status per kid');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#nav-matches'));
  addKid(dom, d, 'Mia');
  addKid(dom, d, 'Leo');
  addTourn(dom, d, { name: 'Champs', start: offset(60) });

  ok('one join button per kid', $$(d, '.join').length === 2, $$(d, '.join').length);
  ok('no status initially', !$(d, '.join').className.includes('s-'));

  click(dom, $(d, '.join'));
  ok('first click -> planned', $(d, '.join').className.includes('s-planned'), $(d, '.join').className);
  click(dom, $(d, '.join'));
  ok('second -> entered', $(d, '.join').className.includes('s-entered'), $(d, '.join').className);
  ok('entered counts in the header', $(d, '#restdays').textContent === '1', $(d, '#restdays').textContent);
  click(dom, $(d, '.join'));
  ok('third -> confirmed', $(d, '.join').className.includes('s-confirmed'), $(d, '.join').className);
  click(dom, $(d, '.join'));
  ok('fourth -> skipped', $(d, '.join').className.includes('s-skipped'), $(d, '.join').className);
  click(dom, $(d, '.join'));
  ok('fifth clears it', !$(d, '.join').className.includes('s-'), $(d, '.join').className);

  click(dom, $(d, '.join'));
  ok('entry persisted', saved(dom).entries.length === 1, saved(dom).entries.length);
  const dom2 = boot({ [KEY]: dom.window.localStorage.getItem(KEY) });
  const d2 = dom2.window.document;
  click(dom2, $(d2, '#nav-matches'));
  ok('entry survives reload', $(d2, '.join').className.includes('s-planned'), $(d2, '.join').className);
}

group('season checks');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#nav-matches'));
  addKid(dom, d, 'Mia');

  // deadline inside the warning window, nobody committed
  addTourn(dom, d, { name: 'Closing soon', start: offset(40), deadline: offset(5) });
  ok('a closing deadline is flagged', $(d, '#mnotes').textContent.includes('Entry deadline closing'),
     $(d, '#mnotes').textContent.slice(0, 120));
  ok('the row is marked', $(d, '.tourn').classList.contains('soon'));

  // marking as skipping should silence it
  click(dom, $(d, '.join'));  // planned
  click(dom, $(d, '.join'));  // entered
  ok('entering it clears the deadline warning',
     !$(d, '#mnotes').textContent.includes('Entry deadline closing'),
     $(d, '#mnotes').textContent.slice(0, 120));

  // overlapping tournaments for the same kid
  addTourn(dom, d, { name: 'Clash A', start: offset(90), end: offset(93) });
  addTourn(dom, d, { name: 'Clash B', start: offset(92), end: offset(95) });
  const joins = $$(d, '.join');
  click(dom, joins[joins.length - 2]);
  click(dom, joins[joins.length - 1]);
  ok('overlapping tournaments are flagged', $(d, '#mnotes').textContent.includes('Overlapping tournaments'),
     $(d, '#mnotes').textContent.slice(0, 200));

  // travel window
  const dom2 = boot();
  const d2 = dom2.window.document;
  click(dom2, $(d2, '#nav-matches'));
  addKid(dom2, d2, 'Mia');
  addTourn(dom2, d2, { name: 'Early', start: offset(10) });
  addTourn(dom2, d2, { name: 'Late', start: offset(60) });
  ok('a long gap is reported as a travel window',
     $(d2, '#mnotes').textContent.includes('Travel window'), $(d2, '#mnotes').textContent.slice(0, 160));
  ok('the gap length is stated', /\b50 clear days\b/.test($(d2, '#mnotes').textContent),
     $(d2, '#mnotes').textContent.slice(0, 160));
}

group('training block linkage');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#nav-matches'));
  // default block is 21 Nov - 4 Dec
  addTourn(dom, d, { name: 'Inside the block', start: '2026-11-28' });
  ok('a tournament inside a block names it',
     $(d, '.tourn .tmeta').textContent.includes('During “Camp plan”'), $(d, '.tourn .tmeta').textContent);

  addTourn(dom, d, { name: 'Well outside', start: '2027-05-01' });
  const metas = $$(d, '.tourn .tmeta').map(e => e.textContent);
  ok('a tournament outside every block says nothing',
     !metas.some(m => m.includes('Well outside') && m.includes('During')));
}

group('corrupt part-2 state');
{
  const base = { version: 2, blocks: [{ id: 'b1', name: 'B', start: '2026-11-21', days: 14, plan: {} }] };
  const cases = [
    ['players not an array', { ...base, players: 'nope' }],
    ['player missing a name', { ...base, players: [{ id: 'p1' }] }],
    ['entry with unknown status', { ...base, players: [{ id: 'p1', name: 'Mia' }], entries: [{ matchId: 'm1', playerId: 'p1', status: 'vibes' }] }],
    ['entry for a deleted kid', { ...base, players: [], entries: [{ matchId: 'm1', playerId: 'ghost', status: 'entered' }] }],
    ['manual match with no date', { ...base, manualMatches: [{ id: 'm1', name: 'X' }] }],
    ['manual match not an object', { ...base, manualMatches: [42, null, 'x'] }],
  ];
  for (const [label, seed] of cases) {
    const dom = boot({ [KEY]: JSON.stringify(seed) });
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    ok(`${label} -> page still renders`, realDays(d) === 14 && $(d, '#tournlist') !== null);
  }
  const dd = boot({ [KEY]: JSON.stringify(cases[2][1]) }).window.document;
  ok('bad status dropped', !JSON.stringify(dd.defaultView.localStorage.getItem(KEY)).includes('vibes'));
  const de = boot({ [KEY]: JSON.stringify(cases[3][1]) });
  ok('orphaned entry dropped', saved(de).entries.length === 0, saved(de).entries.length);
  const df = boot({ [KEY]: JSON.stringify(cases[4][1]) });
  ok('dateless manual match dropped', saved(df).manualMatches.length === 0, saved(df).manualMatches.length);
}

group('STA link lookup');
{
  // Shape copied from the live api.singtennis.org.sg response.
  const STA_PAYLOAD = {
    status: 'Success', message: '', data: [
      { date: 'Aug 2026', tournamentResps: [
        { tournamentId: 351, slug: 'j60-singapore-itf-junior-championships-vi-2026',
          tournamentName: 'J60 Singapore ITF Junior Championships (VI) 2026',
          entryOpen: false, tournamentLevelName: 'Junior', tournamentTypeName: 'ITF',
          startDate: '23/08/2026', endDate: '29/08/2026', deadline: '04/08/2026' }] },
    ],
  };
  // Boot with fetch stubbed. data/matches.json must still resolve as a 404.
  const bootWithApi = (impl) => new JSDOM(SRC, {
    runScripts: 'dangerously', url: 'https://example.test/', pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = (url, opts) => {
        if (String(url).includes('singtennis.org.sg')) return impl(url, opts);
        return Promise.resolve({ ok: false, status: 404 });
      };
    },
  });
  const okApi = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(STA_PAYLOAD) });
  const settle = () => new Promise(r => setTimeout(r, 30));

  {
    const dom = bootWithApi(okApi);
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    input(dom, $(d, '#t-url'), 'https://www-new.singtennis.org.sg/tournaments/j60-singapore-itf-junior-championships-vi-2026?type=information');
    click(dom, $(d, '#t-lookup'));
    await settle();
    ok('name filled from the link', $(d, '#t-name').value === 'J60 Singapore ITF Junior Championships (VI) 2026',
       $(d, '#t-name').value);
    ok('start date converted dd/mm/yyyy -> iso', $(d, '#t-start').value === '2026-08-23', $(d, '#t-start').value);
    ok('end date converted', $(d, '#t-end').value === '2026-08-29', $(d, '#t-end').value);
    ok('entry deadline converted', $(d, '#t-deadline').value === '2026-08-04', $(d, '#t-deadline').value);
    ok('categories from type + level', $(d, '#t-cat').value === 'ITF · Junior', $(d, '#t-cat').value);
    ok('note says what it found', $(d, '#lookupnote').textContent.includes('Found'), $(d, '#lookupnote').textContent);
    ok('note admits venue is unavailable', $(d, '#lookupnote').textContent.includes('venue'));

    click(dom, $(d, '#t-add'));
    ok('the looked-up tournament is added', $$(d, '.tourn').length === 1, $$(d, '.tourn').length);
    ok('link rendered on the row', $(d, '.tourn .tmeta a.tlink') !== null);
    ok('link stored', (saved(dom).manualMatches[0].url || '').includes('singtennis.org.sg'),
       saved(dom).manualMatches[0].url);
    ok('link field cleared after add', $(d, '#t-url').value === '');
  }

  {
    const dom = bootWithApi(okApi);
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    input(dom, $(d, '#t-url'), 'https://www.jttsingapore.com/page/jttl_information.html');
    click(dom, $(d, '#t-lookup'));
    await settle();
    ok('a non-STA link is rejected with a reason',
       $(d, '#lookupnote').textContent.includes('not an STA tournament link'), $(d, '#lookupnote').textContent);
    ok('non-STA lookup fills nothing', $(d, '#t-name').value === '');
  }

  {
    const dom = bootWithApi(okApi);
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    input(dom, $(d, '#t-url'), 'https://www-new.singtennis.org.sg/tournaments/does-not-exist');
    click(dom, $(d, '#t-lookup'));
    await settle();
    ok('unknown slug reports no match', $(d, '#lookupnote').textContent.includes('No STA tournament matches'),
       $(d, '#lookupnote').textContent);
  }

  {
    const dom = bootWithApi(() => Promise.resolve({ ok: false, status: 503 }));
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    input(dom, $(d, '#t-url'), 'https://www-new.singtennis.org.sg/tournaments/whatever');
    click(dom, $(d, '#t-lookup'));
    await settle();
    ok('an API failure is reported, not swallowed',
       $(d, '#lookupnote').textContent.includes('Could not reach the STA API'), $(d, '#lookupnote').textContent);
  }

  {
    const dom = bootWithApi(() => Promise.reject(new Error('offline')));
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    input(dom, $(d, '#t-url'), 'https://www-new.singtennis.org.sg/tournaments/whatever');
    click(dom, $(d, '#t-lookup'));
    await settle();
    ok('a network error is reported', $(d, '#lookupnote').textContent.includes('Could not reach'),
       $(d, '#lookupnote').textContent);
  }

  {
    const dom = bootWithApi(okApi);
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    click(dom, $(d, '#t-lookup'));
    await settle();
    ok('empty link asks for one', $(d, '#lookupnote').textContent.includes('Paste a tournament link first'),
       $(d, '#lookupnote').textContent);
  }

  // a javascript: URL must never become a clickable anchor
  {
    const seed = JSON.stringify({
      version: 2,
      blocks: [{ id: 'b1', name: 'B', start: '2026-11-21', days: 14, plan: {} }],
      manualMatches: [{ id: 'm1', source: 'manual', name: 'Evil', start: '2026-11-25',
                        url: 'javascript:alert(1)' }],
    });
    const dom = boot({ [KEY]: seed });
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    ok('tournament with a javascript: url still renders', $$(d, '.tourn').length === 1);
    ok('javascript: url is not rendered as a link', $(d, '.tourn .tmeta a.tlink') === null);
    ok('javascript: url is stripped from storage', !JSON.stringify(saved(dom)).includes('javascript:'));
  }
}

group('bulk import from STA');
{
  const T = (id, name, level, type, start, end, deadline) => ({
    tournamentId: id, slug: 'slug-' + id, tournamentName: name, entryOpen: false,
    tournamentLevelName: level, tournamentTypeName: type,
    startDate: start, endDate: end, deadline,
  });
  const dmy = n => {
    const d = new Date(); d.setDate(d.getDate() + n);
    const p = x => String(x).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const PAYLOAD = {
    status: 'Success', data: [{ date: 'x', tournamentResps: [
      T(1, 'STA SPEX U10 Red Competition I 2026', 'Junior (U10)', 'STA', dmy(30), dmy(32), dmy(10)),
      T(2, 'ATF 14&U ActiveSG Cup Singapore (I) 2026', 'Junior', 'ATF', dmy(40), dmy(46), dmy(20)),
      T(3, 'ATF 16&U ActiveSG Cup Singapore (I) 2026', 'Junior', 'ATF', dmy(50), dmy(56), dmy(25)),
      T(4, 'J30 Singapore ITF Junior Championships (I) 2026', 'Junior', 'ITF', dmy(60), dmy(66), dmy(35)),
      T(5, 'STA Advanced Singles & Doubles I 2026', 'Advanced', 'STA', dmy(70), dmy(72), dmy(45)),
      T(6, 'M15 Singapore ITF World Tennis Tour 2026', 'Open', 'ITF', dmy(80), dmy(86), dmy(55)),
      T(7, 'STA SPEX U10 Orange Competition 2024', 'Junior (U10)', 'STA', dmy(-400), dmy(-398), dmy(-420)),
    ] }],
  };
  const bootImp = () => new JSDOM(SRC, {
    runScripts: 'dangerously', url: 'https://example.test/', pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = url => String(url).includes('singtennis.org.sg')
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PAYLOAD) })
        : Promise.resolve({ ok: false, status: 404 });
    },
  });
  const settle = () => new Promise(r => setTimeout(r, 40));
  const impKids = d => $$(d, '#agerow input[data-impkid]');
  const YEAR = new Date().getFullYear();

  {
    // no kids yet: the import falls back to every junior age group
    const dom = bootImp();
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    ok('no kids -> no kid checkboxes, just an explanation', impKids(d).length === 0 &&
       $(d, '#agerow').textContent.includes('every junior age group'), $(d, '#agerow').textContent);

    click(dom, $(d, '#imp-run'));
    await settle();
    ok('imports the four junior tournaments', $$(d, '.tourn').length === 4, $$(d, '.tourn').length);
    ok('adult events excluded', !$(d, '#tournlist').textContent.includes('Advanced Singles'));
    ok('finished U10 event excluded by "upcoming only"',
       !$(d, '#tournlist').textContent.includes('Orange Competition'));
    ok('note reports what happened', /4 added/.test($(d, '#impnote').textContent), $(d, '#impnote').textContent);
    ok('note reports the skipped past event', /already finished/.test($(d, '#impnote').textContent),
       $(d, '#impnote').textContent);
    ok('imported rows carry the STA badge', $$(d, '.tourn .src.sta').length === 4, $$(d, '.tourn .src.sta').length);
    ok('imported rows link back to STA', $$(d, '.tourn a.tlink').length === 4);
    ok('imported rows are deletable', $$(d, '.tourn .tdel').length === 4);
    ok('entry deadlines came through', $(d, '#tournlist').textContent.includes('Entry by'));

    // re-import must not duplicate
    click(dom, $(d, '#imp-run'));
    await settle();
    ok('re-import adds nothing', $$(d, '.tourn').length === 4, $$(d, '.tourn').length);
    ok('re-import says they are already there', /already there/.test($(d, '#impnote').textContent),
       $(d, '#impnote').textContent);

    const dom2 = boot({ [KEY]: dom.window.localStorage.getItem(KEY) });
    const d2 = dom2.window.document;
    click(dom2, $(d2, '#nav-matches'));
    ok('imports survive reload', $$(d2, '.tourn').length === 4, $$(d2, '.tourn').length);
    ok('STA source survives reload', $$(d2, '.tourn .src.sta').length === 4, $$(d2, '.tourn .src.sta').length);
  }

  {
    // a 9-year-old: U10 is her group, 14&U is one up, 16&U and ITF are not
    const dom = bootImp();
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Olivia', YEAR - 9);
    ok('kid checkbox replaces the age groups', impKids(d).length === 1);
    ok('the chip shows her age group', $(d, '#agerow').textContent.includes('U10'),
       $(d, '#agerow').textContent);

    click(dom, $(d, '#imp-run'));
    await settle();
    const names = $$(d, '.tourn .tnm').map(e => e.textContent);
    ok('U10 event imported for a 9-year-old', names.some(n => n.includes('U10 Red')), names);
    ok('14&U imported (one group up)', names.some(n => n.includes('14&U')), names);
    ok('16&U not imported', !names.some(n => n.includes('16&U')), names);
    ok('adult event not imported', !names.some(n => n.includes('Advanced')), names);
    ok('note names the child', $(d, '#impnote').textContent.includes('Olivia'),
       $(d, '#impnote').textContent);
  }

  {
    // two kids of different ages widen the import between them
    const dom = bootImp();
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Olivia', YEAR - 9);
    addKid(dom, d, 'Ian', YEAR - 13);
    ok('two kid checkboxes', impKids(d).length === 2);
    click(dom, $(d, '#imp-run'));
    await settle();
    const names = $$(d, '.tourn .tnm').map(e => e.textContent);
    ok('U10 imported for the younger', names.some(n => n.includes('U10 Red')), names);
    ok('16&U imported for the older', names.some(n => n.includes('16&U')), names);
    ok('note names both children', /Olivia and Ian/.test($(d, '#impnote').textContent),
       $(d, '#impnote').textContent);

    // untick the younger and the U10 event stops matching
    const olivia = impKids(d)[0];
    olivia.checked = false;
    olivia.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    click(dom, $(d, '#imp-run'));
    await settle();
    ok('unticking a child narrows the note to the other',
       $(d, '#impnote').textContent.includes('Ian') && !$(d, '#impnote').textContent.includes('Olivia and'),
       $(d, '#impnote').textContent);
  }

  {
    // include past events
    const dom = bootImp();
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    const up = $(d, '#imp-upcoming');
    up.checked = false;
    up.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    click(dom, $(d, '#imp-run'));
    await settle();
    ok('unticking "upcoming only" pulls the finished one too', $$(d, '.tourn').length === 5,
       $$(d, '.tourn').length);
    ok('the past row is dimmed', $$(d, '.tourn.past').length === 1, $$(d, '.tourn.past').length);
  }

  {
    // every child unticked
    const dom = bootImp();
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Olivia', YEAR - 9);
    for (const cb of impKids(d)) { cb.checked = false; cb.dispatchEvent(new dom.window.Event('change', { bubbles: true })); }
    click(dom, $(d, '#imp-run'));
    await settle();
    ok('no child ticked asks for one', $(d, '#impnote').textContent.includes('Tick at least one child'),
       $(d, '#impnote').textContent);
    ok('and imports nothing', $$(d, '.tourn').length === 0);
  }

  {
    // API down
    const dom = new JSDOM(SRC, {
      runScripts: 'dangerously', url: 'https://example.test/', pretendToBeVisual: true,
      beforeParse(window) { window.fetch = () => Promise.reject(new Error('offline')); },
    });
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    click(dom, $(d, '#imp-run'));
    await settle();
    ok('an unreachable API is reported', $(d, '#impnote').textContent.includes('Could not reach the STA API'),
       $(d, '#impnote').textContent);
    ok('nothing imported on failure', $$(d, '.tourn').length === 0);
  }
}

group('per-kid eligibility');
{
  const Y = new Date().getFullYear();
  const setup = () => {
    const dom = boot();
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Olivia', Y - 9);    // U10
    addKid(dom, d, 'Ian', Y - 13);      // 14&U
    return { dom, d };
  };
  const rowNamed = (d, text) => $$(d, '.tourn').find(r => r.textContent.includes(text));
  const kidsOn = row => [...row.querySelectorAll('.join')].map(b => b.textContent.replace(/·.*/, '').trim());

  const { dom, d } = setup();
  ok('chips show each age group', $(d, '#kidrow').textContent.includes('U10') &&
     $(d, '#kidrow').textContent.includes('14&U'), $(d, '#kidrow').textContent);
  ok('birth years persist', saved(dom).players.map(p => p.birthYear).join(',') === `${Y - 9},${Y - 13}`,
     saved(dom).players.map(p => p.birthYear).join(','));

  addTourn(dom, d, { name: 'STA SPEX U10 Red Competition', start: `${Y}-11-02`, cat: 'STA, Junior (U10)' });
  addTourn(dom, d, { name: 'ATF 14&U ActiveSG Cup', start: `${Y}-11-10`, cat: 'ATF, Junior' });
  addTourn(dom, d, { name: 'ATF 16&U ActiveSG Cup', start: `${Y}-11-18`, cat: 'ATF, Junior' });
  addTourn(dom, d, { name: 'Club Open Day', start: `${Y}-11-24` });

  ok('U10 event offers only the 9-year-old',
     kidsOn(rowNamed(d, 'U10 Red')).join(',') === 'Olivia', kidsOn(rowNamed(d, 'U10 Red')));
  ok('14&U offers both — her group up, his own',
     kidsOn(rowNamed(d, '14&U')).join(',') === 'Olivia,Ian', kidsOn(rowNamed(d, '14&U')));
  ok('16&U offers only the 13-year-old',
     kidsOn(rowNamed(d, '16&U')).join(',') === 'Ian', kidsOn(rowNamed(d, '16&U')));
  ok('an event with no age group offers everyone',
     kidsOn(rowNamed(d, 'Club Open Day')).join(',') === 'Olivia,Ian', kidsOn(rowNamed(d, 'Club Open Day')));

  // a recorded status must survive even when the rules would hide the kid
  const seed = JSON.parse(dom.window.localStorage.getItem(KEY));
  const u10 = seed.manualMatches.find(m => m.name.includes('U10'));
  const ian = seed.players.find(p => p.name === 'Ian');
  seed.entries.push({ matchId: u10.id, playerId: ian.id, status: 'entered' });
  const dom2 = boot({ [KEY]: JSON.stringify(seed) });
  const d2 = dom2.window.document;
  click(dom2, $(d2, '#nav-matches'));
  ok('a kid with a recorded status is never hidden',
     kidsOn(rowNamed(d2, 'U10 Red')).includes('Ian'), kidsOn(rowNamed(d2, 'U10 Red')));

  // kids without a birth year are shown everywhere
  const dom3 = boot();
  const d3 = dom3.window.document;
  click(dom3, $(d3, '#nav-matches'));
  addKid(dom3, d3, 'Unknown');
  addTourn(dom3, d3, { name: 'STA SPEX U10 Red', start: `${Y}-11-02`, cat: 'STA, Junior (U10)' });
  ok('a kid with no birth year still appears', $$(d3, '.tourn .join').length === 1,
     $$(d3, '.tourn .join').length);
  ok('chip says the age group is unset', $(d3, '#kidrow').textContent.includes('no age group'),
     $(d3, '#kidrow').textContent);

  // setting the year afterwards takes effect
  const yr = $(d3, '.kid .kyr');
  yr.value = String(Y - 13);
  yr.dispatchEvent(new dom3.window.Event('change', { bubbles: true }));
  ok('filling the year in later applies the rules', $$(d3, '.tourn .join').length === 0,
     $$(d3, '.tourn .join').length);
  ok('and the row says why', $(d3, '.tourn .nokid') !== null);
}

group('who filter');
{
  const Y = new Date().getFullYear();
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#nav-matches'));
  ok('no filter shown with one kid or none', $(d, '#whofilter').textContent === '');

  addKid(dom, d, 'Olivia', Y - 9);
  ok('still no filter with a single kid', $(d, '#whofilter').textContent === '');

  addKid(dom, d, 'Ian', Y - 13);
  ok('filter appears with two kids', $$(d, '#whofilter label[data-who]').length === 3,
     $$(d, '#whofilter label[data-who]').length);

  addTourn(dom, d, { name: 'STA SPEX U10 Red', start: `${Y}-11-02`, cat: 'STA, Junior (U10)' });
  addTourn(dom, d, { name: 'ATF 16&U Cup', start: `${Y}-11-18`, cat: 'ATF, Junior' });
  ok('everyone sees both', $$(d, '.tourn').length === 2, $$(d, '.tourn').length);

  const chips = $$(d, '#whofilter label[data-who]');
  click(dom, chips[1]);   // Olivia
  ok('filtering to the 9-year-old hides the 16&U event', $$(d, '.tourn').length === 1,
     $$(d, '.tourn').length);
  ok('and keeps her U10 event', $(d, '.tourn').textContent.includes('U10 Red'));

  click(dom, $$(d, '#whofilter label[data-who]')[2]);   // Ian
  ok('filtering to the 13-year-old hides the U10 event', $$(d, '.tourn').length === 1,
     $$(d, '.tourn').length);
  ok('and keeps his 16&U event', $(d, '.tourn').textContent.includes('16&U'));

  click(dom, $$(d, '#whofilter label[data-who]')[0]);   // Everyone
  ok('back to everyone shows both again', $$(d, '.tourn').length === 2, $$(d, '.tourn').length);
}

group('generated matches.json feed');
{
  const FEED = {
    generatedAt: '2026-08-07T00:00:00.000Z',
    sources: [{ id: 'jttl', fetchedAt: '2026-08-05T04:52:54.315Z', ok: true, count: 2 }],
    matches: [
      { id: 'jttl-p1', source: 'jttl', name: 'JTTL 2026 Season Two — weekend 1 of 6 (provisional)',
        start: '2026-09-19', end: '2026-09-20', venue: '', categories: ['JTTL'],
        entryDeadline: null, url: 'https://www.jttsingapore.com/x.html', provisional: true,
        note: 'Draw not yet published; weekend spacing taken from 2025 Season Two.' },
      { id: 'jttl-r1', source: 'jttl', name: 'Real fixture', start: '2026-10-10', end: '2026-10-10',
        venue: '', categories: [], entryDeadline: null, url: '', provisional: false },
    ],
  };
  const bootFeed = feed => new JSDOM(SRC, {
    runScripts: 'dangerously', url: 'https://example.test/', pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = url => String(url).includes('matches.json')
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(feed) })
        : Promise.resolve({ ok: false, status: 404 });
    },
  });
  const settle = () => new Promise(r => setTimeout(r, 40));

  const dom = bootFeed(FEED);
  const d = dom.window.document;
  await settle();
  click(dom, $(d, '#nav-matches'));
  ok('feed tournaments listed', $$(d, '.tourn').length === 2, $$(d, '.tourn').length);
  ok('feed note reports the count and date',
     /2 tournaments loaded/.test($(d, '#feednote').textContent), $(d, '#feednote').textContent);
  ok('JTTL badge shown', $$(d, '.src.jttl').length === 2, $$(d, '.src.jttl').length);
  ok('provisional badge only on the provisional one', $$(d, '.src.prov').length === 1,
     $$(d, '.src.prov').length);
  ok('the provisional note is shown, not just the badge',
     $(d, '.tourn .tnote').textContent.includes('Draw not yet published'),
     $(d, '.tourn .tnote') && $(d, '.tourn .tnote').textContent);
  ok('feed tournaments are not deletable', $$(d, '.tourn .tdel').length === 0,
     $$(d, '.tourn .tdel').length);
  ok('season check warns about provisional dates',
     $(d, '#mnotes').textContent.includes('Provisional dates'), $(d, '#mnotes').textContent.slice(0, 120));
  ok('feed matches are not written into local state',
     (saved(dom).manualMatches || []).length === 0);

  click(dom, $(d, '#nav-calendar'));
  while ($(d, '#cal-year').textContent !== '2026') click(dom, $(d, '#cal-prev'));
  ok('feed tournaments reach the calendar', $$(d, '.cell.ev').length === 3,
     $$(d, '.cell.ev').length);
}

group('year calendar');
{
  const HOLIDAYS = {
    verifiedOn: '2026-08-06',
    periods: [
      { name: 'March break', type: 'vacation', start: '2026-03-14', end: '2026-03-22' },
      { name: 'Year-end break', type: 'vacation', start: '2026-11-21', end: '2026-12-31' },
      { name: 'National Day (observed)', type: 'holiday', start: '2026-08-10', end: '2026-08-10' },
      { name: 'bad row', type: 'vacation', start: 'nope', end: '2026-01-01' },
      { name: 'backwards', type: 'vacation', start: '2026-05-05', end: '2026-05-01' },
    ],
  };
  const bootCal = (periods) => new JSDOM(SRC, {
    runScripts: 'dangerously', url: 'https://example.test/', pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = (url) => String(url).includes('sg-school-holidays')
        ? Promise.resolve({ ok: true, status: 200,
            json: () => Promise.resolve(periods === undefined ? HOLIDAYS : periods) })
        : Promise.resolve({ ok: false, status: 404 });
    },
  });
  const settle = () => new Promise(r => setTimeout(r, 40));

  {
    const dom = bootCal();
    const d = dom.window.document;
    await settle();
    click(dom, $(d, '#nav-calendar'));
    ok('calendar view shows', $(d, '#view-calendar').classList.contains('on'));
    ok('other views hidden', !$(d, '#view-training').classList.contains('on') &&
                             !$(d, '#view-matches').classList.contains('on'));
    ok('twelve months rendered', $$(d, '.mon').length === 12, $$(d, '.mon').length);
    ok('header retitles', $(d, '#title').textContent === 'Calendar', $(d, '#title').textContent);
    // 3 fixed entries + "Nobody yet"; kids add one each
    ok('legend rendered', $$(d, '.legend .lg').length === 4, $$(d, '.legend .lg').length);

    // 2026 is the default year here only if today is 2026; drive it explicitly
    while ($(d, '#cal-year').textContent !== '2026') click(dom, $(d, '#cal-prev'));
    ok('year navigation works', $(d, '#cal-year').textContent === '2026');

    // March break 14-22 Mar = 9 days, year-end 21 Nov - 31 Dec = 41 days
    ok('school holidays shaded', $$(d, '.cell.vac').length === 9 + 41,
       $$(d, '.cell.vac').length);
    ok('public holiday shaded separately', $$(d, '.cell.hol').length === 1,
       $$(d, '.cell.hol').length);
    ok('malformed holiday rows dropped', !$(d, '#holidaylist').textContent.includes('bad row'));
    ok('backwards date range dropped', !$(d, '#holidaylist').textContent.includes('backwards'));

    // default training block 21 Nov - 4 Dec = 14 days
    ok('training block underlined on the calendar', $$(d, '.cell.blk').length === 14,
       $$(d, '.cell.blk').length);

    ok('holiday list sorted longest first',
       $$(d, '.holrow')[0].textContent.includes('Year-end'), $$(d, '.holrow')[0].textContent);
    ok('holiday length shown', $$(d, '.holrow')[0].textContent.includes('41 days'),
       $$(d, '.holrow')[0].textContent);
    ok('source note shown', $(d, '#holnote').textContent.includes('MOE'), $(d, '#holnote').textContent);
    ok('header counts holiday days', $(d, '#ondays').textContent === '50', $(d, '#ondays').textContent);
    ok('header counts blocks in year', $(d, '#restdays').textContent === '1', $(d, '#restdays').textContent);
  }

  {
    // tournaments appear on the calendar, and light up once someone is entered
    const dom = bootCal();
    const d = dom.window.document;
    await settle();
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Mia');
    addTourn(dom, d, { name: 'Champs', start: '2026-04-10', end: '2026-04-12' });
    click(dom, $(d, '#nav-calendar'));
    while ($(d, '#cal-year').textContent !== '2026') click(dom, $(d, '#cal-prev'));
    ok('tournament days marked', $$(d, '.cell.ev').length === 3, $$(d, '.cell.ev').length);
    ok('not marked as entered yet', $$(d, '.cell.ev.ent').length === 0);
    ok('day carries a tooltip', $(d, '.cell.ev').getAttribute('title').includes('Champs'),
       $(d, '.cell.ev').getAttribute('title'));

    click(dom, $(d, '#nav-matches'));
    click(dom, $(d, '.join'));   // planned
    click(dom, $(d, '.join'));   // entered
    click(dom, $(d, '#nav-calendar'));
    while ($(d, '#cal-year').textContent !== '2026') click(dom, $(d, '#cal-prev'));
    ok('entered tournaments highlighted', $$(d, '.cell.ev.ent').length === 3,
       $$(d, '.cell.ev.ent').length);
    ok('the kid now has a dot on those days',
       $$(d, '.cell.ev .dots i:not(.none)').length === 3,
       $$(d, '.cell.ev .dots i:not(.none)').length);
    ok('tooltip names the kid and status',
       $(d, '.cell.ev').getAttribute('title').includes('Mia: Entered'),
       $(d, '.cell.ev').getAttribute('title'));

    // a tournament inside a school holiday is flagged in the holiday list
    click(dom, $(d, '#nav-matches'));
    addTourn(dom, d, { name: 'In the break', start: '2026-03-16' });
    click(dom, $(d, '#nav-calendar'));
    while ($(d, '#cal-year').textContent !== '2026') click(dom, $(d, '#cal-prev'));
    const march = $$(d, '.holrow').find(r => r.textContent.includes('March break'));
    ok('holiday row reports tournaments inside it', march.textContent.includes('1 tournament inside'),
       march.textContent);
    const yearEnd = $$(d, '.holrow').find(r => r.textContent.includes('Year-end'));
    ok('a clear holiday says so', yearEnd.textContent.includes('clear'), yearEnd.textContent);
  }

  {
    // per-kid dots: two kids, different tournaments
    const dom = bootCal();
    const d = dom.window.document;
    await settle();
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Mia');
    addKid(dom, d, 'Leo');
    addTourn(dom, d, { name: 'Both go', start: '2026-04-10' });
    addTourn(dom, d, { name: 'Only Mia', start: '2026-04-20' });
    addTourn(dom, d, { name: 'Nobody', start: '2026-04-25' });

    const rowJoins = n => $$(d, '.tourn')[n].querySelectorAll('.join');
    click(dom, rowJoins(0)[0]);           // Mia planned on "Both go"
    click(dom, rowJoins(0)[1]);           // Leo planned on "Both go"
    click(dom, rowJoins(1)[0]);           // Mia planned on "Only Mia"
    click(dom, rowJoins(2)[1]);           // Leo on "Nobody"...
    click(dom, rowJoins(2)[1]);
    click(dom, rowJoins(2)[1]);
    click(dom, rowJoins(2)[1]);           // ...cycled to skipped

    click(dom, $(d, '#nav-calendar'));
    while ($(d, '#cal-year').textContent !== '2026') click(dom, $(d, '#cal-prev'));
    const cells = $$(d, '.cell.ev');
    ok('three tournament days', cells.length === 3, cells.length);
    ok('the shared day shows two kid dots',
       cells[0].querySelectorAll('.dots i:not(.none)').length === 2,
       cells[0].querySelectorAll('.dots i').length);
    ok('the solo day shows one kid dot',
       cells[1].querySelectorAll('.dots i:not(.none)').length === 1,
       cells[1].querySelectorAll('.dots i').length);
    ok('a day nobody is going to shows the "nobody yet" dot',
       cells[2].querySelectorAll('.dots i.none').length === 1,
       cells[2].querySelectorAll('.dots i').length);
    ok('a skipped kid gets no dot',
       cells[2].querySelectorAll('.dots i:not(.none)').length === 0,
       cells[2].querySelectorAll('.dots i:not(.none)').length);
    ok('kid dots use each kid colour',
       cells[0].querySelectorAll('.dots i')[0].getAttribute('style') !==
       cells[0].querySelectorAll('.dots i')[1].getAttribute('style'));
    ok('legend lists both kids plus the fixed entries',
       $$(d, '.legend .lg').length === 6, $$(d, '.legend .lg').length);
    ok('legend names the kids', $(d, '.legend').textContent.includes('Mia') &&
       $(d, '.legend').textContent.includes('Leo'));

    // training block still visible alongside
    ok('training block days still marked', $$(d, '.cell.blk').length === 14,
       $$(d, '.cell.blk').length);
  }

  {
    // a year with no data must not break
    const dom = bootCal();
    const d = dom.window.document;
    await settle();
    click(dom, $(d, '#nav-calendar'));
    for (let i = 0; i < 12; i++) click(dom, $(d, '#cal-next'));
    ok('a far year still renders 12 months', $$(d, '.mon').length === 12);
    ok('and says there are no holidays on file',
       $(d, '#holidaylist').textContent.includes('No school holidays on file'),
       $(d, '#holidaylist').textContent.slice(0, 60));
  }

  {
    // holidays file missing entirely
    const dom = new JSDOM(SRC, {
      runScripts: 'dangerously', url: 'https://example.test/', pretendToBeVisual: true,
      beforeParse(window) { window.fetch = () => Promise.resolve({ ok: false, status: 404 }); },
    });
    const d = dom.window.document;
    await settle();
    click(dom, $(d, '#nav-calendar'));
    ok('calendar still renders with no holiday file', $$(d, '.mon').length === 12);
    ok('and says the file could not be read',
       $(d, '#holnote').textContent.includes('could not be read'), $(d, '#holnote').textContent);
  }

  {
    // malformed holiday payload
    const dom = bootCal({ periods: 'not an array' });
    const d = dom.window.document;
    await settle();
    click(dom, $(d, '#nav-calendar'));
    ok('a malformed holiday file does not break the calendar', $$(d, '.mon').length === 12);
  }
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('failed: ' + failures.join(' | ')); process.exit(1); }
