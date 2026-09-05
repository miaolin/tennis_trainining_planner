# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.13.0] — 2026-09-05

### Added

- **Two shapes to start a scheme from.** **Start from** at the top of the rewards
  dialog fills the boxes for a **Group** or a **Knock-out** and writes nothing
  until Save, so both are a starting point rather than a setting. A group is
  played to a table — every match worth the same, the finish paid by the
  placings. A knock-out pays by the round reached, which here is the number of
  matches won, so a fixed amount per win already *is* a ladder; the ATP and WTA
  roughly double at each round, these steps are even. Switching shape rewrites
  the format note, unless the words in it are your own.
- **To play** — an amount paid whatever happens, once a result is recorded. It is
  the floor a knock-out ladder climbs from, and there was no way to say it
  before: everything was multiplied by wins, so a first-round loss was worth
  nothing however the draw was paid. With $10 to play and $10 a win, a 16-draw
  runs $10, $20, $30, $40, and $70 for the title.
- **Best ever** — a bonus for beating every earlier tournament, where **Beat
  last** compares only with the most recent one. Both can land on the same
  afternoon: beating last time is the week-to-week nudge, beating everything is
  the rarer thing. Neither pays at a child's first tournament, which has nothing
  behind it to beat.
- **4th place** joins 1st through 3rd. `ORDINAL` already carried eight; only the
  cap held it to three.

### Fixed

- **A breakdown no longer says "0 wins $0".** Nothing was earned per win, so
  nothing is said about it. The line was always wrong and rarely seen — with no
  floor to pay, a result with no wins was worth nothing at all and the row said
  so instead.

## [2.12.0] — 2026-09-05

### Changed

- **A result is a fact about the afternoon, not about money.** The Wins and Place
  boxes only appeared on a tournament that paid something, so a child entered for
  an event with no scheme on it had nowhere to record how they did — and most
  tournaments pay nothing. The boxes now follow the entry: any child **Entered**
  or **Confirmed** gets them. The money still follows the scheme, and a
  tournament that pays none says nothing about money at all rather than showing
  an empty amount or *No result yet*, both of which read as something missing.

### Added

- **Download results**, beside Download backup, writes the season as a dated
  `.csv`: one row per child per tournament they have a status on, carrying the
  dates, venue, categories, source, status, wins, place, what it earned and how
  that sum was made up. It opens in Excel, Numbers or Sheets, and the earnings
  column is a bare number so a column of them totals. Written UTF-8 with a BOM,
  so a name with an accent in it opens correctly on Windows, and quoted properly
  so a comma in a tournament name cannot break the record apart.

  It is a copy to read and keep, not a backup — nothing reads it back in, and
  **Restore backup** is still the way back. CSV rather than `.xlsx` because a
  real workbook is a zip of XML and would mean shipping a library into a page
  that has no dependencies at all.

## [2.11.2] — 2026-09-04

### Fixed

- **The same tournament could be added over and over through its own link.**
  Only the bulk import ever checked for one it already had, and it checked on an
  id — `sta-<tournamentId>` — that the link path never gave itself: **Look up**
  read the STA id and threw it away, and **Add tournament** minted a fresh random
  one. Two rows of one event, identical down to the link, and nothing able to
  tell they were the same. A tournament added through its link now takes the id
  the import would have given it, so adding it twice, or importing it after
  adding it, is recognised. Those rows carry the STA badge now too, which they
  should have all along.
- **A tournament typed by hand is checked as well.** There is no id to match on,
  so the test is the name and the start date, ignoring case and stray spaces —
  coarse, but two events of one name on one day is not a thing that happens, and
  the second is always the mistake. Either way the add is refused and says which
  tournament it clashes with, rather than adding a second quietly.
- **A refused add no longer hands its link's id to whatever is typed next.** The
  link stays in the field after a failed add, so the id it resolved has to be
  tied to the name and start it filled in as well — otherwise the next, quite
  different tournament inherited it. Editing the link clears the resolution too.

### Added

- **Duplicates already on the list are badged on Setup**, where the **×** is.
  Nothing is merged for you: each row can carry its own entries, rewards and
  its own answer to who it is for, and which one to keep is not the program's
  decision. Deleting either clears the badge from the other.

## [2.11.1] — 2026-09-04

### Changed

