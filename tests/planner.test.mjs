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
import { webcrypto } from 'node:crypto';
import jsQRmod from 'jsqr';
const jsQR = jsQRmod.default || jsQRmod;

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

// seed must land BEFORE the inline script runs, or restore() never sees it.
// `extra` gets the same window, for tests that need to stand something else up
// before the page runs — a fake server, or the crypto jsdom does not ship.
function bootRaw(seed, extra, url) {
  return new JSDOM(SRC, {
    runScripts: 'dangerously',
    url: url || 'https://example.test/',
    pretendToBeVisual: true,
    beforeParse(window) {
      if (seed) for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v);
      if (extra) extra(window);
    },
  });
}
// Calendar is the landing view, but most of these tests read the training
// header, so switch to it on boot. Use bootRaw() to assert the real default.
function boot(seed, extra, url) {
  const dom = bootRaw(seed, extra, url);
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
// Every placement asks for a start time, so a tap on a slot opens the dialog
// and the test has to answer it. Pass time:null to leave the time blank,
// or omit `time` to accept whatever the slot offered.
function fill(dom, opts = {}) {
  const d = dom.window.document;
  ok_open(d);
  if ('time' in opts) d.getElementById('m-time').value = opts.time ?? '';
  if ('label' in opts) d.getElementById('m-label').value = opts.label;
  if ('hours' in opts) d.getElementById('m-dur').value = opts.hours;
  click(dom, d.getElementById(opts.cancel ? 'm-cancel' : 'm-ok'));
}
function ok_open(d) {
  if (d.getElementById('modal').hidden) throw new Error('the time dialog did not open');
}
// arm a chip, tap a slot, answer the dialog
function tap(dom, type, slotEl, opts) {
  const d = dom.window.document;
  click(dom, $$(d, '.chip').find(c => c.dataset.type === type));
  click(dom, slotEl);
  if (type !== 'rest') fill(dom, opts);
}
// click something that opens the dialog, then answer it
function fillAt(dom, el, opts) { click(dom, el); fill(dom, opts); }
const drop = (dom, el, payload) => {
  const ev = new dom.window.Event('drop', { bubbles: true, cancelable: true });
  ev.dataTransfer = { getData: () => payload };
  el.dispatchEvent(ev);
};
const firstSlot = d => $(d, '#grid .day:not(.blank) .slot');
const daySlots = (d, i = 0) => [...$$(d, '#grid .day:not(.blank)')[i].querySelectorAll('.slot')];
const saved = dom => JSON.parse(dom.window.localStorage.getItem(KEY));
// A slot holds a list of entries, so a saved slot is read by position.
const slot = (dom, day, sl, idx = 0) => (saved(dom).blocks[0].plan[day] || {})[sl][idx];
const slotOf = (block, day, sl, idx = 0) => block.plan[day][sl][idx];

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
  ok('the non-training chip is marked as one, like its cards',
     $$(d, '#chips .chip.block').map(c => c.dataset.type).join() === 'other',
     $$(d, '#chips .chip.block').map(c => c.dataset.type).join());
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
  click(dom, firstSlot(d));
  ok('tapping a slot opens the time dialog', !$(d, '#modal').hidden);
  ok('the dialog offers the slot default', $(d, '#m-time').value === '09:00', $(d, '#m-time').value);
  ok('nothing is placed until it is confirmed', $(d, '#tot').textContent === '0.0', $(d, '#tot').textContent);
  click(dom, $(d, '#m-cancel'));
  ok('cancel leaves the grid alone', $(d, '#tot').textContent === '0.0', $(d, '#tot').textContent);

  tap(dom, 'g2', firstSlot(d));
  ok('tap places 2h', $(d, '#tot').textContent === '2.0', $(d, '#tot').textContent);
  ok('the placed session shows its times',
     $(d, '#grid .placed .tm').textContent.includes('09:00–11:00'),
     $(d, '#grid .placed .tm').textContent);

  const rest = $$(d, '.chip').find(c => c.dataset.type === 'rest');
  click(dom, rest);
  click(dom, firstSlot(d));
  ok('rest never asks for a time', $(d, '#modal').hidden);
  ok('rest clears the day it lands on', $(d, '#tot').textContent === '0.0', $(d, '#tot').textContent);
  ok('rest day renders as rest', $$(d, '#grid .day.rest').length === 1);

  click(dom, $(d, '#btn-reset'));
  ok('suggested plan reloads to 19.0', $(d, '#tot').textContent === '19.0', $(d, '#tot').textContent);
}

/* ------------------------------------------------------------------ */
group('three slots a day');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));

  ok('every day offers am, pm and evening', daySlots(d).length === 3, daySlots(d).length);
  ok('the slots are labelled', daySlots(d).map(s => s.textContent).join('|') === 'AM|PM|Eve',
     daySlots(d).map(s => s.textContent).join('|'));

  tap(dom, 'p1', daySlots(d)[2]);
  ok('the evening slot takes a session', $(d, '#tot').textContent === '1.0', $(d, '#tot').textContent);
  ok('and defaults to 17:00', $(d, '#grid .placed .tm').textContent.includes('17:00–18:00'),
     $(d, '#grid .placed .tm').textContent);

  tap(dom, 'p1', daySlots(d)[0]);
  tap(dom, 'phys', daySlots(d)[1]);
  ok('three sessions on one day add up', $(d, '#tot').textContent === '3.0', $(d, '#tot').textContent);
  ok('all three are saved', Object.keys(saved(dom).blocks[0].plan[0]).filter(
       k => saved(dom).blocks[0].plan[0][k].length).sort().join(',') === 'am,eve,pm');
}

/* ------------------------------------------------------------------ */
group('more than one thing in a slot');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));

  tap(dom, 'p1', daySlots(d)[0], { time: '09:00' });
  tap(dom, 'phys', daySlots(d)[0], { time: '10:30' });
  ok('a slot takes a second session', daySlots(d)[0].querySelectorAll('.placed').length === 2,
     daySlots(d)[0].querySelectorAll('.placed').length);
  ok('the second does not replace the first', $(d, '#tot').textContent === '2.0',
     $(d, '#tot').textContent);
  ok('both are saved in the one slot', saved(dom).blocks[0].plan[0].am.length === 2,
     JSON.stringify(saved(dom).blocks[0].plan[0].am));
  ok('a filled slot still offers room for another',
     !!daySlots(d)[0].querySelector('.add.more'));

  // the stack reads in clock order however it was entered
  tap(dom, 'p1', daySlots(d)[1], { time: '16:00' });
  tap(dom, 'g2', daySlots(d)[1], { time: '13:00' });
  const pm = [...daySlots(d)[1].querySelectorAll('.placed .tm')].map(e => e.textContent);
  ok('the earlier session is drawn first', pm[0].includes('13:00') && pm[1].includes('16:00'),
     pm.join(' / '));

  // removing one leaves the rest of the stack alone
  click(dom, daySlots(d)[0].querySelectorAll('.placed .x')[0]);
  ok('removing one leaves the other', daySlots(d)[0].querySelectorAll('.placed').length === 1,
     daySlots(d)[0].querySelectorAll('.placed').length);
  ok('and it is the one that was not removed', $(d, '#grid .placed .nm').textContent === 'Physical',
     $(d, '#grid .placed .nm').textContent);

  // rest empties the slot it lands on, and only that slot
  tap(dom, 'rest', daySlots(d)[0]);
  ok('rest clears the stack it lands on', daySlots(d)[0].querySelectorAll('.placed').length === 1,
     daySlots(d)[0].querySelectorAll('.placed').length);
  ok('and is the only thing in that slot', slot(dom, 0, 'am').type === 'rest',
     JSON.stringify(saved(dom).blocks[0].plan[0].am));
  ok('the afternoon is left alone', $(d, '#tot').textContent === '3.0', $(d, '#tot').textContent);
  ok('so the day is not a rest day', $$(d, '#grid .day.rest').length === 0);

  // and anything dropped on a resting slot ends the rest
  tap(dom, 'p1', daySlots(d)[0], { time: '09:00' });
  ok('a session ends the rest', slot(dom, 0, 'am').type === 'p1',
     JSON.stringify(saved(dom).blocks[0].plan[0].am));
  ok('without stacking on top of it', saved(dom).blocks[0].plan[0].am.length === 1,
     saved(dom).blocks[0].plan[0].am.length);
}

/* ------------------------------------------------------------------ */
group('a stacked slot has a ceiling');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));

  ['p1', 'phys', 'p1', 'phys'].forEach((t, k) =>
    tap(dom, t, daySlots(d)[0], { time: `0${6 + k}:00` }));
  ok('four fit in one slot', daySlots(d)[0].querySelectorAll('.placed').length === 4,
     daySlots(d)[0].querySelectorAll('.placed').length);
  ok('and then the + is withdrawn', !daySlots(d)[0].querySelector('.add:not(.full)'));
  ok('but the slot is still named', daySlots(d)[0].querySelector('.add.full').textContent === 'AM',
     daySlots(d)[0].querySelector('.add.full').textContent);

  click(dom, $$(d, '.chip').find(c => c.dataset.type === 'p1'));
  click(dom, daySlots(d)[0]);
  ok('a fifth is refused rather than asked about', $(d, '#modal').hidden);
  ok('and nothing was added', saved(dom).blocks[0].plan[0].am.length === 4,
     saved(dom).blocks[0].plan[0].am.length);
}

/* ------------------------------------------------------------------ */
group('two things in one slot can still clash');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));

  tap(dom, 'p1', daySlots(d)[0], { time: '09:00' });
  tap(dom, 'phys', daySlots(d)[0], { time: '10:00' });
  ok('back to back inside one slot is fine', !$(d, '#notes').textContent.includes('Times overlap'));

  fillAt(dom, $$(d, '#grid .placed .tm')[1], { time: '09:30' });
  ok('an overlap inside one slot is caught', $(d, '#notes').textContent.includes('Times overlap'));

  // dragging the second of a stack moves that one, not the first
  drop(dom, daySlots(d, 1)[2],
       JSON.stringify({ entry: { type: 'phys', at: '09:30' }, from: { day: 0, slot: 'am', idx: 1 } }));
  ok('the dragged one left the stack', saved(dom).blocks[0].plan[0].am.length === 1,
     JSON.stringify(saved(dom).blocks[0].plan[0].am));
  ok('and it was the right one', slot(dom, 0, 'am').type === 'p1', slot(dom, 0, 'am').type);
  ok('it landed where it was dropped', slot(dom, 1, 'eve').type === 'phys',
     JSON.stringify(saved(dom).blocks[0].plan[1]));
  ok('and the clash is gone with it', !$(d, '#notes').textContent.includes('Times overlap'));
}

