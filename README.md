# Tennis training planner

**Version 2.23.0** · [Changelog](CHANGELOG.md)

A single-page planner for a junior tennis season, in four parts:

1. **Calendar** (the landing view) — twelve months on one page: who is playing
   when (a coloured dot per child), where the training blocks sit, and the
   Singapore school holidays behind it all.
2. **Tournaments** — every tournament with its dates, venue, categories and
   entry deadline, plus which of your kids is going to each one. Surfaces
   closing deadlines, clashes, and the longest clear gap to book a trip into.
3. **Training** — build training blocks by dropping sessions onto morning,
   afternoon and evening slots. Each session carries its own start time and
   length, a slot takes more than one, and the hours that are not training at
   all can be blocked out alongside. The page tallies daily and weekly hours and
   flags a plan that is too heavy, too relentless, or too solitary for a young
   player.
4. **Setup** — who the children are and which tournaments exist. Tournaments and
   Training both split by child, so neither of them owns these: they are the
   family's, and they have a page of their own.

The design and the source research behind it are in `task_plan.md` and
`findings.md`.

The page is `vercel-deploy/index.html` — one file, no build step, no
dependencies, nothing to compile. Plans live in the browser's `localStorage`.
The only server-side code is `api/plan.js`, which exists so two devices can hold
the same plan; leave sync off and nothing in the site touches it.

```
vercel-deploy/
  index.html                    the entire site
  api/plan.js                   sync endpoint — the only server-side code
  package.json                  a Redis client, for api/plan.js alone
  data/matches.json             optional tournament feed — ships empty
  data/sg-school-holidays.json  Singapore MOE school calendar
  vercel.json                   cache + security headers
tests/                          jsdom harness + api tests — dev only, never deployed
```

## What it does — Training

- **Multiple training blocks.** Name them, give each a start date and a length
  (1–60 days), and switch between them from the tab row. A new block starts the
  day after the previous one ends.
- **A block belongs to one child.** With two children on the page a strip appears
  above the block row — **Everyone**, then a tab each — and **Whose** on the
  block's bar says who a block is for. A block added on a child's tab is theirs;
  their tab shows their blocks plus any block nobody has claimed yet. Everyone
  lists them all and stays editable, because a block names its own owner. With
  one child there is no strip and nothing changes.
- **Calendar grid** laid out Sun–Sat, aligned to whatever weekday the block
  starts on. Each day has a morning, an afternoon and an evening slot.
- **An exact start time on every session.** Placing one asks when it starts —
  the slot offers 09:00, 14:00 or 17:00 — and the grid then shows the real
  window, `09:00–10:00 · 1h`. Click the time on any placed session to change it.
  A session may also carry no time at all; it just says so.
- **A slot holds more than one session.** A morning can be a private and then
  physical, an afternoon school and then a lesson. The stack is kept in clock
  order and capped at four; the **+** strip under a filled slot adds another.
- **A length on every session.** The dialog fills in the usual one for the chip
  you placed (1h private, 2h group, 1h physical) and you can change it there or
  later from the grid — quarter hours, up to 12.
- **Four session types** — private, group, physical, and rest. Rest marks a
  single slot as off rather than the whole day, so a morning can be free while
  the afternoon is not; a day with nothing else booked still reads as a rest day
  in the totals and the load checks.
- **Study / other** blocks out a slot that is not training: give it your own
  label and length (study, school, a piano lesson). It holds the slot and shows
  its hours, but never counts towards the daily or weekly load, so blocking an
  afternoon does not make the week look heavier than it is. It is drawn in teal
  on a hatched card, so training and everything else are told apart at a glance.
- **The palette stays with you**, pinned to the top of the window and shrunk to
  the chips once you scroll past it, so a session is always there to drag.
- **Running totals** per day, per 7-day week, and across the block, with a
  per-day load bar that turns amber near the daily cap and red past it.
- **Caps that scale with age.** The daily and weekly ceilings follow the age the
  block's child reaches that season — 3h/11h at eight, 3.5h/13h at nine and ten,
  up to 5h/20h at fifteen and over. A block with nobody attached keeps the
  3.5h/13h defaults.