- **Who a tournament is for is a field in the add row, not a strip under the
  button.** Asking the question below the button asked it after the moment it
  could be answered: you pressed **Add tournament** and only then met the row
  that said who it was for. **For** now sits between the entry deadline and the
  button, reads *Everyone* until told otherwise, and opens a panel to tick
  children off — a field like the others, in the order the form is filled in.
  Names are far too long to spell out inline, so the field says who and the
  panel does the choosing.
- The three date fields hold a fixed 140px rather than an equal share, so eight
  controls fit the row where eight equal ones would not. Name takes the largest
  part of what is left, being the one anyone reads back.

### Fixed

- **A field's caption and input styling stopped leaking into anything nested
  inside it.** The tick boxes in the For panel are a `<label>` and an `<input>`
  inside a `.fld`, so they were being drawn as field captions — tiny, letter
  spaced, uppercase — with each tick box stretched to the full width of the
  panel, pushing its name off to the right. Both rules now stop at the field's
  own children.

## [2.11.0] — 2026-09-04

### Added

- **A tournament can say which children it is for.** The age group was only ever
  a guess — it says which events a child is old enough for, not which ones are
  theirs, and a 12-year-old who *could* enter four events in a weekend is not
  entering four events. The add form now carries **For**: every child ticked by
  default, which leaves the age groups deciding exactly as before, and unticking
  one keeps the tournament off their tab entirely. The same chips sit on every
  row on Setup, so it can be changed afterwards, and pressing a name puts a child
  on an event their age group would have excluded — the stated answer beats the
  guess in both directions.
- **A tournament on nobody's list says so**, on its row, where pressing a name
  fixes it. An adult event among the imports used to be a row that simply never
  appeared on any tab.

### Changed

- **Not on it is no longer treated as not decided.** The entry-deadline warning
  counted every child with no status, so an event none of them was ever in the
  running for nagged all of them. It now asks only the children the tournament is
  actually for. **Skipping** still means what it always did: it was theirs, and
  they are not going.
- **A child with an entry cannot be dropped from a tournament.** Their chip on
  Setup is fixed on and says where to change it — an entry is a stronger
  statement than a list, and stranding one behind a list nobody could see was the
  way to lose it.
- A list is stored only when it says something the age rule does not. Ticking
  everyone back on drops it again, so a list cannot go stale the first time a
  birth year is corrected, and a child who leaves takes their name out of every
  list with them.

### Fixed

- **An age cap is read whichever way it is written, and wherever it is written.**
  Only `14&U`-style tokens in the *title* counted, so `12U Girls` in the category
  line — the add form's own placeholder — parsed as an adult event and reached no
  child at all. The cap is now read from the title and the category line
  together, as `14&U`, `14U` or `U14`, with the youngest cap on a tournament
  winning. Closing up every space also joined a season year to the token after
  it, reading `2016 U10` as a 16&U event; only the spaces around an `&` are
  closed up now.
- **The tournament list stopped rendering itself twice.** `renderTournList` ran
  its whole write-and-wire tail twice over, so every row was built, wired, thrown
  away and built again on each render.

## [2.10.0] — 2026-09-03

### Added

- **A training tab per child, and a block that knows whose it is.** Hours, rest
  days and every load check are judgements about one body, so averaging two
  children's weeks together said nothing true about either. Training now carries
  the same strip as Tournaments — **Everyone** and a tab per child — and each
  block belongs to one of them, set from **Whose** on the block's own bar. A
  block added on a child's tab is theirs; a child's tab shows their blocks and
  any block nobody has claimed, so nothing can become unreachable. The block tab
  carries their colour, a hollow ring where nobody is named yet.
- **A Setup page.** Setting up moved out from under Tournaments and became a
  fourth nav item beside Calendar, Tournaments and Training: Kids, Import from
  STA, Add a tournament, and the list of every tournament with the **×** that
  removes one. Both pages split by child now, so who the children are and which
  tournaments exist belong to neither of them — they are the family's. It is
  reachable with no children added at all, which the old tab, which only
  appeared once there were two kids, was not.
- **Load ceilings that know how old the child is.** The 3.5h that is a hard day
  at nine is an ordinary one at fifteen. The daily and weekly caps — and the day
  bars and week totals drawn from them — now scale with the owner's age in the
  season the block runs in. A block with nobody attached keeps the original
  figures.
- **The load check names the child.** It said "past the useful ceiling for a
  9-year-old — she will stop learning", which was one child's block hard-coded
  into the page. It now gives the owner's real age and their name.

### Changed