/* ------------------------------------------------------------------ */
group('a session sets its own length');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));

  // the dialog offers the chip's usual length, and it can be overridden
  click(dom, $$(d, '.chip').find(c => c.dataset.type === 'g2'));
  click(dom, daySlots(d)[0]);
  ok('the dialog offers the usual length', $(d, '#m-dur').value === '2', $(d, '#m-dur').value);
  fill(dom, { time: '09:00', hours: '1.5' });
  ok('a shorter group is kept', slot(dom, 0, 'am').hrs === 1.5,
     JSON.stringify(slot(dom, 0, 'am')));
  ok('and it costs what it runs', $(d, '#tot').textContent === '1.5', $(d, '#tot').textContent);
  ok('the grid shows the real window', $(d, '#grid .placed .tm').textContent.includes('09:00–10:30'),
     $(d, '#grid .placed .tm').textContent);

  // and the length can be changed again from the grid
  fillAt(dom, $(d, '#grid .placed .tm'), { hours: '2.5' });
  ok('a length changed in place sticks', $(d, '#tot').textContent === '2.5', $(d, '#tot').textContent);
  ok('and redraws the end time', $(d, '#grid .placed .tm').textContent.includes('09:00–11:30'),
     $(d, '#grid .placed .tm').textContent);

  // a nonsense length falls back to the chip's own
  tap(dom, 'phys', daySlots(d)[1], { time: '14:00', hours: '0' });
  ok('an impossible length falls back to the usual', slot(dom, 0, 'pm').hrs === 1,
     JSON.stringify(slot(dom, 0, 'pm')));

  // rest has no length to set
  tap(dom, 'rest', daySlots(d)[2]);
  ok('rest never asks', $(d, '#modal').hidden);
  ok('and carries no length', slot(dom, 0, 'eve').hrs === undefined,
     JSON.stringify(slot(dom, 0, 'eve')));
  ok('and shows no time to set', $$(d, '#grid .placed.off .tm')[0].textContent === 'nothing booked',
     $$(d, '#grid .placed.off .tm')[0].textContent);
}

/* ------------------------------------------------------------------ */
group('the retired 1.5h private chip still reads');
{
  // Up to v2.2 a 1.5h private was its own type, `p15`.
  const dom = boot({
    [KEY]: JSON.stringify({
      version: 2,
      blocks: [{ id: 'b1', name: 'Old', start: '2026-11-21', days: 7,
                 plan: { 0: { am: { type: 'p15', at: '08:00' }, pm: 'p15' } } }],
      activeBlockId: 'b1',
    }),
  });
  const d = dom.window.document;
  ok('it loads as a private of that length', $(d, '#tot').textContent === '3.0',
     $(d, '#tot').textContent);
  ok('and is drawn as one', $(d, '#grid .placed .nm').textContent === 'Private',
     $(d, '#grid .placed .nm').textContent);
  ok('keeping its 90 minutes', $(d, '#grid .placed .tm').textContent.includes('08:00–09:30'),
     $(d, '#grid .placed .tm').textContent);
  // the bare type key, with no time on it, reads the same way
  const back = dom.window.sanitiseState(JSON.parse(dom.window.localStorage.getItem(KEY)), true);
  ok('the bare type key reads too', slotOf(back.blocks[0], 0, 'pm').hrs === 1.5,
     JSON.stringify(slotOf(back.blocks[0], 0, 'pm')));
}

/* ------------------------------------------------------------------ */
group('exact times');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));

  tap(dom, 'p1', daySlots(d)[0], { time: '07:30', hours: '1.5' });
  ok('the given time is kept', slot(dom, 0, 'am').at === '07:30',
     JSON.stringify(slot(dom, 0, 'am')));
  ok('the end time follows the length',
     $(d, '#grid .placed .tm').textContent.includes('07:30–09:00'),
     $(d, '#grid .placed .tm').textContent);
  ok('the length is still shown', $(d, '#grid .placed .tm').textContent.includes('1.5h'),
     $(d, '#grid .placed .tm').textContent);

  // clicking the time on a placed session reopens the dialog to change it
  click(dom, $(d, '#grid .placed .tm'));
  ok('the time is editable in place', !$(d, '#modal').hidden);
  ok('the dialog opens on the current time', $(d, '#m-time').value === '07:30', $(d, '#m-time').value);
  fill(dom, { time: '16:00' });
  ok('the new time sticks', slot(dom, 0, 'am').at === '16:00', slot(dom, 0, 'am').at);
  ok('and is drawn', $(d, '#grid .placed .tm').textContent.includes('16:00–17:30'),
     $(d, '#grid .placed .tm').textContent);

  // a blank time is allowed — the slot still says morning
  fillAt(dom, $(d, '#grid .placed .tm'), { time: null });
  ok('a session may carry no time at all', slot(dom, 0, 'am').at === null,
     JSON.stringify(slot(dom, 0, 'am')));
  ok('and says so on the grid', $(d, '#grid .placed .tm').textContent.includes('set a time'),
     $(d, '#grid .placed .tm').textContent);

  // a rubbish time is dropped rather than stored
  fillAt(dom, $(d, '#grid .placed .tm'), { time: '99:99' });
  ok('an impossible time is refused', slot(dom, 0, 'am').at === null,
     JSON.stringify(slot(dom, 0, 'am')));

  // midnight roll-over
  fillAt(dom, $(d, '#grid .placed .tm'), { time: '23:00' });
  ok('a session past midnight still reads', $(d, '#grid .placed .tm').textContent.includes('23:00–00:30'),
     $(d, '#grid .placed .tm').textContent);
}

/* ------------------------------------------------------------------ */
group('blocking a slot with study');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));

  tap(dom, 'p1', daySlots(d)[0]);
  tap(dom, 'other', daySlots(d)[1], { label: 'Study', hours: '2', time: '14:00' });

  ok('the block is named by hand', $$(d, '#grid .placed .nm')[1].textContent === 'Study',
     $$(d, '#grid .placed .nm')[1].textContent);
  ok('it shows its own length', $$(d, '#grid .placed .tm')[1].textContent.includes('14:00–16:00'),
     $$(d, '#grid .placed .tm')[1].textContent);
  ok('it is drawn as a block, not a session', $$(d, '#grid .placed')[1].className.includes('block'));
  ok('it does NOT add to the training load', $(d, '#tot').textContent === '1.0', $(d, '#tot').textContent);
  ok('the day still counts as one on-court day', $(d, '#ondays').textContent === '1',
     $(d, '#ondays').textContent);

  const pm = slot(dom, 0, 'pm');
  ok('label and length are persisted', pm.label === 'Study' && pm.hrs === 2, JSON.stringify(pm));

  // a day of nothing but study is still a rest day for the load checks
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'other', daySlots(d)[1], { label: 'School', hours: '6', time: '08:00' });
  ok('a blocked-only day carries no hours', $(d, '#tot').textContent === '0.0', $(d, '#tot').textContent);
  ok('and reads as a rest day', $(d, '#restdays').textContent === '14', $(d, '#restdays').textContent);

  // quarter hours, and a nonsense length falling back to an hour
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'other', daySlots(d)[0], { label: 'Piano', hours: '0.75', time: '10:00' });
  ok('quarter hours are kept', $(d, '#grid .placed .tm').textContent.includes('10:00–10:45'),
     $(d, '#grid .placed .tm').textContent);
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'other', daySlots(d)[0], { label: '', hours: '999', time: '10:00' });
  ok('an absurd length falls back to an hour', slot(dom, 0, 'am').hrs === 1,
     JSON.stringify(slot(dom, 0, 'am')));
  ok('an unnamed block still gets a name', $(d, '#grid .placed .nm').textContent === 'Blocked',
     $(d, '#grid .placed .nm').textContent);
}

/* ------------------------------------------------------------------ */
group('clashing times');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'g2', daySlots(d)[0], { time: '09:00' });   // 09:00-11:00
  ok('no clash yet', !$(d, '#notes').textContent.includes('Times overlap'));
  tap(dom, 'other', daySlots(d)[1], { label: 'Study', hours: '2', time: '10:00' });
  ok('an overlapping block is called out', $(d, '#notes').textContent.includes('Times overlap'),
     $(d, '#notes').textContent.slice(0, 140));
  fillAt(dom, $$(d, '#grid .placed .tm')[1], { time: '11:00' });
  ok('moving it clear of the session settles the check',
     !$(d, '#notes').textContent.includes('Times overlap'), $(d, '#notes').textContent.slice(0, 140));
}

/* ------------------------------------------------------------------ */
group('moving a placed session keeps its time');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'p1', daySlots(d)[0], { time: '08:15' });

  const payload = JSON.stringify({ entry: { type: 'p1', at: '08:15' }, from: { day: 0, slot: 'am' } });
  drop(dom, daySlots(d, 1)[2], payload);
  ok('a move never asks for the time again', $(d, '#modal').hidden);
  ok('it left the old slot', saved(dom).blocks[0].plan[0].am.length === 0,
     JSON.stringify(saved(dom).blocks[0].plan[0]));
  ok('it landed in the new one with its time',
     slot(dom, 1, 'eve').at === '08:15', JSON.stringify(saved(dom).blocks[0].plan[1]));

  // a fresh session dragged from the palette still gets asked
  drop(dom, daySlots(d, 2)[0], JSON.stringify({ entry: { type: 'g2' } }));
  ok('a drag from the palette asks', !$(d, '#modal').hidden);
  fill(dom, { time: '10:00' });
  ok('and lands with the time it was given',
     slot(dom, 2, 'am').at === '10:00', JSON.stringify(saved(dom).blocks[0].plan[2]));
}