- **Load checks** that re-evaluate on every edit: days over the cap, long runs
  without a rest day, too few group sessions, two private blocks stacked on one
  day, two things booked over the same hour, physical work crowding out court
  time, and weeks over the weekly cap. They are written about the block's child
  by name and age.
- **Export** the plan as plain text to the clipboard, or print it — the print
  stylesheet drops the controls and prints the grid on white.

## What it does — Tournaments

- **Only the children who can enter a tournament are offered on it.** A U10
  event shows the nine-year-old alone, a 16&U event the thirteen-year-old. Each
  child is offered their own group and one above it — juniors play up a group,
  but not into every event they are technically old enough for. Naming a child
  on a tournament beats the age rule, and a child with no birth year is shown
  everywhere.
- **One page, and filters over it.** The whole season is on the tournaments
  view and every part of it can be edited from there. It used to be a tab per
  child plus an **Everyone** that could be read but not touched — which meant
  the one view where both children's weekends could be seen against each other
  was the one view where nothing could be corrected. Every edit belongs to a
  child, but that is an argument about which row a change lands on, not about
  which page it can be made from.

  Two filters narrow what is shown, and neither locks anything:

  | Filter | What it does |
  | --- | --- |
  | By child | one child's tournaments, once there are two children. **All players** is every one of them |
  | By year | one season's, once there is more than one year on the list |

  Setting up is still its own page: who the children are and which tournaments
  exist belong to the family rather than to the season.

  A row shows who **else** is playing, because that is a fact about the event —
  but never the child being filtered for, whose name against every row of their
  own list says nothing. With nobody filtered for, everybody is named; with one
  child in the family there is no chip at all, the whole page being theirs. A
  tournament nobody is on still says so, whoever is reading.
- **Tournaments** — name, dates, venue, categories and entry deadline, grouped
  by month, **newest first**. A season is read from the end it is happening at:
  the next weekend and the last result are the two things worth seeing, and both
  are at the top this way round.
- **What is finished folds away** under a line saying how many. It is the larger
  half of a season by the end of a year, and the half nobody is looking for.
  Press it to read the results underneath; it stays as you leave it while the
  page is open. Setup runs the other way about, oldest first and folding
  nothing: it is a list read to find a row and fix it.
- **Who's going** — a chip per child on each row, saying who is playing it.
  Being on a tournament is the whole of the statement: there is no entry to
  confirm on top of it, because the entry is submitted at the organiser's end
  and nothing here could tell whether it had been. Who a tournament is for is
  changed on Setup — filtered to one child, taking them off a tournament would
  take the row and the chip to undo it with it.
- **Summary** — where the season stands, a line per child: how many tournaments
  they are in, how many results are written down, how many matches they have
  won, and what it has paid. It follows the filters, so a year picked is a year
  summed, and the purses are never added together — two children's winnings
  totalled is a number nobody settles up with.

  **The season check reads underneath it, in the same box.** Where the season
  stands and what it still wants are one thought: the summary says a child has
  two results, and the line beneath says a third is owed. Two headings made them
  read as two subjects.

- **Rewards** — what each shape of draw pays. Shown with **All players** and not
  with one child: a scheme is the terms the whole family plays on, so it reads
  with the whole family. Filtered to one child the question is how their season
  is going, and the terms are not part of it. See below.
- **Season checks** — an entry deadline inside 21 days on a tournament a child
  is on, the same child booked into two overlapping tournaments, provisional dates,
  the longest clear gap between tournaments as the window to book travel, a
  finished tournament whose result nobody has entered. It reads inside the
  summary rather than in a box of its own, and what has been earned is in the
  figures above it rather than repeated.
- A tournament falling inside a training block shows that block's name, so
  build-up blocks are visible from the list. On a child's tab it prefers their
  own block over a sibling's; on Everyone it names whose block it is.

### Rewards

A scheme belongs to a **shape of draw**, not to a child. A group pays for every
match won and for where they finish; a knockout pays for turning up and for
every rung climbed. Those are facts about the draw — so two children on the same
shape play for the same terms, and one child who plays both shapes is paid by
each, which a single scheme per child could never do.