- **Both child strips read the same:** Everyone, then a tab each. The
  Tournaments strip has lost its Setup tab, and the tournaments page has lost
  the Kids, Import and Add boxes with it. What is left there is the season —
  rewards, statuses, results and the season check.
- **Nothing on Setup is ever read-only.** The guards that kept those controls
  off a child's tab are gone, because the controls are not there to guard:
  setting up is the one thing you always came to do. Everyone stays read-only on
  Tournaments, where an edit really does belong to one child.
- **One row renderer, two lists.** Setup asks what exists — no statuses, no
  results, no rewards. The tournaments page asks how the season is going, for
  whoever's tab you are on, and no longer offers a delete.
- **Everyone stays editable on Training**, unlike the tournaments overview: a
  block names its own owner, so an edit made from the overview is never
  ambiguous about who it is for.
- **The year view says whose training week it is.** A day only one child trains
  takes their colour on its left edge, and the tooltip names them:
  `Training: Her block (Olivia)`. A day both train keeps the neutral marker — a
  single stripe cannot honestly stand for two children.
- **A tournament's build-up follows the tab.** "During *Her block*" now prefers
  the block belonging to the child whose tab you are on, and names the owner on
  Everyone where the block name alone is ambiguous.
- **Copying a plan as text carries the name** — the text lands in a message with
  no tab strip around it to say whose it is. The printed page drops the strip,
  as it already drops the block bar.

### Fixed

- **Removing a child no longer takes their training with them.** Their blocks go
  back to unassigned and stay on the page; the plans in them are real work.

With one child there is still no strip on either page: Tournaments and Training
each stay one view with everything on it, and Setup is where it always is.

## [2.9.1] — 2026-09-03

### Fixed

- **The add-a-tournament fields and the button read as one line.** Six fields sat
  across the box and the button dropped to a row of its own underneath, so the
  form looked like two things. Name through Entry deadline and **Add tournament**
  now share a single row at full width, and below it they fall into even rows of
  three, then two, with the button on its own line at its natural width.

## [2.9.0] — 2026-09-02

### Changed

- **A Setup tab, and every edit has one place to be.** A child's tab still
  showed the Kids box, so Olivia's tab listed Ian and offered to add another
  child — neither hers nor an overview. Who the children are and which
  tournaments exist are the family's, not any one child's, and they now live on
  **Setup**: Kids, Import from STA, Add a tournament, and the list with its
  delete. Nothing else is there — no rewards, no statuses, no results, no season
  check, because those all belong to a child.
- **The header line follows the tab.** Telling someone to click a child on a row
  is wrong on the two tabs where clicking does nothing, so Everyone and Setup
  each say what they are instead.

With one child there is still no strip and nothing moves: one view, everything
on it.

## [2.8.0] — 2026-09-01

### Changed

- **Rewards belong to the child now, not to each tournament.** Setting the same
  five figures on every event was the whole scheme repeated down the page, and
  the page was mostly a list of the same sentence. It is set once, per child, in
  a **Rewards** box at the top of the tournaments view, and no row repeats it.
- **A row only says something when it pays something different**, badged **Only
  here**. Press Rewards on a row to make one an exception, Use standard to drop
  it again, and save an exception with every line blank to say that one pays
  nothing. Schemes resolve in one order: a tournament exception, then the
  child's standard, then a `data/matches.json` suggestion. A file committed
  alongside the site is the weakest thing there — it stands in only where a
  child has no standard of their own, and never outbids one that is set.
- **A tab per child**, with **Everyone** first, once there are two children to
  separate. A child's tab scopes the whole view — their tournaments, their
  standard, their money, their checks — and **Everyone changes nothing**: it is
  the season read only, because every edit here belongs to whichever child it is
  about. With one child there is no strip and nothing is taken away.
- **Two children on the same draw are each paid their own way**, which the old
  per-tournament scheme could not express at all — and the season's total keeps
  them apart too. Two children's winnings added together is a number nobody
  settles up with, since they are paid one at a time.

Schemes already set on a tournament keep working — they are read as exceptions,
so nothing needs moving by hand.

## [2.7.1] — 2026-09-01

### Fixed

- **"Add a tournament" came apart on an iPad.** The tournament link drew itself
  as the browser's own dark box — it is a `url` field, and the rule that styles
  every control named `date`, `time`, `text` and `number` but never `url`, so it
  was the one field left to Safari's taste. It now matches the fields around it.
- **The date fields sized themselves.** iOS measures a date field from its
  native control rather than the space it was given, so Starts, Ends and Entry
  deadline stood off the line their neighbours kept. They are held to the same
  height and the same edges as every other field now.