/* ------------------------------------------------------------------ */
group('v2.1 plans without times still load');
{
  // Up to v2.1 a slot held the type key on its own and there was no evening.
  const dom = boot({
    [KEY]: JSON.stringify({
      version: 2,
      blocks: [{ id: 'b1', name: 'Old', start: '2026-11-21', days: 7,
                 plan: { 0: { am: 'p1', pm: 'g2' }, 1: { am: 'rest', pm: null } } }],
      activeBlockId: 'b1',
    }),
  });
  const d = dom.window.document;
  ok('the hours survive', $(d, '#tot').textContent === '3.0', $(d, '#tot').textContent);
  ok('the sessions are still drawn', $$(d, '#grid .placed:not(.off)').length === 2,
     $$(d, '#grid .placed:not(.off)').length);
  ok('they simply have no time yet', $$(d, '#grid .placed .tm')[0].textContent.includes('set a time'),
     $$(d, '#grid .placed .tm')[0].textContent);
  ok('the rest day survives', $$(d, '#grid .day.rest').length === 1);
  ok('and an evening slot is now offered', daySlots(d).length === 3, daySlots(d).length);

  // v2.2 stored one entry object per slot rather than a list
  const dom22 = boot({
    [KEY]: JSON.stringify({
      version: 2,
      blocks: [{ id: 'b1', name: 'X', start: '2026-11-21', days: 7,
                 plan: { 0: { am: { type: 'p1', at: '08:00' }, pm: null } } }],
      activeBlockId: 'b1',
    }),
  });
  ok('a v2.2 slot holding a single session still loads',
     $$(dom22.window.document, '#grid .placed').length === 1);
  ok('and keeps the time it was given',
     $(dom22.window.document, '#grid .placed .tm').textContent.includes('08:00–09:00'),
     $(dom22.window.document, '#grid .placed .tm').textContent);

  // rest beside a session used to collapse the day; it now owns its slot alone
  const dom2 = boot({
    [KEY]: JSON.stringify({
      version: 2,
      blocks: [{ id: 'b1', name: 'X', start: '2026-11-21', days: 7,
                 plan: { 0: { am: 'rest', eve: { type: 'p1', at: '17:00' } } } }],
      activeBlockId: 'b1',
    }),
  });
  const d2 = dom2.window.document;
  ok('a rest morning no longer swallows the evening', $(d2, '#tot').textContent === '1.0',
     $(d2, '#tot').textContent);
  ok('and a day with something booked is not a rest day',
     $$(d2, '#grid .day.rest').length === 0, $$(d2, '#grid .day.rest').length);
  ok('the rest keeps its own slot', $$(d2, '#grid .placed.off').length === 1,
     $$(d2, '#grid .placed.off').length);

  // rest still cannot share a slot with a session
  const dom3 = boot({
    [KEY]: JSON.stringify({
      version: 2,
      blocks: [{ id: 'b1', name: 'X', start: '2026-11-21', days: 7,
                 plan: { 0: { am: ['rest', { type: 'p1', at: '09:00' }] } } }],
      activeBlockId: 'b1',
    }),
  });
  ok('rest alone in the slot it is in', $(dom3.window.document, '#tot').textContent === '0.0',
     $(dom3.window.document, '#tot').textContent);
}

/* ------------------------------------------------------------------ */
group('times reach the text and the backup');
{
  const dom = boot();
  const d = dom.window.document;
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'p1', daySlots(d)[0], { time: '09:00' });
  tap(dom, 'other', daySlots(d)[1], { label: 'Study', hours: '2', time: '14:00' });

  const text = dom.window.asText();
  ok('the text export names the slot and the time',
     text.includes('AM 09:00–10:00 Private 1h'), text.split('\n')[2]);
  ok('a blocked slot is in the text too',
     text.includes('PM 14:00–16:00 Study 2h'), text.split('\n')[2]);
  tap(dom, 'phys', daySlots(d)[2], { time: '17:30' });
  ok('the evening slot reaches the text as EVE',
     dom.window.asText().includes('EVE 17:30–18:30 Physical 1h'), dom.window.asText().split('\n')[2]);

  tap(dom, 'phys', daySlots(d)[0], { time: '10:15' });
  ok('a second session in the same slot reaches the text too',
     dom.window.asText().includes('AM 10:15–11:15 Physical 1h'), dom.window.asText().split('\n')[2]);

  // round-trip through the sanitiser the backup restore uses
  const back = dom.window.sanitiseState(JSON.parse(dom.window.localStorage.getItem(KEY)), true);
  ok('a restored plan keeps its times', slotOf(back.blocks[0], 0, 'am').at === '09:00',
     JSON.stringify(back.blocks[0].plan[0]));
  ok('a restored block keeps its label and length',
     slotOf(back.blocks[0], 0, 'pm').label === 'Study' && slotOf(back.blocks[0], 0, 'pm').hrs === 2,
     JSON.stringify(back.blocks[0].plan[0].pm));
}


/* ------------------------------------------------------------------ */
/* Sync. The page talks to /api/plan; these stand a fake one up in front of it
   that keeps the same contract — 404 for an unused code, 409 when the stored
   copy has moved past the base a device is writing against. */
const SYNC_KEY = 'tennis-sync-v1';
function syncServer() {
  const kept = new Map();
  const calls = [];
  const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
  const fetchImpl = async (url, opts = {}) => {
    const u = String(url);
    if (!u.startsWith('/api/plan')) return reply(404, {});      // the data files
    const method = opts.method || 'GET';
    const k = new URLSearchParams(u.split('?')[1] || '').get('k') || '';
    calls.push([method, k]);
    if (!/^[a-f0-9]{64}$/.test(k)) return reply(400, { error: 'Bad sync key.' });
    if (method === 'GET') {
      const doc = kept.get(k);
      return doc ? reply(200, doc) : reply(404, { error: 'Nothing stored for that code yet.' });
    }
    if (method === 'PUT') {
      const body = JSON.parse(opts.body);
      const have = kept.get(k);
      if (body.base !== null && body.base !== undefined &&
          have && have.updatedAt > Number(body.base)) return reply(409, have);
      kept.set(k, { updatedAt: body.updatedAt, state: body.state });
      return reply(200, { updatedAt: body.updatedAt });
    }
    return reply(405, { error: 'Use GET or PUT.' });
  };
  // only one code is ever in play in these tests
  const only = () => [...kept.values()][0] || null;
  return { kept, calls, fetchImpl, only };
}
// `answer` stubs window.confirm before the page runs — a scanned link asks
// during boot, which is too early for the test to stub it afterwards.
function bootSynced(server, seed, url, answer) {
  return boot(seed, window => {
    if (answer !== undefined) window.confirm = () => answer;
    window.fetch = server.fetchImpl;
    // jsdom ships getRandomValues but neither subtle nor TextEncoder, and
    // hashing the code needs both. Any real browser has them.
    Object.defineProperty(window.crypto, 'subtle', {
      value: webcrypto.subtle, configurable: true,
    });
    window.TextEncoder = TextEncoder;
  }, url);
}
const settle = (ms = 60) => new Promise(r => setTimeout(r, ms));
const codeOf = d => (/([2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4})/
  .exec($(d, '#syncnote').textContent) || [])[1] || null;
const fmt4 = c => c.replace(/(.{4})(?=.)/g, '$1-');

group('turning sync on');
{
  const server = syncServer();
  const dom = bootSynced(server);
  const d = dom.window.document;
  await settle();

  ok('sync starts off', $(d, '#syncstat').textContent.includes('Off'), $(d, '#syncstat').textContent);
  ok('and nothing has been sent', server.calls.length === 0, JSON.stringify(server.calls));

  click(dom, $(d, '#btn-sync-on'));
  await settle();
  const code = codeOf(d);
  ok('turning it on shows a code', !!code, $(d, '#syncnote').textContent);
  ok('the code is grouped into fours', /^\w{4}-\w{4}-\w{4}-\w{4}$/.test(code || ''), code);
  ok('the plan is now on the server', !!server.only(), JSON.stringify(server.calls));
  ok('the server got the hash, never the code',
     server.calls.every(([, k]) => /^[a-f0-9]{64}$/.test(k) && !k.includes(code.slice(0, 4))),
     JSON.stringify(server.calls));
  ok('and the buttons swap over',
     $(d, '#btn-sync-on').hidden && !$(d, '#btn-sync-now').hidden);
  ok('the code is kept for next time',
     JSON.parse(dom.window.localStorage.getItem(SYNC_KEY)).code === code.replace(/-/g, ''),
     dom.window.localStorage.getItem(SYNC_KEY));

  // an edit goes up on its own, after the page goes quiet
  const before = server.only().updatedAt;
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'g2', firstSlot(d), { time: '09:00' });
  await settle(1500);
  ok('an edit pushes itself', server.only().updatedAt > before,
     `${before} -> ${server.only().updatedAt}`);
  ok('and it is the edited plan that went up',
     server.only().state.blocks[0].plan[0].am[0].type === 'g2',
     JSON.stringify(server.only().state.blocks[0].plan[0]));

  click(dom, $(d, '#btn-sync-off'));
  ok('stopping puts it back to off', $(d, '#syncstat').textContent.includes('Off'));
  ok('and forgets the code', !dom.window.localStorage.getItem(SYNC_KEY));
}

group('a second device joins with the code');
{
  const server = syncServer();
  const first = bootSynced(server);
  const d1 = first.window.document;
  await settle();
  click(first, $(d1, '#btn-sync-on'));
  await settle();
  click(first, $(d1, '#btn-clear'));
  tap(first, 'g2', firstSlot(d1), { time: '09:00' });
  await settle(1500);
  const code = codeOf(d1);

  // a different browser, its own plan, no shared storage
  const second = bootSynced(server);
  const d2 = second.window.document;
  await settle();
  ok('the second device starts on its own plan', $(d2, '#tot').textContent === '19.0',
     $(d2, '#tot').textContent);

  click(second, $(d2, '#btn-sync-use'));
  ok('asking to use a code opens the box', !$(d2, '#syncjoin').hidden);
  input(second, $(d2, '#sync-code'), code);

  // joining throws this device's plan away, so it has to be agreed to
  second.window.confirm = () => false;
  click(second, $(d2, '#btn-sync-join'));
  await settle(60);
  ok('backing out of the confirm changes nothing', $(d2, '#tot').textContent === '19.0',
     $(d2, '#tot').textContent);
  ok('and leaves sync off', $(d2, '#syncstat').textContent.includes('Off'),
     $(d2, '#syncstat').textContent);

  second.window.confirm = () => true;
  click(second, $(d2, '#btn-sync-join'));
  await settle(120);

  ok('joining takes the plan that is up there', $(d2, '#tot').textContent === '2.0',
     $(d2, '#tot').textContent);
  ok('and the grid is redrawn from it', $(d2, '#grid .placed .nm').textContent === 'Group',
     $(d2, '#grid .placed .nm').textContent);
  ok('the second device is now synced too', !$(d2, '#btn-sync-now').hidden);

  // and it keeps the plan across a reload of that same browser
  const back = bootSynced(server, {
    [KEY]: second.window.localStorage.getItem(KEY),
    [SYNC_KEY]: second.window.localStorage.getItem(SYNC_KEY),
  });
  await settle(120);
  ok('a reload comes back synced', $(back.window.document, '#tot').textContent === '2.0',
     $(back.window.document, '#tot').textContent);
}