A **tag** joins them. A tournament carries one — the **Draw type** picker on the
add form, answered as the tournament goes on the list, or the one on its row on
**Setup** afterwards and for anything the STA import brought in — and a scheme
is filed under one, in the **Rewards** box at the top of the tournaments view.

It is picked, not typed. **Group** and **Knockout** are always offered, so the
first tournament of a season is a choice and not a spelling exercise, and
anything else in use follows. **Something else…** is the way to a shape nobody
has used yet; it asks for a name once, and thereafter that name is on the list
like the rest. The tags already in use are offered when a new one is asked
for, so the second event of a kind is a copy rather than a spelling test.

A tag keeps the spelling it was given — **Group**, **Knockout**, *Red ball
group* — and reads back that way. Matching ignores case, so a name typed as
*group* under **Something else…** joins the *Group* already there rather than
becoming a second tag quietly paying different money. Renaming a scheme is how
a spelling changes, and it carries its tournaments with it.

The tournaments view reads the tag but does not set it: it shows on the row
beside the venue, and an untagged one says so there, because a row that pays
nothing has to give some account of itself. Free text rather than a fixed pair, so a season
that grows a third kind of event needs no new code. Schemes belong to no child,
so they can be set from **Everyone** as well as from a child's tab.

An untagged tournament joins no scheme and pays nothing. A tag with no scheme
behind it does the same, and the box says so — a tag is worth keeping either
way, since a scheme written for it later finds its tournaments still wearing
it.

The dialog asks the shape of the draw first, because the two shapes pay for
different things and each brings its own lines and its own figures to start
from. Any line can be left blank to drop it.

Those figures are grey **placeholders and not values** — a dialog that looks
filled in stores nothing, and a scheme with nothing in it pays nothing on every
tournament. **Use these** takes them all at once, as real values, and only for
the lines the shape is showing: a group has no quarterfinal to pay for and a
knockout no third place. Everything stays editable before Save. (On a
tournament's own dialog the same button reads **Use the tag's**, and does a
different thing — see below.)

**Group** — everyone plays the same handful of matches, so the wins carry it:

| Line | Pays |
| --- | --- |
| Per win | that much for every match won |
| 1st / 2nd / 3rd / 4th place | that much for finishing there |
| Beat last | that much for winning more matches than at their previous tournament |
| Best ever | that much for winning more than at *every* tournament before it |

**Knockout** — how far up the draw they got is the story, so the rungs carry it:

| Line | Pays |
| --- | --- |
| Initial prize | that much for turning up and playing, whatever happens after |
| Per round | that much for every round won |
| Quarterfinal | that much for reaching the last eight — a finish of 8th or better |
| 2nd place | that much for losing the final |
| 1st place | that much for winning it |
| Beat last | that much for winning more rounds than at their previous tournament |
| Best ever | that much for winning more than at *every* tournament before it |

The knockout bonuses **stack**: a child who wins the thing is paid the starting
money, the round money, the quarterfinal money — they went through it — and the
1st place money. The lines are shown in that order, bottom rung first, the way
the draw is played.

*Beat last* and *Best ever* are different achievements and can both land on the
same afternoon: beating last time is the week-to-week nudge, beating everything
is the rarer thing. Neither pays at a child's first tournament, which has
nothing behind it to beat.

A knockout has two lines a group does not — the initial prize and the
quarterfinal — and a group has a third and fourth place a knockout cannot
award, so switching shape empties those lines where you can see them go; every
line the two shapes share keeps whatever you typed.

A scheme applies to every tournament carrying its tag, and **no tournament
repeats it**. A row shows a rewards line only when that event pays something
different, badged **Only here**. Press **Rewards** on a row to make one an
exception; press **Use the tag's** in that dialog to drop the exception again.
Saving an exception with every line blank is how you say *this one pays
nothing*.

Schemes resolve in one order, most specific first:

    tournament exception  →  the tag's scheme  →  a data/matches.json suggestion

Renaming a tag takes its tournaments with it. Deleting a scheme leaves them
tagged, ready for one written again.

Each child on the tournament gets a **Wins** and **Place** box, whether or not
it pays anything — how a child did is worth recording on its own, and most
tournaments pay nothing. Where a scheme does apply, the page adds the payout up
in front of them: *$55 · 4 wins $20 · 2nd $30 · beat 3 $5*, or on a knockout
*$230 · played $20 · 4 rounds $80 · quarterfinal $30 · 1st $100*. The sum is always shown in full, so a child can see how the number
was reached. Two children on the same draw are each paid their own way, and a
tournament that pays nothing simply says nothing about money.