- **A field could push past the card it sits in.** A field in a row is at least
  as wide as its contents unless something says otherwise, and nothing did — so
  on a narrow screen the row ran off the side rather than folding. It folds.
- **The six fields no longer land five and one.** A tablet's width fitted five
  across and left Entry deadline alone on the next row. Below the desktop layout
  they settle into even rows: three across on a tablet, two on a phone.
- **Add tournament had been a field with no label**, stretched to a column's
  width and left on a row of its own. It is a button on its own line now.

## [2.7.0] — 2026-09-01

A win should be worth something.

### Added

- **Rewards on a tournament.** Press **Rewards** on any row and say what it
  pays: so much a win, so much for 1st, 2nd or 3rd, and a bonus for beating the
  last count. A free-text line carries the format — *red ball, played in group*
  — which is shown but never paid. The scheme hangs off the tournament, so it
  works on an imported STA event too, which is read-only in every other respect.
  `data/matches.json` can suggest one; anything set in the browser wins.
- **Results, and the arithmetic behind them.** Each child who is entered or
  confirmed gets a **Wins** and **Place** box under the tournament, and the
  payout adds itself up in front of them — *$55 · 4 wins $20 · 2nd $30 · beat 3
  $5*. The sum is always shown in full, because a child should be able to see
  how the number was reached.
- **"Beat last" knows what last was.** The bonus measures against that child's
  most recent *earlier* tournament with a win count on it, not simply the
  previous tournament, which they may not have played. Nothing earlier on file
  means nothing to beat, and no bonus. This is the reason results are stored at
  all.
- **Two more season checks.** A finished tournament nobody has entered a result
  for is chased, and the season's reward total is reported.

### Notes

- Nought wins is a real result and is kept as one. An empty box means *not yet
  entered* — the two are stored differently, so a bad afternoon is never
  mistaken for a missing one.
- Schemes and results travel with the plan: they are in the backup file and go
  over sync like everything else.

## [2.6.1] — 2026-08-31

### Fixed

- **A Home Screen app looked like it had lost the plan.** Add the planner to an
  iPad's Home Screen and it runs as its own browser with its own storage, seeing
  nothing of what Safari saved — so it opened on the default plan even though
  Safari on the same device was synced. Nothing was lost, but nothing said so.
  It now explains itself, and says the one thing that works there: paste the
  link. Scanning cannot help, because a scanned link opens the browser rather
  than the Home Screen app.
- **The code box now takes the whole link**, not just the sixteen characters.
  That is what "Copy link" puts on the clipboard, and on a second device the
  link is usually the only thing that arrives. A link with no code in it is
  still refused rather than half-read.

## [2.6.0] — 2026-08-31

Nobody wants to type sixteen characters into a phone.

### Added

- **A QR code.** Turn sync on and the page draws one. Point the other device's
  camera at it and the planner opens already joined — nothing typed, nothing
  read out. Typing a code still works and is unchanged.
- **Copy link**, for when the other device is not in the room: the same join in
  a link you can send to yourself.
- The code travels in the URL **fragment**, which browsers never send to a
  server, and the page clears it from the address bar the moment it is read —
  so it does not sit in history, survive a reload, or land in a bookmark.
- The link still **asks before replacing** the plan on the device that follows
  it, exactly as typing a code does.

### Notes

- The QR encoder is written into the page rather than pulled from a CDN: byte
  mode, error correction L, versions 1 to 5. Those five all use a single
  error-correction block, which is what keeps it to a screenful — a sync link
  is about sixty characters and fits version 4 with room to spare.
- It is verified by decoding: the tests read the page's own rendered code back
  with a scanner and check the link that comes out.

## [2.5.0] — 2026-08-31

Sync worked; joining it did not. Both of these came straight out of using it on
two real devices.

### Fixed

- **Pressing "Turn on sync" on the second device started a second plan.** The
  two buttons sat side by side as equals and the note only said to "enter that
  code on your other device" without saying where. Both devices ended up with a
  code of their own, syncing happily to nothing. The note now names the button
  to press — *press "Use a code", not "Turn on sync", that starts a second
  plan* — and the off state explains the two halves before you pick one.
- **A device that made that mistake could not undo it**, because "Use a code"
  disappeared the moment sync was on: you had to work out that you must stop
  syncing first. It now stays, reading **"Use a different code"**, so a device
  can be pointed at the right plan directly.