group('when the server cannot be reached');
{
  // no fake server at all: every call fails the way an offline page does
  const dom = boot(null, window => {
    window.fetch = () => Promise.reject(new Error('offline'));
    Object.defineProperty(window.crypto, 'subtle', { value: webcrypto.subtle, configurable: true });
    window.TextEncoder = TextEncoder;
  });
  const d = dom.window.document;
  await settle();
  click(dom, $(d, '#btn-sync-on'));
  await settle(120);

  ok('the trouble is reported', $(d, '#syncstat').textContent.includes('problem'),
     $(d, '#syncstat').textContent);
  ok('but the code is still on screen', !!codeOf(d), $(d, '#syncnote').textContent);
  ok('and it says the plan is not at risk', $(d, '#syncnote').textContent.includes('safe in this browser'),
     $(d, '#syncnote').textContent);
  ok('sync stays on so the next change retries', !$(d, '#btn-sync-now').hidden);

  // the plan still works, unsynced
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'p1', firstSlot(d), { time: '09:00' });
  ok('and the planner carries on regardless', $(d, '#tot').textContent === '1.0',
     $(d, '#tot').textContent);
}

group('the second device turned sync on instead of joining');
{
  // the mistake that is easy to make: both devices press "Turn on sync", so
  // each starts its own plan and they never meet
  const server = syncServer();
  const first = bootSynced(server);
  const d1 = first.window.document;
  await settle();
  click(first, $(d1, '#btn-sync-on'));
  await settle();
  click(first, $(d1, '#btn-clear'));
  tap(first, 'g2', firstSlot(d1), { time: '09:00' });
  await settle(1500);
  const code = codeOf(d1);

  const second = bootSynced(server);
  const d2 = second.window.document;
  await settle();
  click(second, $(d2, '#btn-sync-on'));
  await settle();
  ok('the second device gets a code of its own', codeOf(d2) !== code, codeOf(d2));
  ok('so there are now two plans up there', server.kept.size === 2, server.kept.size);

  // it must be able to join the other one without working out that it has to
  // stop syncing first
  ok('the join button is still offered', !$(d2, '#btn-sync-use').hidden);
  ok('and says what it now does', $(d2, '#btn-sync-use').textContent === 'Use a different code',
     $(d2, '#btn-sync-use').textContent);
  ok('the note names the button to press on the other device',
     $(d1, '#syncnote').textContent.includes('Use a code'), $(d1, '#syncnote').textContent);

  click(second, $(d2, '#btn-sync-use'));
  input(second, $(d2, '#sync-code'), code);
  second.window.confirm = () => true;
  click(second, $(d2, '#btn-sync-join'));
  await settle(120);
  ok('switching codes takes the first device plan', $(d2, '#tot').textContent === '2.0',
     $(d2, '#tot').textContent);
  ok('and it is now on the same code', codeOf(d2) === code, codeOf(d2));
}

group('a Home Screen app says why it starts empty');
{
  const server = syncServer();
  const dom = bootSynced(server, null, undefined, undefined);
  const d = dom.window.document;
  await settle();
  ok('an ordinary tab is told to scan', $(d, '#syncnote').textContent.includes('scan the code'),
     $(d, '#syncnote').textContent);

  Object.defineProperty(dom.window.navigator, 'standalone', { value: true, configurable: true });
  dom.window.renderSync();
  const note = $(d, '#syncnote').textContent;
  ok('a Home Screen copy explains its own storage', note.includes('its own storage'), note);
  ok('and says nothing was lost', note.includes('Nothing is lost'), note);
  ok('and points at the one thing that works there', note.includes('paste the link'), note);
  ok('without telling it to scan, which opens the browser instead',
     !note.includes('scan the code'), note);
}

group('pasting the link instead of the code');
{
  const server = syncServer();
  const first = bootSynced(server);
  const d1 = first.window.document;
  await settle();
  click(first, $(d1, '#btn-sync-on'));
  await settle();
  click(first, $(d1, '#btn-clear'));
  tap(first, 'g2', firstSlot(d1), { time: '09:00' });
  await settle(1500);
  const code = codeOf(d1).replace(/-/g, '');

  const second = bootSynced(server);
  const d2 = second.window.document;
  await settle();
  click(second, $(d2, '#btn-sync-use'));
  // what "Copy link" puts on the clipboard, pasted whole
  input(second, $(d2, '#sync-code'), 'https://example.test/#s=' + code);
  second.window.confirm = () => true;
  click(second, $(d2, '#btn-sync-join'));
  await settle(120);
  ok('a pasted link joins the plan', $(d2, '#tot').textContent === '2.0', $(d2, '#tot').textContent);
  ok('and lands on the code inside it', codeOf(d2) === fmt4(code), codeOf(d2));

  // the letters in a link must not be mistaken for a code
  const third = bootSynced(server);
  const d3 = third.window.document;
  await settle();
  click(third, $(d3, '#btn-sync-use'));
  input(third, $(d3, '#sync-code'), 'https://example.test/no-code-here');
  click(third, $(d3, '#btn-sync-join'));
  await settle();
  ok('a link with no code in it is refused',
     $(d3, '#syncnote').textContent.includes('does not look like a code'),
     $(d3, '#syncnote').textContent);
  ok('and sync stays off', $(d3, '#syncstat').textContent.includes('Off'));
}

group('a tab left open catches up');
{
  const server = syncServer();
  const first = bootSynced(server);
  const d1 = first.window.document;
  await settle();
  click(first, $(d1, '#btn-sync-on'));
  await settle();
  const code = codeOf(d1);

  const second = bootSynced(server);
  const d2 = second.window.document;
  await settle();
  click(second, $(d2, '#btn-sync-use'));
  input(second, $(d2, '#sync-code'), code);
  second.window.confirm = () => true;
  click(second, $(d2, '#btn-sync-join'));
  await settle(120);
  ok('both devices start level', $(d2, '#tot').textContent === $(d1, '#tot').textContent,
     `${$(d1, '#tot').textContent} / ${$(d2, '#tot').textContent}`);

  // the first device works on while the second sits open and untouched
  click(first, $(d1, '#btn-clear'));
  tap(first, 'p1', firstSlot(d1), { time: '09:00' });
  await settle(1500);
  ok('the open tab has not noticed yet', $(d2, '#tot').textContent !== '1.0',
     $(d2, '#tot').textContent);

  // coming back to it is when it checks
  second.window.dispatchEvent(new second.window.Event('focus'));
  await settle(150);
  ok('coming back to the tab pulls the change', $(d2, '#tot').textContent === '1.0',
     $(d2, '#tot').textContent);
  ok('and it is the first device work that arrived',
     $(d2, '#grid .placed .tm').textContent.includes('09:00–10:00'),
     $(d2, '#grid .placed .tm').textContent);

  // and it does not re-ask on every alt-tab
  const before = server.calls.length;
  second.window.dispatchEvent(new second.window.Event('focus'));
  second.window.dispatchEvent(new second.window.Event('focus'));
  await settle(80);
  ok('but not on every single focus', server.calls.length === before, server.calls.length - before);
}

/* ------------------------------------------------------------------ */
group('the code as something to scan');
{
  const server = syncServer();
  const dom = bootSynced(server);
  const d = dom.window.document;
  await settle();
  ok('no code shown before sync is on', $(d, '#syncqr').hidden);

  click(dom, $(d, '#btn-sync-on'));
  await settle();
  const code = codeOf(d).replace(/-/g, '');
  const svg = $(d, '#syncqr svg');
  ok('turning sync on draws a QR code', !!svg);
  ok('and the panel is shown', !$(d, '#syncqr').hidden);
  ok('on a white ground, whatever the page theme',
     /fill="#fff"/.test($(d, '#syncqr').innerHTML));

  // read the page's own QR back the way a phone camera would
  const box = svg.getAttribute('viewBox').split(' ').map(Number);
  const dim = box[2], scale = 4;
  const px = new Uint8ClampedArray(dim * scale * dim * scale * 4).fill(255);
  // the path is a run of M<x> <y>h<w>v1h-<w>z per horizontal run of dark modules
  const runs = [...$(d, '#syncqr svg path').getAttribute('d')
    .matchAll(/M(\d+) (\d+)h(\d+)/g)].map(m => m.slice(1).map(Number));
  for (const [x, y, w] of runs) {
    for (let c = x; c < x + w; c++) for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const i = ((y * scale + sy) * dim * scale + (c * scale + sx)) * 4;
      px[i] = px[i + 1] = px[i + 2] = 0;
    }
  }
  const read = jsQR(px, dim * scale, dim * scale);
  ok('a scanner can read it', !!read, 'no code found');
  ok('and it carries a link to this page', !!read && read.data.startsWith('https://example.test/'),
     read && read.data);
  ok('with the sync code in the fragment', !!read && read.data.endsWith('#s=' + code),
     read && read.data);
  ok('the code never leaves the fragment, which servers never see',
     !!read && read.data.indexOf(code) > read.data.indexOf('#'), read && read.data);
}

