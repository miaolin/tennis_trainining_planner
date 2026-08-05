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

function boot(seed) {
  return new JSDOM(SRC, {
    runScripts: 'dangerously',
    url: 'https://example.test/',
    pretendToBeVisual: true,
    beforeParse(window) {
      if (seed) for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v);
    },
  });
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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('failed: ' + failures.join(' | ')); process.exit(1); }