### Added

- **A tab left open catches up.** Coming back to the page checks the server, so
  the laptop that has been open since breakfast picks up what the phone did.
  Not on every alt-tab — at most once every ten seconds — and never on top of a
  conflict waiting to be answered.
- **Joining asks first.** Taking a code replaces this device's plan, which has
  no undo, so it now says how many blocks are about to go and suggests a backup.

## [2.4.0] — 2026-08-31

One plan on two devices, without an account to keep.

Nothing leaves the browser until you turn sync on, and existing plans load
exactly as before — they simply have no `updatedAt` yet and get one on the first
edit. An older backup restores as it always did: it carries no stamp either, so
restoring one makes it the newest copy, which is what then goes to the other
device rather than the other way round.

### Added

**Sync**

- **A sync code instead of a login.** One device generates a random
  16-character code; you type it on the other; from then on every change goes up
  and every load comes down. No email, no password, no third party.
- **The server never sees the code.** It stores the plan under the SHA-256 of
  it, so what leaves the browser cannot be turned back into a code. That also
  means nobody can recover a plan for you — the code is the only key, and the
  page says so where you first see it.
- **A newer plan wins, and a conflict is asked about rather than resolved.** If
  the other device saved while this one was holding a change, the push is
  refused and the server's copy comes back: *take their copy*, or *keep mine*
  and overwrite. Nothing is lost silently either way.
- **`/api/plan`**, a serverless function that takes a Redis store in whichever
  shape Vercel hands it over: a `REDIS_URL` connection string, or a REST url and
  token from a marketplace store. REST needs nothing but `fetch`; the connection
  string pulls in the `redis` client, imported only on that path. Connecting a
  store is the whole of the setup — including the name it arrives under, since
  Vercel prefixes a store's variables with the store's own name and the function
  takes the prefixed form as readily as the plain one.
- Without a store configured the function answers 503 and says so; the planner
  carries on working locally, which is also what happens offline — the code
  stays on screen, the plan stays in the browser, and the next change retries.

### Changed

- The state now carries **`updatedAt`**, which is what decides which device is
  ahead. It travels into a backup file too, so a restored backup knows its own
  age.
- The data note no longer says your plan cannot follow you to another device,
  because now it can.
- `vercel-deploy/package.json` arrives with it, holding the one dependency in
  the project. The page itself is still a single file that needs nothing.

## [2.3.0] — 2026-08-31

Three things a full day made awkward: a palette you had already scrolled past,
blocks that looked like the sessions they were meant to sit beside, and a rest
that took the whole day whether you meant it to or not.

Existing plans gain rather than lose. A rest day loads as a rest morning with
the afternoon and evening open, and a plan that had a session beside a rest now
keeps both instead of dropping the session on load.

### Added

- **The palette follows you down the page.** It pins itself to the top of the
  window and shrinks to the chips alone, so a session is always in reach — you
  could not drag one onto the second week without scrolling back up for it, and
  on a phone you could not see which chip was armed. On a narrow screen the
  pinned row scrolls sideways rather than stacking three rows deep.

### Changed

- **Rest marks a slot, not the whole day.** It used to take the day it landed
  on and paint over everything in it, so there was no way to say "the morning is
  free" — and no way to keep a rest beside anything else. It is now an ordinary
  entry that happens to mean nothing is booked: it clears the slot it lands on,
  leaves the other two alone, and gives way to whatever is dropped on it. A day
  marked rest with nothing else booked still reads as a rest day in the totals
  and the load checks, and is marked by a rust edge and day label rather than
  the wash of colour across the whole card that used to say the same thing.
- **Non-training blocks no longer have to be read to be told apart.** A Study /
  other block is now teal, on a hatched surface, with its name in a quieter
  colour — against the flat cards and solid accents of a real session. The
  palette chip is drawn the same way, so what you pick is what you get. The
  difference used to be a dashed left edge you had to look for.

## [2.2.0] — 2026-08-30

The training grid now says *when*, not only *what*. A day is three slots; each
slot holds as much as the day really holds; every session carries its own start
time and its own length; and there is finally somewhere to put the hours that
are not training at all.

Existing plans load unchanged. A session saved without a time keeps its slot and
simply says so until you give it one, a slot that held one session becomes a
stack of one, and the retired 1.5h private type loads as an ordinary private of
that length.

### Added

**An exact time on every session**

- **Three slots a day** — morning, afternoon and evening — instead of two, so a
  study block can sit alongside training rather than displacing it.