/* ------------------------------------------------------------------ */
group('following a scanned link');
{
  const server = syncServer();
  const first = bootSynced(server);
  const d1 = first.window.document;
  await settle();
  click(first, $(d1, '#btn-sync-on'));
  await settle();
  click(first, $(d1, '#btn-clear'));
  tap(first, 'g2', firstSlot(d1), { time: '09:00' });
  await settle(1500);
  const code = codeOf(d1).replace(/-/g, '');

  // the other device opens the scanned link
  const second = bootSynced(server, null, 'https://example.test/#s=' + code, true);
  const d2 = second.window.document;
  await settle(200);

  ok('opening the link joins that plan', $(d2, '#tot').textContent === '2.0',
     $(d2, '#tot').textContent);
  ok('and it lands on the same code', codeOf(d2) === fmt4(code), codeOf(d2));
  ok('the code is taken out of the address bar', !second.window.location.hash,
     second.window.location.hash);
  ok('so a reload does not re-ask', second.window.location.href === 'https://example.test/',
     second.window.location.href);

  // declining leaves the device where it was
  const third = bootSynced(server, null, 'https://example.test/#s=' + code, false);
  await settle(200);
  ok('declining keeps this device plan', $(third.window.document, '#tot').textContent === '19.0',
     $(third.window.document, '#tot').textContent);
  ok('and still clears the fragment', !third.window.location.hash);

  // a link with a broken code is refused, not acted on
  const fourth = bootSynced(server, null, 'https://example.test/#s=NOPE');
  await settle(120);
  ok('a broken link does not turn sync on',
     $(fourth.window.document, '#syncstat').textContent.includes('Off'),
     $(fourth.window.document, '#syncstat').textContent);
}

group('a code that is not one');
{
  const server = syncServer();
  const dom = bootSynced(server);
  const d = dom.window.document;
  await settle();
  click(dom, $(d, '#btn-sync-use'));
  input(dom, $(d, '#sync-code'), 'nope');
  click(dom, $(d, '#btn-sync-join'));
  await settle();
  ok('a short code is refused', $(d, '#syncnote').textContent.includes('does not look like a code'),
     $(d, '#syncnote').textContent);
  ok('and sync stays off', $(d, '#syncstat').textContent.includes('Off'),
     $(d, '#syncstat').textContent);
  ok('nothing was sent', server.calls.length === 0, JSON.stringify(server.calls));
}

group('the other device got there first');
{
  const server = syncServer();
  const dom = bootSynced(server);
  const d = dom.window.document;
  await settle();
  click(dom, $(d, '#btn-sync-on'));
  await settle();
  const k = server.calls[server.calls.length - 1][1];

  // the other device saves something newer while this one is holding a change
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'p1', firstSlot(d), { time: '09:00' });
  const theirs = JSON.parse(JSON.stringify(server.only().state));
  theirs.blocks[0].plan = { 0: { am: [{ type: 'g2', at: '11:00', hrs: 2 }], pm: [], eve: [] } };
  server.kept.set(k, { updatedAt: Date.now() + 60000, state: theirs });

  await settle(1500);
  ok('the push is refused rather than overwriting', !$(d, '#syncclash').hidden);
  ok('and says so plainly', $(d, '#syncnote').textContent.includes('newer'),
     $(d, '#syncnote').textContent);
  ok('this device still has its own work', $(d, '#tot').textContent === '1.0',
     $(d, '#tot').textContent);

  click(dom, $(d, '#btn-clash-theirs'));
  await settle();
  ok('taking their copy replaces the plan', $(d, '#tot').textContent === '2.0',
     $(d, '#tot').textContent);
  ok('and the warning clears', $(d, '#syncclash').hidden);
}

group('keeping this device instead');
{
  const server = syncServer();
  const dom = bootSynced(server);
  const d = dom.window.document;
  await settle();
  click(dom, $(d, '#btn-sync-on'));
  await settle();
  const k = server.calls[server.calls.length - 1][1];

  click(dom, $(d, '#btn-clear'));
  tap(dom, 'p1', firstSlot(d), { time: '09:00' });
  const theirs = JSON.parse(JSON.stringify(server.only().state));
  server.kept.set(k, { updatedAt: Date.now() + 60000, state: theirs });
  await settle(1500);
  ok('the clash is raised', !$(d, '#syncclash').hidden);

  click(dom, $(d, '#btn-clash-mine'));
  await settle(120);
  ok('keeping mine overwrites the server',
     server.only().state.blocks[0].plan[0].am[0].type === 'p1',
     JSON.stringify(server.only().state.blocks[0].plan[0]));
  ok('and the warning clears', $(d, '#syncclash').hidden);
}

group('booting behind the other device');
{
  const server = syncServer();
  const dom = bootSynced(server);
  const d = dom.window.document;
  await settle();
  click(dom, $(d, '#btn-sync-on'));
  await settle();
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'g2', firstSlot(d), { time: '09:00' });
  await settle(1500);

  // this browser comes back later, with its own stale copy in storage
  const stale = JSON.parse(dom.window.localStorage.getItem(KEY));
  stale.updatedAt = 1;
  stale.blocks[0].plan = {};
  const back = bootSynced(server, {
    [KEY]: JSON.stringify(stale),
    [SYNC_KEY]: dom.window.localStorage.getItem(SYNC_KEY),
  });
  await settle(120);
  ok('a stale device pulls on load', $(back.window.document, '#tot').textContent === '2.0',
     $(back.window.document, '#tot').textContent);

  // and one that is ahead pushes instead
  const ahead = JSON.parse(dom.window.localStorage.getItem(KEY));
  ahead.updatedAt = Date.now() + 120000;
  ahead.blocks[0].plan = { 0: { am: [{ type: 'phys', at: '08:00', hrs: 1 }], pm: [], eve: [] } };
  bootSynced(server, {
    [KEY]: JSON.stringify(ahead),
    [SYNC_KEY]: dom.window.localStorage.getItem(SYNC_KEY),
  });
  await settle(120);
  ok('a device that is ahead pushes on load',
     server.only().state.blocks[0].plan[0].am[0].type === 'phys',
     JSON.stringify(server.only().state.blocks[0].plan[0]));
}