"Beat last" measures against that child's most recent *earlier* tournament with
a win count recorded — not simply the previous tournament, which they may not
have played. "Best ever" measures against the highest count on any earlier
tournament. With nothing earlier on file there is nothing to beat, so neither
bonus pays. This is the reason results are stored at all.

Nought wins is a real result and is kept as one; an empty box means *not yet
entered*, which is what the season check chases after a tournament has
finished. A row with nothing in either box is not stored at all — the
tournament's own list is what says who is playing it.

### Results

**Results** on a tournament row opens its own dialog, holding the two things
that come back from the weekend.

**A link** to wherever the draw was published, which then shows on the
tournament's own line beside *Tournament page*. One per tournament, not one per
child: the sheet is the event's and covers everybody in it. Only http(s) is
kept, because it is rendered as a link.

**The draw, read off STA.** On a tournament that came from STA there is nothing
to copy at all: press **Read the draw from STA** and it reads every event of the
tournament — singles and doubles, qualifying draws left out, a qualifier being a
way into the main draw rather than a result of its own. A doubles pair is read
as its two players, so a child is found by their own name either way.

Only a finished run is recorded. A draw is usually looked at while it is still
being played, with the next round already on the page and no winner in it yet; a
child waiting for that match has not gone out in it, so they are left out until
they have either lost or won the thing. A bye is a round nobody won, and does
not count as one.

**The scorecard**, pasted, for everything else. Open the sheet, copy the group's
rows, and paste them in; the dialog says who it found before anything is
written, and **Save** fills in the wins and the place for every child of yours it
matched. A paste is the more deliberate answer, so it takes over from a draw
that was read.

It is pasted rather than fetched, and that is not laziness. The sheet arrives as
a private `.xlsx` belonging to whoever ran the event, so there is no address a
page could read; it is a zip of XML, which would mean shipping a spreadsheet
library into a file that has no dependencies at all; and it carries fifty other
families' names, emails and part of their NRIC. Pasting keeps all of that out:
the parse happens in the page, and only the matched child's two numbers are
stored.

What it reads:

| | |
| --- | --- |
| The header | the row naming **Won** and **Rank** says which columns hold the numbers. Several groups can be pasted at once — each header re-aims the columns for the rows beneath it, so groups of different sizes are fine |
| No header | the block is read for its shape instead. Down a group **Rank** runs 1, 2, 3 … once each, which no column of scores ever does, so the rightmost column whose values are distinct and inside the size of the group is the placing, and Won is beside it. Fewer than four rows is left alone: two rows can agree by chance. The dialog says when the columns were worked out rather than read |
| A player row | the first cell that reads as a name, then those two columns. A name quoted because it holds a comma survives whole. A row opens with the player's place in the group, written as a bare number on some sheets and as the group letter and the number on others — `D1`, `D2` — and neither is mistaken for the name |
| A column between them | some sheets put a points difference between **Won** and **Rank**. Won is looked for leftwards rather than immediately beside: it cannot be missing where a placing is given, nor larger than the players there were to beat, and a difference fails both |
| A dash | a player who never turned up. Not a nought, so the row is skipped |
| Tabs or commas | a spreadsheet copies tab-separated and an exported CSV comes comma-separated; both read |

Names are matched leniently but not carelessly. *Ian* finds *Ian Lin*, because
the name starts the cell — and not *Ho Yin Ian Chiu*, who merely contains it. If
two rows tie, the dialog names them both and fills in nothing: a wrong result is
worse than one typed by hand.

The header is worth including where it is easy to grab, being certain rather
than deduced. It is often not easy — it sits above a merged title and a couple
of blank rows, and selecting the players alone is what the hand does — which is
why the block can speak for itself.

## What it does — Setup

Who the children are and which tournaments exist. Tournaments and Training both
split by child, so neither of them owns this — it is the family's, it has a page
of its own, and nothing on it is ever read-only.