- **Placing a session asks when it starts.** The slot's usual time is filled in
  (09:00, 14:00, 17:00), so accepting it is one keystroke, and the grid then
  shows the real window: `09:00–10:00 · 1h`. The end time follows from the
  session length.
- **Click the time on any placed session to change it.** Dragging a session to
  another slot keeps the time it already has — a move is not a re-booking.
- A session may carry **no time at all**; it stays in its slot and says so.

**A length on every session, not on the chip**

- **One Private chip instead of two.** The length now belongs to the session,
  set in the same dialog that asks for the time, so a 45-minute fitness block or
  a 90-minute group needs no chip of its own. The palette is five chips.
- The dialog **fills in the usual length** for the chip you placed — 1h, 2h, 1h
  — so accepting it is still one keystroke, and the length can be changed later
  from the grid the same way the time can.
- Quarter hours, up to 12. An impossible length falls back to the chip's usual.
- **`p15` still reads.** A plan saved with the old 1.5h private type loads as an
  ordinary private of that length.

**More than one thing in a slot**

- **A slot holds a stack, not a single session.** A morning can be a private and
  then physical; an afternoon can be school and then a lesson after it. Placing
  a second session adds to the slot rather than taking it over.
- The stack is **kept in clock order**, however it was entered, and each slot is
  capped at four — past that a day is a mistake, not a schedule.
- A filled slot keeps a **`+ AM`** strip under it: that is what you tap or drop
  on to add another, and it is what marks where one slot ends and the next
  begins. Dragging one session out of a stack leaves the rest where they were.

**Blocking a slot that is not training**

- A **Study / other** chip takes your own label and length — study, school, a
  piano lesson — and holds the slot for that time.
- **It never counts towards the load.** Daily hours, weekly totals and the block
  total all ignore it, so blocking out an afternoon does not make the week look
  heavier than it is, and a day of nothing but study still reads as a rest day.

**A clash check**

- Two things booked over the same hour is now called out by name — including
  two inside the same slot. Hour caps could never catch this: a day can be
  over-booked without being over-loaded.

### Changed

- **The 1.5h private chip is gone**, replaced by the length field above. Nothing
  is lost — existing 1.5h sessions load unchanged.
- The **suggested plan** puts the second tennis block of a day in the evening
  rather than straight after lunch, which is what its own load check has always
  advised. The total is unchanged.
- The **text export** carries the times: `AM 09:00–10:00 Private 1h`.

## [2.1.0] — 2026-08-07

Two kids, properly. Tournaments now know which child can enter them, and there
is finally a way to get your data off one browser.

No migration: existing plans load unchanged, and a child without a birth year
keeps behaving exactly as before.

### Added

**Per-child age groups**

- Each child has a **birth year**, which sets their age group (U10, 14&U, 16&U,
  Junior). Ages follow the Singapore convention — the age reached during the
  season year, so 10&U in 2026 means born 2016 or later.
- **A tournament only offers the children who can enter it.** A U10 event shows
  the nine-year-old alone; a 16&U event shows the thirteen-year-old alone; an
  event with no age group in its title shows everyone. A child is offered their
  own group and one above it, since juniors play up a group but do not enter
  every event they are technically old enough for.
- **A "Show" filter** — Everyone, or one child — above the tournament list, once
  there is more than one child.
- **The STA import is scoped by child** rather than by raw age group: tick the
  children, and eligibility is judged per tournament against the year it runs
  in, so a child ageing out between seasons is handled correctly.

Two rules stop this hiding anything that matters. A child who already has a
status on a tournament is **always** shown, whatever the age rules say — a
recorded decision must never become unreachable. And a child with no birth year
is shown everywhere, so nothing disappears until you say how old they are.

**Backup**

- **Download backup / Restore backup.** One dated JSON file carries everything:
  training blocks, kids and birth years, tournaments and entry statuses. A data
  bar under every view shows what is stored.
- Restore validates before replacing anything and confirms, naming what it is
  about to restore. A file that is not valid JSON, not a planner backup, or
  unreadable is refused with a reason and **nothing is changed**. A bare state
  object restores as well as the wrapped export, and a backup of an empty
  planner restores as empty rather than silently reloading the suggested plan.

Worth knowing why this exists: `localStorage` is per-browser, so a phone and a
laptop share nothing, and **Safari clears script-writable storage after roughly
a week without a visit** — a plan left unopened can simply vanish. The file is
the durable copy, and the way to move a plan between devices. The page now says
so instead of leaving you to find out.