group('sync is off until it is turned on');
{
  const server = syncServer();
  const dom = bootSynced(server);
  const d = dom.window.document;
  await settle();
  click(dom, $(d, '#btn-clear'));
  tap(dom, 'p1', firstSlot(d), { time: '09:00' });
  await settle(1500);
  ok('an edit with sync off goes nowhere', server.calls.length === 0, JSON.stringify(server.calls));
  ok('and the plan is still local', $(d, '#tot').textContent === '1.0', $(d, '#tot').textContent);
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
  tap(dom, 'g2', daySlots(d)[0]);
  tap(dom, 'g2', daySlots(d)[1]);
  ok('4h on one day trips the heavy-day check', $(d, '#notes').textContent.includes('Heavy days'),
     $(d, '#notes').textContent.slice(0, 120));

  // no group sessions at all -> peer-time check
  const dom2 = boot();
  const d2 = dom2.window.document;
  click(dom2, $(d2, '#btn-clear'));
  tap(dom2, 'p1', firstSlot(d2));
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
  // A full UTC timestamp from toISOString() is fine (backup `exportedAt`).
  // Slicing a calendar date out of it is the bug — that shifts a day earlier
  // east of UTC, which is why iso() exists.
  ok('no calendar date sliced out of toISOString()',
     !/\.toISOString\s*\(\s*\)\s*\.slice/.test(SRC));
  ok('local iso() helper present', /function iso\(/.test(SRC));
  // A class that sets `display` outranks the browser's own [hidden] rule, so
  // every such class needs its own [hidden] escape or the attribute does
  // nothing. jsdom applies no CSS, so only the source can be checked.
  ok('rows that set display still honour hidden', /\.syncrow\[hidden\]\{display:none\}/.test(SRC));
  ok('the sync code is hashed before it is sent', /crypto\.subtle\.digest\('SHA-256'/.test(SRC));
  ok('and the raw code never goes in the URL', !/[?&]c(ode)?=\$\{/.test(SRC));
  ok('backup filename uses the local date helper', /iso\(new Date\(\)\)/.test(SRC));
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
  // Shape copied from the live GetTournamentInfoBySlug response. Note this is
  // a tournament ABSENT from GetTournamentList — the case that used to fail.
  const BY_SLUG = {
    status: 'Success', message: '', data: {
      tournamentId: 297,
      slug: 'sta-spex-u10-red-competition-viii-2026',
      tournamentName: 'STA SPEX U10 Red Competition VIII 2026',
      tournamentLevelName: 'Junior (U10)', tournamentTypeName: 'STA', isU10: true,
      venue: 'Yio Chu Kang Tennis Centre',
      tournamentStartDate: '26/09/2026', tournamentEndDate: '04/10/2026',
      closingDeadline: '11/09/2026',
    },
  };
  const NOT_FOUND = { status: 'Failed', message: 'Unable to find this tournament.', data: null };
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
  const seen = { url: null, body: null };
  const okApi = (url, opts) => {
    seen.url = String(url);
    seen.body = opts && opts.body ? JSON.parse(opts.body) : null;
    const found = seen.body && seen.body.slug === BY_SLUG.data.slug;
    return Promise.resolve({ ok: true, status: 200,
      json: () => Promise.resolve(found ? BY_SLUG : NOT_FOUND) });
  };
  const settle = () => new Promise(r => setTimeout(r, 30));

  {
    const dom = bootWithApi(okApi);
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    input(dom, $(d, '#t-url'), 'https://www-new.singtennis.org.sg/tournaments/sta-spex-u10-red-competition-viii-2026?type=information');
    click(dom, $(d, '#t-lookup'));
    await settle();
    // This tournament is NOT in GetTournamentList; resolving it by slug is the
    // whole point of the change.
    ok('a tournament missing from the list still resolves',
       $(d, '#t-name').value === 'STA SPEX U10 Red Competition VIII 2026', $(d, '#t-name').value);
    ok('start date converted dd/mm/yyyy -> iso', $(d, '#t-start').value === '2026-09-26', $(d, '#t-start').value);
    ok('end date converted', $(d, '#t-end').value === '2026-10-04', $(d, '#t-end').value);
    ok('entry deadline converted', $(d, '#t-deadline').value === '2026-09-11', $(d, '#t-deadline').value);
    ok('venue filled in', $(d, '#t-venue').value === 'Yio Chu Kang Tennis Centre', $(d, '#t-venue').value);
    ok('categories from type + level', $(d, '#t-cat').value === 'STA · Junior (U10)', $(d, '#t-cat').value);
    ok('note names the venue', $(d, '#lookupnote').textContent.includes('Yio Chu Kang'),
       $(d, '#lookupnote').textContent);
    ok('it calls GetTournamentInfoBySlug, not the whole list',
       seen.url.includes('GetTournamentInfoBySlug'), seen.url);
    ok('and posts the slug parsed out of the URL',
       seen.body.slug === 'sta-spex-u10-red-competition-viii-2026', JSON.stringify(seen.body));

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

group('backup export / import');
{
  const Y = new Date().getFullYear();
  // Drive the real file input by giving it a file-like with .text().
  const restore = (dom, d, text, confirmIt = true) => {
    dom.window.confirm = () => confirmIt;
    const inp = $(d, '#file-import');
    Object.defineProperty(inp, 'files', {
      configurable: true,
      value: [{ name: 'backup.json', text: () => Promise.resolve(text) }],
    });
    inp.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    return new Promise(r => setTimeout(r, 30));
  };

  {
    const dom = boot();
    const d = dom.window.document;
    ok('data bar counts what is stored', /1 training block · 0 kids/.test($(d, '#dstat').textContent),
       $(d, '#dstat').textContent);
    ok('the note warns that storage is per-browser',
       $(d, '#datanote').textContent.includes('stored in this browser'));
    ok('and warns about Safari eviction', $(d, '#datanote').textContent.includes('Safari'));

    // build something worth backing up
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Olivia', Y - 9);
    addTourn(dom, d, { name: 'Champs', start: `${Y}-11-02` });
    click(dom, $(d, '.join'));
    ok('data bar updates', /1 kid · 1 tournament · 1 entry/.test($(d, '#dstat').textContent),
       $(d, '#dstat').textContent);

    // export: capture the payload without a real download. The anchor click is
    // stubbed too — jsdom tries to navigate to the blob: URL otherwise.
    let captured = null, filename = null;
    dom.window.URL.createObjectURL = blob => { captured = blob; return 'blob:x'; };
    dom.window.URL.revokeObjectURL = () => {};
    dom.window.HTMLAnchorElement.prototype.click = function () { filename = this.download; };
    click(dom, $(d, '#btn-export'));
    ok('export reports success', $(d, '#datanote').textContent.includes('Saved'),
       $(d, '#datanote').textContent);
    ok('a blob was produced', captured !== null);
    ok('filename is dated', /^tennis-season-\d{4}-\d{2}-\d{2}\.json$/.test(filename || ''), filename);
    ok('blob is json', captured && captured.type === 'application/json', captured && captured.type);

    const text = JSON.stringify(backupOf(dom));
    function backupOf(dm) {
      return { app: 'tennis-season-planner', version: 2, exportedAt: '2026-08-07T00:00:00.000Z',
               state: JSON.parse(dm.window.localStorage.getItem(KEY)) };
    }

    // restore into a fresh browser
    const dom2 = boot();
    const d2 = dom2.window.document;
    await restore(dom2, d2, text);
    click(dom2, $(d2, '#nav-matches'));
    ok('restore brings the kid back', $$(d2, '.kid').length === 1, $$(d2, '.kid').length);
    ok('restore brings the tournament back', $$(d2, '.tourn').length === 1, $$(d2, '.tourn').length);
    ok('restore brings the entry status back', $(d2, '.join').className.includes('s-planned'),
       $(d2, '.join').className);
    ok('restore reports what it did', $(d2, '#datanote').textContent.includes('Restored'),
       $(d2, '#datanote').textContent);
    ok('restore names the backup date', $(d2, '#datanote').textContent.includes('2026-08-07'),
       $(d2, '#datanote').textContent);
    ok('restored state is persisted', JSON.parse(dom2.window.localStorage.getItem(KEY)).players.length === 1);
  }

  {
    // declining the confirm must change nothing
    const dom = boot();
    const d = dom.window.document;
    const before = dom.window.localStorage.getItem(KEY);
    await restore(dom, d, JSON.stringify({ app: 'tennis-season-planner', state: {
      version: 2, blocks: [], players: [{ id: 'p', name: 'Ghost' }], entries: [], manualMatches: [], trips: [] } }), false);
    ok('cancelling the restore leaves data untouched',
       dom.window.localStorage.getItem(KEY) === before);
    ok('and says so', $(d, '#datanote').textContent.includes('cancelled'), $(d, '#datanote').textContent);
  }

  {
    // an empty planner round-trips rather than being rejected
    const dom = boot();
    const d = dom.window.document;
    await restore(dom, d, JSON.stringify({ app: 'tennis-season-planner', state: {
      version: 2, blocks: [], players: [], entries: [], manualMatches: [], trips: [] } }));
    ok('a backup with no blocks restores as empty', $$(d, '.btab:not(.btab-add)').length === 0,
       $$(d, '.btab:not(.btab-add)').length);
    ok('and does not fall back to the suggested plan', $(d, '#tot').textContent === '0',
       $(d, '#tot').textContent);
  }

  {
    // bad files are refused with a reason, and change nothing
    const cases = [
      ['not json', 'this is not json', 'not valid JSON'],
      ['json but not ours', JSON.stringify({ hello: 'world' }), 'does not look like'],
      ['null', JSON.stringify(null), 'does not contain a plan'],
      ['blocks not an array', JSON.stringify({ state: { blocks: 'nope' } }), 'does not look like'],
    ];
    for (const [label, text, expect] of cases) {
      const dom = boot();
      const d = dom.window.document;
      const before = dom.window.localStorage.getItem(KEY);
      await restore(dom, d, text);
      ok(`${label} -> refused with a reason`, $(d, '#datanote').textContent.includes(expect),
         $(d, '#datanote').textContent);
      ok(`${label} -> data untouched`, dom.window.localStorage.getItem(KEY) === before);
    }
  }

  {
    // a bare state object (no envelope) still restores
    const dom = boot();
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Ian', Y - 13);
    const bare = dom.window.localStorage.getItem(KEY);

    const dom2 = boot();
    const d2 = dom2.window.document;
    await restore(dom2, d2, bare);
    click(dom2, $(d2, '#nav-matches'));
    ok('a bare state object restores too', $$(d2, '.kid').length === 1, $$(d2, '.kid').length);
  }
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

group('tournament rewards');
{
  const Y = new Date().getFullYear();
  const PAST = Y - 1;                       // definitely finished, whenever this runs
  const rowNamed = (d, t) => $$(d, '.tourn').find(r => r.textContent.includes(t));
  const rewLine = (d, t) => {
    const el = rowNamed(d, t).querySelector('.trew');
    return el ? el.textContent.replace('Only here', '') : '';
  };
  const isException = (d, t) => rowNamed(d, t).querySelector('.trewbtn').classList.contains('set');
  const openRew = (dom, d, t) => click(dom, rowNamed(d, t).querySelector('.trewbtn'));
  // the standard scheme, up in its own box
  const kidRow = (d, kid) =>
    [...$$(d, '.rewkid')].find(r => r.textContent.trim().startsWith(kid));
  const kidLine = (d, kid) => {
    const el = kidRow(d, kid).querySelector('.rkline');
    return el ? el.textContent : '';
  };
  const openKidRew = (dom, d, kid) => click(dom, kidRow(d, kid).querySelector('button'));
  const saveRew = (dom, d, o = {}) => {
    for (const [id, v] of Object.entries({
      'r-win': o.win, 'r-p1': o.p1, 'r-p2': o.p2,
      'r-p3': o.p3, 'r-imp': o.imp, 'r-note': o.note,
    })) input(dom, $(d, '#' + id), v ?? '');
    click(dom, $(d, '#r-ok'));
  };
  const resRow = (d, t, kid) =>
    [...rowNamed(d, t).querySelectorAll('.res')].find(r => r.textContent.trim().startsWith(kid));
  const setRes = (dom, d, t, kid, field, v) =>
    change(dom, resRow(d, t, kid).querySelector(field === 'wins' ? '.rwin' : '.rpl'), v);
  const paid = (d, t, kid) => {
    const el = resRow(d, t, kid).querySelector('.rpay');
    return el ? el.textContent : null;
  };
  const why = (d, t, kid) => {
    const el = resRow(d, t, kid).querySelector('.rwhy');
    return el ? el.textContent : '';
  };
  // Two red ball events, the same scheme on each: $5 a win, 1st $50, 2nd $30,
  // and $5 for beating the previous count.
  const setup = () => {
    const dom = boot();
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Ian', Y - 9);
    addTourn(dom, d, { name: 'U10 Red Ball Series One', start: `${PAST}-03-01` });
    addTourn(dom, d, { name: 'U10 Red Ball Series Two', start: `${PAST}-06-01` });
    return { dom, d };
  };
  const enter = (dom, d, t) => {
    click(dom, rowNamed(d, t).querySelector('.join'));   // planned
    click(dom, rowNamed(d, t).querySelector('.join'));   // entered
  };

  {
    const { dom, d } = setup();
    ok('a tournament with no scheme of its own is not marked as an exception',
       !isException(d, 'Series One'));
    ok('and shows no rewards line', rewLine(d, 'Series One') === '');
    ok('and no result boxes', !rowNamed(d, 'Series One').querySelector('.results'));

    openRew(dom, d, 'Series One');
    ok('the dialog says it is for this tournament alone',
       $(d, '#r-title').textContent === 'Rewards, only here — U10 Red Ball Series One',
       $(d, '#r-title').textContent);
    saveRew(dom, d, { win: 5, p1: 50, p2: 30, imp: 5, note: 'Red ball, played in group' });

    ok('the rewards line reads the whole scheme',
       rewLine(d, 'Series One') ===
         '$5 a win · 1st $50 · 2nd $30 · $5 for beating last count · Red ball, played in group',
       rewLine(d, 'Series One'));
    ok('the row is now marked as an exception', isException(d, 'Series One'));
    ok('the scheme is saved under the match id',
       saved(dom).rewards[saved(dom).manualMatches.find(m => m.name.includes('One')).id].perWin === 5,
       JSON.stringify(saved(dom).rewards));
    ok('a scheme on one tournament does not leak onto the other',
       rewLine(d, 'Series Two') === '', rewLine(d, 'Series Two'));

    // result boxes only once a kid is actually in it
    ok('a paying tournament nobody entered has no result boxes',
       !rowNamed(d, 'Series One').querySelector('.results'));
    enter(dom, d, 'Series One');
    ok('entering the kid opens a result box', !!resRow(d, 'Series One', 'Ian'));
    ok('and it says there is no result yet',
       !!resRow(d, 'Series One', 'Ian').querySelector('.rtodo'));

    setRes(dom, d, 'Series One', 'Ian', 'wins', '3');
    setRes(dom, d, 'Series One', 'Ian', 'place', '4');
    ok('three wins at $5, and 4th pays nothing', paid(d, 'Series One', 'Ian') === '$15',
       paid(d, 'Series One', 'Ian'));
    ok('the sum is shown in full', why(d, 'Series One', 'Ian') === '3 wins $15',
       why(d, 'Series One', 'Ian'));
    ok('no bonus with nothing earlier to beat',
       !why(d, 'Series One', 'Ian').includes('beat'), why(d, 'Series One', 'Ian'));
    ok('the result rides on the entry',
       saved(dom).entries[0].wins === 3 && saved(dom).entries[0].place === 4,
       JSON.stringify(saved(dom).entries[0]));

    // the second event: more wins than last time earns the bonus
    openRew(dom, d, 'Series Two');
    saveRew(dom, d, { win: 5, p1: 50, p2: 30, imp: 5 });
    enter(dom, d, 'Series Two');
    setRes(dom, d, 'Series Two', 'Ian', 'wins', '4');
    setRes(dom, d, 'Series Two', 'Ian', 'place', '2');
    ok('four wins, 2nd place and one more win than last time pays $55',
       paid(d, 'Series Two', 'Ian') === '$55', paid(d, 'Series Two', 'Ian'));
    ok('and says which count was beaten',
       why(d, 'Series Two', 'Ian') === '4 wins $20 · 2nd $30 · beat 3 $5',
       why(d, 'Series Two', 'Ian'));

    setRes(dom, d, 'Series Two', 'Ian', 'wins', '3');
    ok('matching the last count is not beating it',
       paid(d, 'Series Two', 'Ian') === '$45', paid(d, 'Series Two', 'Ian'));
    setRes(dom, d, 'Series Two', 'Ian', 'place', '1');
    ok('first place pays the top prize', paid(d, 'Series Two', 'Ian') === '$65',
       paid(d, 'Series Two', 'Ian'));

    // zero is a result, not a blank
    setRes(dom, d, 'Series Two', 'Ian', 'wins', '0');
    setRes(dom, d, 'Series Two', 'Ian', 'place', '');
    ok('nought wins still counts as a result', paid(d, 'Series Two', 'Ian') === '$0',
       paid(d, 'Series Two', 'Ian'));
    ok('and a blank place is stored as absent, not as zero',
       !('place' in saved(dom).entries.find(e => e.wins === 0)),
       JSON.stringify(saved(dom).entries));

    // the season checks
    setRes(dom, d, 'Series Two', 'Ian', 'wins', '4');
    setRes(dom, d, 'Series Two', 'Ian', 'place', '2');
    ok('the season check totals what was earned',
       $(d, '#mnotes').textContent.includes('$70 across 2 results'), $(d, '#mnotes').textContent);
  }

  {
    // a finished paying tournament with nobody's result on it
    const { dom, d } = setup();
    openRew(dom, d, 'Series One');
    saveRew(dom, d, { win: 5 });
    enter(dom, d, 'Series One');
    ok('a finished tournament with no result is chased',
       $(d, '#mnotes').textContent.includes('Results not in') &&
       $(d, '#mnotes').textContent.includes('Ian at U10 Red Ball Series One'),
       $(d, '#mnotes').textContent);
    setRes(dom, d, 'Series One', 'Ian', 'wins', '2');
    ok('and stops once the result is in',
       !$(d, '#mnotes').textContent.includes('Results not in'), $(d, '#mnotes').textContent);
  }

  {
    // clearing, deleting, and what survives a reload
    const { dom, d } = setup();
    openRew(dom, d, 'Series One');
    saveRew(dom, d, { win: 5, p1: 50 });
    openRew(dom, d, 'Series One');
    ok('the dialog opens on what was saved',
       $(d, '#r-win').value === '5' && $(d, '#r-p1').value === '50' && $(d, '#r-p2').value === '',
       [$(d, '#r-win').value, $(d, '#r-p1').value, $(d, '#r-p2').value].join(','));
    click(dom, $(d, '#r-cancel'));
    ok('cancel changes nothing', rewLine(d, 'Series One') === '$5 a win · 1st $50',
       rewLine(d, 'Series One'));

    openRew(dom, d, 'Series One');
    click(dom, $(d, '#r-clear'));
    ok('clear drops the line', rewLine(d, 'Series One') === '');
    ok('and the row is no longer an exception', !isException(d, 'Series One'));

    openRew(dom, d, 'Series Two');
    saveRew(dom, d, { win: 5 });
    const two = saved(dom).manualMatches.find(m => m.name.includes('Two')).id;
    dom.window.confirm = () => true;
    click(dom, rowNamed(d, 'Series Two').querySelector('.tdel'));
    ok('deleting a tournament takes its scheme with it', !(two in saved(dom).rewards),
       JSON.stringify(saved(dom).rewards));
  }

  {
    // a scheme and a result survive a reload
    const { dom, d } = setup();
    openRew(dom, d, 'Series One');
    saveRew(dom, d, { win: 5, p2: 30, note: 'Group stage' });
    enter(dom, d, 'Series One');
    setRes(dom, d, 'Series One', 'Ian', 'wins', '6');
    const dom2 = boot({ [KEY]: dom.window.localStorage.getItem(KEY) });
    const d2 = dom2.window.document;
    click(dom2, $(d2, '#nav-matches'));
    ok('the scheme comes back', rewLine(d2, 'Series One') === '$5 a win · 2nd $30 · Group stage',
       rewLine(d2, 'Series One'));
    ok('and so does the result', paid(d2, 'Series One', 'Ian') === '$30',
       paid(d2, 'Series One', 'Ian'));
  }

  {
    // rubbish in the stored state must not reach the page
    const { dom } = setup();
    const seed = saved(dom);
    const one = seed.manualMatches.find(m => m.name.includes('One')).id;
    seed.rewards = { [one]: { perWin: -5, places: ['x', 1e9, 30], improve: 'lots', note: 42 } };
    seed.entries = [{ matchId: one, playerId: seed.players[0].id, status: 'entered',
                      wins: 900, place: 0 }];
    const dom2 = boot({ [KEY]: JSON.stringify(seed) });
    const d2 = dom2.window.document;
    click(dom2, $(d2, '#nav-matches'));
    ok('impossible money is dropped', rewLine(d2, 'Series One') === '3rd $30',
       rewLine(d2, 'Series One'));
    ok('an out-of-range result is dropped',
       !!resRow(d2, 'Series One', 'Ian').querySelector('.rtodo'),
       resRow(d2, 'Series One', 'Ian').textContent);

    // and a note is text, never markup
    const dom3 = boot({ [KEY]: JSON.stringify({ ...seed,
      rewards: { [one]: { perWin: 5, note: '<img src=x onerror=alert(1)>' } } }) });
    const d3 = dom3.window.document;
    click(dom3, $(d3, '#nav-matches'));
    ok('a note is escaped, not rendered',
       !rowNamed(d3, 'Series One').querySelector('img') &&
       rewLine(d3, 'Series One').includes('<img'), rewLine(d3, 'Series One'));
  }
}

group('rewards belong to the child');
{
  const Y = new Date().getFullYear();
  const PAST = Y - 1;
  const rowNamed = (d, t) => $$(d, '.tourn').find(r => r.textContent.includes(t));
  const rewLine = (d, t) => {
    const el = rowNamed(d, t).querySelector('.trew');
    return el ? el.textContent.replace('Only here', '') : '';
  };
  const isException = (d, t) => rowNamed(d, t).querySelector('.trewbtn').classList.contains('set');
  const kidRow = (d, kid) => $$(d, '.rewkid').find(r => r.textContent.trim().startsWith(kid));
  const kidLine = (d, kid) => {
    const el = kidRow(d, kid).querySelector('.rkline');
    return el ? el.textContent : '';
  };
  const fillRew = (dom, d, o) => {
    for (const [id, v] of Object.entries({
      'r-win': o.win, 'r-p1': o.p1, 'r-p2': o.p2,
      'r-p3': o.p3, 'r-imp': o.imp, 'r-note': o.note,
    })) input(dom, $(d, '#' + id), v ?? '');
    click(dom, $(d, '#r-ok'));
  };
  const setKidRew = (dom, d, kid, o) => {
    click(dom, kidRow(d, kid).querySelector('button'));
    fillRew(dom, d, o);
  };
  const setMatchRew = (dom, d, t, o) => {
    click(dom, rowNamed(d, t).querySelector('.trewbtn'));
    fillRew(dom, d, o);
  };
  const resRow = (d, t, kid) => {
    const box = rowNamed(d, t).querySelector('.results');
    return box ? [...box.querySelectorAll('.res')].find(r => r.textContent.trim().startsWith(kid)) : null;
  };
  const setRes = (dom, d, t, kid, field, v) =>
    change(dom, resRow(d, t, kid).querySelector(field === 'wins' ? '.rwin' : '.rpl'), v);
  const paid = (d, t, kid) => {
    const r = resRow(d, t, kid);
    const el = r && r.querySelector('.rpay');
    return el ? el.textContent : null;
  };
  const enter = (dom, d, t, i) => {
    click(dom, [...rowNamed(d, t).querySelectorAll('.join')][i]);
    click(dom, [...rowNamed(d, t).querySelectorAll('.join')][i]);
  };
  const setup = () => {
    const dom = boot();
    const d = dom.window.document;
    click(dom, $(d, '#nav-matches'));
    addKid(dom, d, 'Ian', Y - 9);
    addKid(dom, d, 'Olivia', Y - 9);
    addTourn(dom, d, { name: 'U10 Red Ball Series One', start: `${PAST}-11-14` });
    addTourn(dom, d, { name: 'U10 Red Ball Series Two', start: `${Y}-03-07` });
    return { dom, d };
  };

  {
    const { dom, d } = setup();
    ok('every child gets a line in the rewards box', $$(d, '.rewkid').length === 2);
    ok('and starts with nothing set',
       kidRow(d, 'Ian').textContent.includes('nothing set'), kidRow(d, 'Ian').textContent);

    setKidRew(dom, d, 'Ian',
      { win: 5, p1: 50, p2: 30, imp: 5, note: 'Red ball, played in group' });
    ok('the standard is listed once, up in the box',
       kidLine(d, 'Ian') ===
         '$5 a win · 1st $50 · 2nd $30 · $5 for beating last count · Red ball, played in group',
       kidLine(d, 'Ian'));
    ok('and is stored on the child, not on any tournament',
       saved(dom).players[0].rewards.perWin === 5 &&
       Object.keys(saved(dom).rewards).length === 0,
       JSON.stringify(saved(dom).rewards));
    ok('no tournament repeats it',
       rewLine(d, 'Series One') === '' && rewLine(d, 'Series Two') === '');
    ok('and none is marked an exception',
       !isException(d, 'Series One') && !isException(d, 'Series Two'));
    ok('one child having a scheme does not give the other one',
       kidRow(d, 'Olivia').textContent.includes('nothing set'), kidRow(d, 'Olivia').textContent);

    // the standard is what pays
    enter(dom, d, 'Series One', 0);          // Ian
    enter(dom, d, 'Series One', 1);          // Olivia
    ok('the child with a standard gets result boxes', !!resRow(d, 'Series One', 'Ian'));
    ok('the child without one does not', !resRow(d, 'Series One', 'Olivia'));
    setRes(dom, d, 'Series One', 'Ian', 'wins', '3');
    ok('and the standard is what pays out', paid(d, 'Series One', 'Ian') === '$15',
       paid(d, 'Series One', 'Ian'));
  }

  {
    // one tournament paying differently
    const { dom, d } = setup();
    setKidRew(dom, d, 'Ian', { win: 5, imp: 5 });
    enter(dom, d, 'Series One', 0);
    setRes(dom, d, 'Series One', 'Ian', 'wins', '3');
    enter(dom, d, 'Series Two', 0);

    setMatchRew(dom, d, 'Series Two', { win: 10 });
    ok('an exception shows on its row only', rewLine(d, 'Series Two') === '$10 a win',
       rewLine(d, 'Series Two'));
    ok('and is badged as such', isException(d, 'Series Two'));
    ok('the other tournament is untouched', rewLine(d, 'Series One') === '');
    ok('the standard line is unchanged', kidLine(d, 'Ian') === '$5 a win · $5 for beating last count',
       kidLine(d, 'Ian'));
    setRes(dom, d, 'Series Two', 'Ian', 'wins', '4');
    ok('the exception is what pays, bonus and all',
       paid(d, 'Series Two', 'Ian') === '$40', paid(d, 'Series Two', 'Ian'));

    // and back to the standard
    click(dom, rowNamed(d, 'Series Two').querySelector('.trewbtn'));
    ok('the button offers the standard back',
       $(d, '#r-clear').textContent === 'Use standard', $(d, '#r-clear').textContent);
    ok('and the dialog says it is for this tournament alone',
       $(d, '#r-title').textContent.startsWith('Rewards, only here'), $(d, '#r-title').textContent);
    click(dom, $(d, '#r-clear'));
    ok('the exception goes', rewLine(d, 'Series Two') === '' && !isException(d, 'Series Two'));
    ok('and the standard pays again, bonus included',
       paid(d, 'Series Two', 'Ian') === '$25', paid(d, 'Series Two', 'Ian'));

    // an empty exception means this one pays nothing
    setMatchRew(dom, d, 'Series Two', {});
    ok('an emptied tournament pays nothing at all', !resRow(d, 'Series Two', 'Ian'));
    ok('and the standard still pays everywhere else',
       paid(d, 'Series One', 'Ian') === '$15', paid(d, 'Series One', 'Ian'));
  }

  {
    // clearing the standard, and what survives a reload
    const { dom, d } = setup();
    setKidRew(dom, d, 'Ian', { win: 5, p2: 30, note: 'Group stage' });
    enter(dom, d, 'Series One', 0);
    setRes(dom, d, 'Series One', 'Ian', 'wins', '6');

    const dom2 = boot({ [KEY]: dom.window.localStorage.getItem(KEY) });
    const d2 = dom2.window.document;
    click(dom2, $(d2, '#nav-matches'));
    ok('the standard comes back', kidLine(d2, 'Ian') === '$5 a win · 2nd $30 · Group stage',
       kidLine(d2, 'Ian'));
    ok('and still pays', paid(d2, 'Series One', 'Ian') === '$30',
       paid(d2, 'Series One', 'Ian'));

    click(dom2, kidRow(d2, 'Ian').querySelector('button'));
    ok('a child’s own dialog offers a plain clear',
       $(d2, '#r-clear').textContent === 'Clear', $(d2, '#r-clear').textContent);
    click(dom2, $(d2, '#r-clear'));
    ok('clearing the standard stops everything paying',
       kidRow(d2, 'Ian').textContent.includes('nothing set') && !resRow(d2, 'Series One', 'Ian'),
       kidRow(d2, 'Ian').textContent);
  }

  {
    // two children, two bargains, on the same draw
    const { dom, d } = setup();
    setKidRew(dom, d, 'Ian', { win: 5 });
    setKidRew(dom, d, 'Olivia', { win: 2, p1: 20 });
    enter(dom, d, 'Series One', 0);
    enter(dom, d, 'Series One', 1);
    setRes(dom, d, 'Series One', 'Ian', 'wins', '4');
    setRes(dom, d, 'Series One', 'Olivia', 'wins', '4');
    setRes(dom, d, 'Series One', 'Olivia', 'place', '1');
    ok('each child is paid their own way',
       paid(d, 'Series One', 'Ian') === '$20' && paid(d, 'Series One', 'Olivia') === '$28',
       [paid(d, 'Series One', 'Ian'), paid(d, 'Series One', 'Olivia')].join(' / '));
    ok('and the season total keeps the two purses apart',
       $(d, '#mnotes').textContent.includes('Ian $20 across 1 result; Olivia $28 across 1 result'),
       $(d, '#mnotes').textContent);
    ok('the pooled figure is nowhere on the page',
       !$(d, '#mnotes').textContent.includes('$48'), $(d, '#mnotes').textContent);
  }

  {
    // rubbish on a child must not reach the page
    const { dom } = setup();
    const seed = saved(dom);
    seed.players[0].rewards = { perWin: 'five', places: 'nope', improve: -1, note: {} };
    const dom2 = boot({ [KEY]: JSON.stringify(seed) });
    const d2 = dom2.window.document;
    click(dom2, $(d2, '#nav-matches'));
    ok('a broken standard reads as nothing set',
       kidRow(d2, 'Ian').textContent.includes('nothing set'), kidRow(d2, 'Ian').textContent);
  }
}

group('a suggested scheme is the weakest one');
{
  const Y = new Date().getFullYear();
  const KID = { id: 'p1', name: 'Ian', birthYear: Y - 9, colour: '#5B9BD5' };
  // The feed is a file in the repo. It must never quietly outbid a figure the
  // parent set on the child, and a stray empty object must not silence one.
  const feedOf = rewards => ({ matches: [{
    id: 'f1', source: 'jttl', name: 'U10 Red Ball Feed Event',
    start: `${Y - 1}-05-05`, end: `${Y - 1}-05-05`, venue: '', categories: [],
    entryDeadline: null, url: '', provisional: false, rewards }] });
  const seedOf = kidRewards => JSON.stringify({
    version: 2, updatedAt: Date.now(),
    blocks: [{ id: 'b1', name: 'B', start: `${Y}-08-01`, days: 14, plan: {} }],
    activeBlockId: 'b1',
    players: [{ ...KID, rewards: kidRewards }],
    manualMatches: [], trips: [], rewards: {},
    entries: [{ matchId: 'f1', playerId: 'p1', status: 'confirmed', wins: 4 }],
  });
  const bootBoth = (kidRewards, feedRewards) => new JSDOM(SRC, {
    runScripts: 'dangerously', url: 'https://example.test/', pretendToBeVisual: true,
    beforeParse(window) {
      window.localStorage.setItem(KEY, seedOf(kidRewards));
      window.fetch = url => String(url).includes('matches.json')
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(feedOf(feedRewards)) })
        : Promise.resolve({ ok: false, status: 404 });
    },
  });
  const settle = () => new Promise(r => setTimeout(r, 40));
  const STANDARD = { perWin: 5, places: [], improve: 0, note: '' };
  const paidOn = async (kidRewards, feedRewards) => {
    const dom = bootBoth(kidRewards, feedRewards);
    const d = dom.window.document;
    await settle();
    click(dom, $(d, '#nav-matches'));
    const row = $$(d, '.tourn')[0];
    const el = row && row.querySelector('.rpay');
    return { paid: el ? el.textContent : null, row, d, dom };
  };

  {
    const { paid } = await paidOn(STANDARD, { perWin: 1 });
    ok('the child’s standard outranks what the feed suggests', paid === '$20', paid);
  }
  {
    const { paid } = await paidOn(null, { perWin: 1 });
    ok('but the suggestion still pays where the child has no standard',
       paid === '$4', paid);
  }
  {
    // the bug: any object at all used to count as a scheme and swallow the rest
    const { paid } = await paidOn(STANDARD, { note: '' });
    ok('an empty suggestion does not stop the standard paying', paid === '$20', paid);
  }
  {
    const { paid, row } = await paidOn(STANDARD, undefined);
    ok('no suggestion at all is the same story', paid === '$20', paid);
    ok('and a feed row is never badged as an exception',
       !row.querySelector('.trewbtn').classList.contains('set'));
  }
  {
    // an exception set here still beats both
    const dom = bootBoth(STANDARD, { perWin: 1 });
    const d = dom.window.document;
    await settle();
    click(dom, $(d, '#nav-matches'));
    click(dom, $$(d, '.tourn')[0].querySelector('.trewbtn'));
    ok('the dialog opens on the suggestion, ready to accept',
       $(d, '#r-win').value === '1', $(d, '#r-win').value);
    input(dom, $(d, '#r-win'), '9');
    click(dom, $(d, '#r-ok'));
    ok('an exception set here beats the standard and the suggestion both',
       $$(d, '.tourn')[0].querySelector('.rpay').textContent === '$36',
       $$(d, '.tourn')[0].querySelector('.rpay').textContent);
    ok('and only then is the row badged',
       $$(d, '.tourn')[0].querySelector('.trewbtn').classList.contains('set'));
  }
  {
    // the new buttons name what they act on
    const { d } = await paidOn(STANDARD, undefined);
    ok('the standard’s button names the child',
       $(d, '[data-rewkid]').getAttribute('aria-label') === 'Edit Ian rewards',
       $(d, '[data-rewkid]').getAttribute('aria-label'));
    ok('and a row’s button names the tournament',
       $(d, '.trewbtn').getAttribute('aria-label') === 'Rewards for U10 Red Ball Feed Event',
       $(d, '.trewbtn').getAttribute('aria-label'));
  }
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('failed: ' + failures.join(' | ')); process.exit(1); }