- **Kids** — add each child with a birth year; they get their own colour and an
  age group (U10, 14&U, 16&U, Junior). Ages follow the Singapore convention: the
  age reached during the season year, so 10&U in 2026 means born 2016 or later.
  The birth year is what lets a tournament offer only the children who can enter
  it, and what the training load checks read to know how hard a day is.

  **The name can be corrected in place**, and it is worth writing the full one:
  a scorecard and an STA draw both name a child in full, and *Ian Lin* is matched
  against those where *Ian* would tie with every other Ian in the draw. Renaming
  keeps the child — their entries, their results and every list naming them are
  held by who they are rather than by what they are called.
- **Every tournament there is**, whoever can enter it, each with a **×**. This is
  the only place one can be deleted: removing a tournament is setting up, not
  running a season. A tournament that repeats one already on the list is badged
  **Duplicate**; nothing is merged for you, because each row can carry its own
  entries, rewards and answer to who it is for.
- **Who each tournament is for.** The age group is a guess — it says which events
  a child is old enough for, not which ones are theirs. **For** is a field in the
  add row like any other, between the entry deadline and the button. It reads
  *Everyone* until you say otherwise — which leaves the age groups deciding as
  before — and opens a panel to tick children off; untick one and the tournament
  never reaches their tab. Chips on every row let it be changed later, and
  pressing a name puts a child on an event their age group would have excluded.
  A deadline you were never in the running for does not nag you.
- **Taking the last child off says nobody is playing it**, which is not the same
  as never having said: the age rule does not then put them back on. Such a
  tournament reaches no child's tab, but Setup lists every tournament there is,
  so it is never lost.
- **A result already recorded is kept when a child is taken off**, not deleted.
  Taking someone off is as often a mis-click as a change of plan, and putting
  them back brings the afternoon with them. Until then it counts towards
  nobody's season.
- A tournament nobody is on says **on no one's list** on its row. Press a name to
  fix it.
- **Removing a child does not remove tournaments.** A tournament is an event in
  the world and belongs to the family, not to a child — on a list of two it is as
  likely the other's. What goes with them is their entries and their results,
  and any list narrowed to them widens back to the age rule — with them gone it
  says nothing about anybody, rather than saying nobody plays it.
  Where that leaves a hand-added tournament serving nobody at all, you are asked
  whether to delete those too, by name; cancelling keeps them. Rows from the STA
  feed are never offered, since they would return on the next fetch, and nothing
  is offered when the last child goes — with an empty list every tournament
  trivially serves nobody, and a season should outlast a list being briefly
  empty.
- **What shape of draw it is** — the **Draw type** picker on the add form, and
  the one beside the children on each row afterwards. It is what joins a
  tournament to a rewards scheme, and it is asked here because it is a fact about
  the event, like its dates and its venue. Group and Knockout are always on the
  list, with anything else in use; **Something else…** names a new one.
  Untagged is a state and not a fault, though it does mean nothing can be paid.
- **Categories are not typed by hand.** The add form does not ask: the age groups
  come out of the tournament's name, and who it is for is answered by **For**. A
  pasted STA link still records what STA publishes, and the import always did.
- No rewards and no results here — those belong to a child, on their own tab
  under Tournaments.

### Importing the STA calendar

**Import from STA** pulls the whole tournament list in one call and keeps what
the ticked children can enter. Eligibility is judged per tournament against the
year it runs in, so a child ageing out between seasons is handled correctly.
**Upcoming only** is on by default. Re-importing never duplicates: tournaments
are matched by their STA id, and the note tells you how many were added, already
there, or already finished.

With no children added yet, the import falls back to every junior age group.

STA publishes no age-group field, so the group is derived from the words: the
title and the category line are read together for an age cap written any of the
ways it is written — `14&U`, `14U` or `U14` — and the youngest cap on a
tournament wins. Anything else marked Junior is a junior event; the rest are
treated as adult. A `12&U` cap has no bucket of its own and takes the nearest
one above it, `14&U`.

### Adding a tournament from its link

Paste an STA tournament link (`https://www-new.singtennis.org.sg/tournaments/…`)
into the add form. The name, start, end, entry deadline and categories fill
themselves in; the link is kept on the row. Lookup fires on paste, on Enter, or
from the **Look up** button.