### Fixed

- **Pasting a link to a tournament that is not yet in STA's tournament list now
  works.** The lookup searched `GetTournamentList`, which omits competitions
  that are published but not open for entry — the Red/Orange/Green events linked
  from `/red-orange-green` are a standing example, and
  `sta-spex-u10-red-competition-viii-2026` returned "No STA tournament matches".
  It now resolves the slug directly via `Tournament/GetTournamentInfoBySlug`,
  which is unauthenticated and CORS-open like the list endpoint, and needs one
  request instead of fetching all 122 rows.
- **Venue is filled in.** An earlier note claimed STA did not publish it
  anywhere; that was wrong — the list endpoint omits it, but the by-slug
  endpoint carries it. The lookup no longer tells you to add it by hand.

### Removed

- **The JTTL scraper and the whole `tools/` folder** — `scrape-jttl.mjs`, its
  parsers, snapshots, tests and `build-matches.mjs`.
- The 6 provisional JTTL Season Two weekends it had generated.
  `data/matches.json` ships empty again.

Tournaments now come from the STA import, a pasted STA link, or hand entry — all
in the browser. The `matches.json` feed still works and is still read at load; it
is simply hand-edited now rather than generated, and the README documents its
shape. The 2.0.0 entry below is left as it was: `tools/` genuinely shipped then.

### Tests

291 assertions, up from 223 at 2.0.0 — covering the eligibility rules, the who
filter, the by-slug lookup including a tournament missing from the list, and the
backup round trip with four rejection cases.

## [2.0.0] — 2026-08-07

The two-week camp planner becomes a **season planner**. Three views — Calendar,
Tournaments, Training — so a year of matches, training and school holidays can
be seen together and travel booked around them.

Breaking: state moves to a new `localStorage` key. See **Migration** below —
existing plans are carried over and the v1 key is left untouched.

### Added

**Calendar** (the landing view) — twelve months on one page, with year
navigation.

- One dot per child on every tournament day, in that child's colour, so the
  calendar says *who* is playing when. A tournament nobody has committed to yet
  shows a grey dot; a child who is skipping shows none. Tooltips name each child
  and their status.
- Training blocks as a yellow left edge.
- Singapore school holidays as the day background — vacations green, public
  holidays amber.
- "Holidays this year", longest first, each marked clear or with the number of
  tournaments inside it. That is the travel-planning list.
- The legend is built from your actual kids.

**Tournaments**

- Kids: add and remove children, each with its own colour.
- Tournaments with dates, venue, categories and entry deadline, grouped by month
  and sorted; past ones dim.
- Per-child entry status on every tournament, cycling planned → entered →
  confirmed → skipping → not going.
- **Paste an STA tournament link** and the name, dates, entry deadline and
  categories fill themselves in. Fires on paste, on Enter, or from the button.
  The link is kept on the row.
- **Import the whole STA calendar**, filtered by age group — U10, 14&U, 16&U,
  Junior — other, Adult / Open — with "Upcoming only" on by default. Re-import
  is a no-op; tournaments are matched by STA id.
- Season checks: an entry deadline inside 21 days that nobody has committed to,
  the same child in two overlapping tournaments, provisional dates, and the
  longest clear gap between tournaments.
- A tournament falling inside a training block is labelled with that block's
  name, so build-up blocks are visible from the list.

**Training**

- Multiple named blocks: create, rename, switch, delete. A new block starts the
  day after the previous one ends.
- Variable length, 1–60 days (was a fixed fortnight).
- Per-week totals as 7-day chunks from the block start, so any length reports
  sensible weekly loads.
- On-court days and rest days in the header readout.

**Data and tooling**

- `data/matches.json` — generated tournament feed, read at load and merged with
  locally held tournaments. Ships with the **6 provisional JTTL Season Two
  weekends**, built from the scraper output.
- `tools/build-matches.mjs` — merges the scraped fragments in `tools/data/` into
  that feed. Finished fixtures are dropped by default (`--all` keeps them):
  JTTL publishes every team fixture in every division — 222 for one past season
  — and shipping those buries the dates you can still plan around. Provisional
  records are always kept, and the build refuses to write an empty feed.
- Provisional tournaments show **why** their dates are estimates, e.g. "Draw not
  yet published; weekend spacing taken from 2025 Season Two", rather than a bare
  badge.
- `data/sg-school-holidays.json` — Singapore MOE school calendar for 2026 and
  2027, hand-entered from the MOE press releases with source URLs and a
  `verifiedOn` date. Add a year when MOE publishes one.
- `tools/` — the JTTL scraper, producing 222 real fixtures plus projected
  weekends for an unpublished draw.
- `tests/` — jsdom harness, committed and runnable with `npm test`. 223
  assertions, up from nothing in the repo at 1.0.0.
- `.gitignore`.

### Changed

- Tabs run Calendar, Tournaments, Training, with **Calendar as the landing
  view**. They are 22px in a 152×53 target, and the active one carries a tinted
  background as well as an underline.
- Storage moves to `tennis-season-v2`, holding `blocks[]`, `players`,
  `entries`, `manualMatches` and `trips`.
- Blocks carry an inert `anchorMatchId`, ready for match anchoring.
- The weekly-load check only judges a **full** 7-day week, so a short tail is
  not reported as if it were under target.
- The suggested plan fills only the days that fit a shorter block.
- Week totals split 7/7 from the block start, replacing 1.0.0's 8/6 split which
  had encoded calendar rows for a Saturday arrival.

### Fixed

- A new block's start date is computed from local date parts. `toISOString()`
  would have shifted it a day earlier anywhere east of UTC — including
  Singapore, where this is used.
- Locally held tournaments keep their source, so an imported STA tournament no
  longer loses its badge on reload.
- Tournaments can be deleted whether they were typed in or imported; the delete
  control previously keyed off `source === 'manual'`.
- A cold boot persists its default block immediately rather than on first edit.
- Only `http(s)` URLs are rendered as links; a stored `javascript:` URL is
  stripped rather than made clickable.

### Migration

A 1.0.0 plan under `tennis-camp-plan-v1` is folded into a single block named
"Camp plan", keeping its start date and sessions. **The v1 key is left intact**,
so rolling back to the 1.0.0 deploy still finds its data.

### Note on an earlier finding

`findings.md` originally concluded that STA had no usable public API and that a
static page could never read it. That was wrong: the API host is injected at
runtime, so it is absent from the JS bundles, and one browser network trace
found it. `api.singtennis.org.sg` answers an unauthenticated `POST {}` and sends
`Access-Control-Allow-Origin: *`. The correction is recorded in `findings.md`
with the original conclusion left visible. JTT still sends no CORS headers,
which is why its scraper remains.

## [1.0.0] — 2026-08-05

First deployable release. The baseline is the original single-file planner that
ran inside a Claude artifact sandbox; this release makes it a standalone static
site that works on any host.

### Added

- `vercel-deploy/` — the deployable site: `index.html` (the whole app) and
  `vercel.json` (cache and security headers).
- Plan persistence via `localStorage`, keyed `tennis-camp-plan-v1`. The arrival
  date is saved alongside the plan.
- Saved state is validated on read: unknown session types, malformed days, and
  unparseable blobs are rejected and the suggested plan loads instead.
- Favicon (inline SVG, no extra request), meta description, `theme-color`, and
  Open Graph tags.
- `<noscript>` notice for browsers with JavaScript disabled.
- README covering local use, deployment, and the configuration constants.

### Changed

- Week totals now split 7/7 from the arrival date. They were previously days
  0–7 and 8–13, an 8/6 split that encoded the calendar grid rows for a Saturday
  arrival. Totals are unchanged for the suggested plan, since the boundary day
  is a rest day either way.
- The date `<label>` is associated with its input via `for`.

### Fixed

- **Plans were never saved.** Persistence called `window.storage`, a
  host-provided API that does not exist in a browser, so every write silently
  failed and plans were lost on refresh.
- **The header date range was hardcoded** to `21 Nov – 4 Dec` while the arrival
  date was editable, so the title went stale as soon as the date changed. It is
  now derived from the arrival date.
- **The calendar only aligned for a Saturday arrival.** The leading blank count
  was hardcoded to 6 and the trailing count to a fixed grid size, so any other
  arrival weekday placed days under the wrong columns. Both are now computed
  from the arrival date.
- `place()` now ignores unknown session types rather than writing them into the
  plan.

[2.6.1]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.6.1
[2.6.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.6.0
[2.5.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.5.0
[2.4.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.4.0
[2.3.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.3.0
[2.2.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.2.0
[2.1.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.1.0
[2.0.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v2.0.0
[1.0.0]: https://github.com/miaolin/tennis_trainining_planner/releases/tag/v1.0.0