The lookup resolves the slug in the URL through
`api.singtennis.org.sg/web-api/Tournament/GetTournamentInfoBySlug`, which is
unauthenticated and sends `Access-Control-Allow-Origin: *`, so the page reads it
directly — no proxy, no scraper. It fills the **venue** too.

Resolving the slug rather than searching the tournament list matters: the list
omits competitions that are published but not yet open for entry, such as the
Red/Orange/Green events linked from `/red-orange-green`. Those resolve fine by
slug.

Only STA links work. Other sites — jttsingapore.com among them — send no CORS
headers, so the browser cannot read them; add those tournaments by hand.

### Where tournament data comes from

Two places, merged:

- **Anything you add in the browser** — imported from STA, filled in from a
  link, or typed by hand. Stored in `localStorage` on that device, editable and
  deletable. This is the normal path.
- **`vercel-deploy/data/matches.json`** — an optional feed committed alongside
  the site, read at page load and shown read-only. It ships empty. Edit it by
  hand, or point a generator at it, if you want tournaments to travel with the
  deploy rather than live in one browser.

  Each entry needs at least `id`, `name` and an ISO `start`; `end`, `venue`,
  `categories`, `entryDeadline`, `url`, `source` (`sta` / `jttl` / `manual`),
  `provisional`, `note` and `rewards` are optional. A `provisional: true` entry
  is badged as an estimate, and its `note` explains why. A `rewards` object
  (`kind`, `initial`, `perWin`, `places`, `qf`, `improve`, `bestEver`)
  is the weakest suggestion there is: a
  tournament exception set in the browser beats it, and so does whatever the
  tournament's tag is filed under. `kind` is `group` or `knockout` and defaults to `group`; `initial`
  and `qf` are the starting money and the quarterfinal bonus, and are only read
  on a knockout.

See `findings.md` for the full trace of what each source does and does not
expose.

## What it does — Calendar

Twelve months for one year, with arrows to move between years.

- **A dot per child** on every tournament day, in that child's colour, so you
  can see who is competing when. Grey means a tournament nobody is on; a child
  taken off one shows nothing. Hover a day for who is playing and the holiday.
- **Training blocks** as a left edge — in the child's colour on a day only they
  train, yellow where two of them do or where the block has no owner. Hover for
  the block name and whose it is.
- **School holidays** as the day background — vacations green, public holidays
  amber.
- **Holidays this year**, longest first, each marked clear or with the number of
  tournaments inside it.

Tournaments are dots, not filled days, because league events run for weeks
(Inter-Club 3 Sep–18 Oct, JTTL 19 Sep–15 Nov) and filling them hid the school
holidays underneath.

### Where the school holidays come from

`vercel-deploy/data/sg-school-holidays.json`, hand-entered from the MOE press
releases and carrying its source URLs and a `verifiedOn` date. Currently 2026
and 2027 — **add a year to that file when MOE publishes one.**

They cannot be fetched live: data.gov.sg has no school-holiday dataset and
sends no CORS header, and moe.gov.sg is not readable from the browser either.

## Using it

Drag a session from the palette onto a slot, then give it a start time — the
slot's usual time is filled in, so it is one keystroke to accept. A slot takes
more than one: drop a second session on it, or use the **+** strip under it, and
the two sit in clock order. Drag a placed session to another slot to move it,
which keeps the time it already has; click the time to change it, or its **×**
to remove it. On a phone, tap a session to arm it and then tap a slot — the grid
stacks to one day per row.

Pick a block from the tab row, or **+ New block**. **Starts** shifts the whole
block — the grid, header range and day labels all follow. **Days** changes its
length; shortening a block hides the trailing days rather than deleting them, so
lengthening it again brings the sessions back. **Load suggested plan** fills the
built-in fortnight (only as far as the block is long), **Clear all** empties it,
**Delete block** removes it after a confirm.

Everything is keyboard reachable: sessions and slots are focusable, and Enter or
Space arms and places.

## Run locally

Open `vercel-deploy/index.html` in a browser, or serve the folder. Everything
works except sync, which needs the serverless function and so only runs on a
real deployment:

```sh
cd vercel-deploy && python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy

**Vercel** — deploy from inside the folder, so `vercel.json` is picked up:

```sh
cd vercel-deploy
npx vercel          # preview
npx vercel --prod   # production
```

Importing the repo from the Vercel dashboard instead? Set **Root Directory** to
`vercel-deploy`. Framework preset: *Other*; no build command.

**Any static host** — upload `vercel-deploy/index.html`. That single file is the
whole site.

**GitHub Pages** — Pages' branch source only serves `/` or `/docs`, so it cannot
serve `vercel-deploy/` directly. Either rename the folder to `docs/`, or add a
workflow that uploads `vercel-deploy/` as the Pages artifact.

## Configuration

The knobs are constants near the top of the `<script>` block in `index.html`:

| Constant | Meaning |
| --- | --- |
| `TYPES` | Session types: label, duration, hours, colour |
| `DEFAULT_DAYS` | Length of a new block (14) |
| `MAX_DAYS` | Upper clamp on block length (60) |
| `DAY_CAP` | Daily hour ceiling before a day is flagged as heavy |
| `WEEK_CAP` | Weekly hour ceiling, applied per full 7-day week |
| `SUGGESTED` | The plan loaded by "Load suggested plan" |
| `DEFAULT_START` | Start date used before the user picks one |
| `STORE_KEY` | `localStorage` key holding all blocks (`tennis-season-v2`) |
| `LEGACY_KEY` | v1.0.0 key, read once for migration and never written |

Weeks are 7-day chunks counted from the block start, so a block of any length
reports sensible weekly loads. The calendar grid aligns to whatever weekday the
block starts on.

Changing the shape of saved state? Bump `STORE_KEY` so existing saves are
ignored rather than half-read, and leave the old key in place so a rollback to
the previous deploy still finds its data.

## Syncing across devices

Turn on sync and the laptop and the phone hold the same plan. There is no
account: one device generates a random 16-character **sync code**, you type it
on the other, and from then on every change goes up and every load comes down.

**On the deployed site**, at the foot of the page:

1. **Turn on sync** on the device that has the plan you want to keep. Write the
   code down — the page shows it as `XXXX-XXXX-XXXX-XXXX`.
2. On the other device, **scan the QR code** the first one is showing. The
   planner opens already joined — nothing to type. If the other device is not in
   the room, **Copy link** and send the link to it instead; and if you would
   rather type, press **Use a code** there — *not* Turn on sync, which starts a
   second plan of its own — then enter the code and **Connect**.

   However it joins, that device takes whatever is stored under the code, so
   join *from* the device you are willing to overwrite. It asks first.
3. After that it looks after itself. Changes go up a moment after you make them,
   and coming back to a tab you left open pulls down whatever the other device
   did. **Sync now** forces a check, **Stop syncing** disconnects this device and
   forgets the code.

**Use a code** takes the whole link as readily as the sixteen characters, so
whatever arrived from the other device can be pasted straight in.

If both devices ended up with codes of their own, they are two separate plans.
Pick the one you want to keep, and on the other device press **Use a different
code** and enter the first device's.

**Added to an iPhone or iPad Home Screen**, the planner runs as its own browser
with its own storage — it cannot see what Safari on the same device saved, so it
opens on the default plan and has to join like any other device. Scanning will
not do it, because a scanned link opens Safari rather than the Home Screen app:
copy the link on the other device and paste it into **Use a code**, once.

**What the code is.** It is the whole of the security model, so treat it like a
password: anyone with it — or with the QR code, or the link — can read and
change the plan. The code rides in the URL *fragment*, which browsers never send
to a server, and the page clears it from the address bar as soon as it reads it.
The server only ever sees
its SHA-256, so the code itself never leaves your browser and nothing on the
server can be turned back into one. Losing every device that has it means losing
the plan — the server cannot help you, because it does not know who you are.

**When two devices disagree**, the newer plan wins, and the page says so rather
than deciding quietly. If the other device saved something while this one was
holding a change, the push is refused and you are asked: *take their copy*, or
*keep mine* and overwrite. Nothing is lost without you choosing it.

### Setting it up on your own deployment

The page talks to `/api/plan`, a serverless function in `vercel-deploy/api/`.
It needs somewhere to put a few kilobytes:

1. In the Vercel project → **Storage** → add a **Redis** store and connect it
   to the project. Vercel's own managed Redis and the Upstash marketplace one
   both work, and either free tier is far more than a few kilobytes needs.
2. Redeploy. That is all — there is nothing to configure by hand.

The function takes whichever shape the store arrives in:

| The store injects | How the function reaches it |
| --- | --- |
| `REDIS_URL` or `KV_URL` | the `redis` client, over the connection string |
| `KV_REST_API_URL` + `..._TOKEN` | plain `fetch`, no client at all |
| `UPSTASH_REDIS_REST_URL` + `..._TOKEN` | the same |

REST wins if both are present, since it costs a request rather than a held
connection. The `redis` package in `vercel-deploy/package.json` is imported only
on the connection-string path, and is the one dependency in the project.

Vercel names a store's variables after the store, so a managed Redis called
*tennis plan* arrives as `tennis_plan_REDIS_URL` rather than `REDIS_URL`. The
function takes either — an unprefixed name wins if both exist, and a REST token
is only paired with a url from the same store — so there is nothing to rename.

Until a store is connected the function answers `503` and the page says sync is
not set up — the planner itself carries on working, locally, exactly as before.
Sync also does nothing when you open `index.html` from disk or serve the folder
statically, since there is no function to answer.

A plan is stored under the hash of its code and expires 400 days after its last
write, so an abandoned code does not sit there forever.

## Backing up your data

Sync keeps two devices level; a backup is what saves you from both of them.
Everything you enter also lives in that browser's `localStorage`, and **Safari
deletes script-writable storage after about a week without a visit**, so a plan
left unopened can disappear.

Use **Download backup** at the foot of the page. It writes one dated JSON file
with every training block, child, tournament and result. **Restore backup**
reads it back, after confirming, and refuses anything that is not a valid backup
without touching what you already have.

That file is also how you move a plan from laptop to phone without turning sync
on at all.

### The season as a spreadsheet

**Download results** writes a dated `.csv` — one row per child per tournament
they are on, with the dates, venue, categories, wins, place, the tournament's
result link, what it earned and how that was made up. It opens in Excel, Numbers or Sheets,
and the earnings column is a bare number so a column of them adds up.

It is a copy to read, sort and keep, not a backup: nothing reads it back in.
**Download backup** is what restores. CSV rather than `.xlsx` because a real
workbook is a zip of XML, and this page carries no dependencies at all.

## Tests

```sh
cd tests && npm install && npm test
```

Two suites. `api.test.mjs` drives `api/plan.js` directly with a stubbed store —
backend choice, key validation, the 409 refusal and the forced write, bodies
that are not plans, junk in the store, and an unreachable one.

The rest is 663 assertions driving the real page under jsdom: cold boot, the v1.0.0
migration, state round-trips, thirteen kinds of corrupt saved state, block
create/rename/switch/delete, variable length and its clamps, calendar alignment
for different start weekdays, the load checks and the age they scale with, whose
block is whose — the training strip, the owner picker, and a block outliving the
child it belonged to — a timezone regression, view
switching, Setup as a view of its own and its edits reaching both strips,
kids, tournament add/delete, who each tournament is for, the scorecard
parser and the dialog that fills boxes from it, the reward
schemes — per child, per tournament, a feed's suggestion, and the order the
three resolve in — the payout arithmetic behind them, and the season checks.

Sync is covered by a fake server that honours the same contract as the real
endpoint — joining, the debounced push, both sides of a conflict, and being
offline. The QR code is verified by decoding: the tests read the page's own
rendered code back with a scanner and check the link that comes out.

Drag-and-drop is **not** covered — jsdom has no real drag implementation. The
tap-to-place and keyboard paths are.

## Notes

- Fonts (Barlow Condensed, Karla) load from Google Fonts; the page falls back to
  system fonts if that request is blocked or offline.
- Saved plans are per-browser until you turn sync on, and there is no account
  either way — a sync code is the only credential. Private-browsing modes that
  block `localStorage` degrade to a working page that just does not remember
  anything, sync included.
- Drag-and-drop uses the HTML5 drag API, which does not fire on touch devices;
  that is what the tap-to-place path is for.
