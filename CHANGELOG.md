# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.29.0] — 2026-09-12

### Added

- **A purse can be settled by hand.** A rewards scheme covers a season and not
  every afternoon in it. A draw abandoned after two rounds, a consolation event
  nobody wrote terms for, a fiver promised on the way to the courts for
  something no scheme could have foreseen — the arithmetic is right and the
  answer is still wrong, and the only person who can say so is the one paying.
  Until now the only ways to say it were to distort the result until the sum
  came out right, or to pay a different number from the one on the screen and
  hope somebody remembered why.

  **Adjust** now sits on every child's result row, on every tournament rather
  than only the ones that pay: a tournament no scheme reaches is exactly where a
  figure set by hand is the only figure there can be. It opens on that one child
  at that one tournament and leads with what it is about to overrule — *The
  scheme works this out at $40 — 4 wins $20 · 1st $20* — because a revision
  nobody can see the before of is not a revision, it is just a number.

  Two boxes, both plain ones you write in: the reward itself, and a short
  reason. The reward box starts empty rather than pre-agreeing to anything, with
  the worked-out figure waiting in it as a placeholder, so paying a fiver over is
  a number to read off rather than arithmetic to do in your head. It takes an
  amount written the way money is written — a dollar sign and a thousands comma
  come off — but what is left has to be a number and nothing else, since
  parseFloat would read *45ish* as 45 and a reward nobody meant is the thing the
  dialog exists to prevent.

  What is saved is what is paid, and the scheme is not asked again for that
  child at that tournament — a later win must not quietly undo a decision
  somebody made. But the row keeps saying what the scheme *would* say now, so
  the revision never hides what it replaced: *$45 · set by hand · played the
  last two with a sprained wrist · not $50 as worked out*. The same line goes
  into the spreadsheet's **How** column, so a season opened in Numbers next
  April still accounts for itself.

  **$0** is a figure and not a blank. *This one pays nothing* is a real answer
  and it is kept as one, which is the difference between a hand-set purse and a
  scheme line left empty. Emptying the pay box, or **Back to the scheme**, hands
  the arithmetic back.

  The revision rides on the child's entry beside their wins and place, so it
  survives a reload, travels in a backup and reaches the other device on sync —
  and it changes nothing about the result it sits over. Overruling a purse is
  not rewriting an afternoon.

### Changed

- **A session's length is picked from a list.** The start time on a tablet is a
  wheel you spin; the length beside it was a box you typed a decimal into, which
  is the harder of the two by a long way and the only one where a thumb can
  produce *15* where it meant *1.5*. It is now a picker like the time, so both
  halves of the dialog are answered the same way.

  The list is quarter hours through the range sessions actually live in, halves
  to four, and whole hours after that — a piano lesson is 45 minutes and a
  school day is six hours, and nothing in between them is ever set to the
  quarter of an hour. Lengths read as lengths, *1.5h* rather than *1.5*, so the
  label no longer has to say what unit it wants.

  The list is now the validation: an impossible length is not something that can
  be chosen. `roundHrs` still stands behind it for lengths arriving from a saved
  plan or an import. A session already carrying a length the list does not offer
  keeps it — it is added to the list rather than dropped, because the box has to
  say what the session actually carries, the same bargain the draw-type picker
  strikes with a tag nobody else uses.

## [2.28.0] — 2026-09-11

### Added

- **A plan is not a booking, and now says so.** Everything on the training grid
  is something you are proposing to a coach who has not yet agreed to it, and
  a calendar that drew an asked-for session exactly like a settled one was
  telling you the fortnight was arranged when half of it was still a question.
  Every session the coach runs now carries the state of that conversation. A
  proposed one is drawn as a draft of a session: emptied of its fill, outlined
  in dashes rather than edged in colour, its colour bar gone and the whole card
  faded, so a cell of them reads as unfinished from across the room. An agreed
  one keeps its full colour bar and gains a faint wash of green behind it, so a
  settled day reads as a run of solid cards rather than as the absence of
  dashes. None of it depends on a mark small enough to fit a shared lane on
  Everyone, because in a shared lane no mark fits — the card has to be the
  thing that says it.

  The colour bar going is deliberate: on Everyone the lane a card sits in and
  the tally beneath it already say whose session it is, and a bright stripe was
  the single thing making an unanswered card look as settled as an answered
  one.

  The dot on each card is both the answer and the button that gives it: a ring
  while the session is only asked for, filled with a tick once it is agreed. It
  sits on the name line rather than in the corner beside the remove button,
  where a mis-aimed thumb would be deleting a session instead of confirming
  one. The coach agrees to them one at a time — a Tuesday private but not the
  Thursday one — so this is per session, and a whole day can be taken in one
  click from its date for the call where he says yes to all of it.

  Study, school and rest carry no status at all rather than one that is always
  the same: neither is his to agree to, and marking them would make *three of
  five confirmed* a number about nothing.

- **A session that moves asks the question again.** He said yes to Tuesday
  morning; dropped on Thursday, or moved from nine o'clock to eleven, or grown
  from an hour to ninety minutes, it is a new question — so the tick comes off
  rather than following the session across and having the calendar claim an
  agreement nobody gave.

- **What is still outstanding, said in words.** The load check ends with how
  many sessions have not been agreed yet, so you know whether there is a call
  still to make without counting dots across a fortnight. It is deliberately
  last and deliberately not part of the judging above it: a plan nobody has
  agreed to can be a perfectly balanced plan, and this is the state of the
  conversation, not of the week.

- **The pasted plan ticks what is settled.** *Copy as text* is the message the
  coach is actually sent, which makes it the last place to be coy about what he
  has already said yes to — agreed sessions carry a tick, the bare lines read
  as the question they are, and a closing line counts what is left. A printed
  plan marks them too, in ink rather than colour, and spells out *(to confirm)*
  because a page is read away from the app that would otherwise explain it.

### Changed

- Hours are unchanged by any of this. An unconfirmed session counts towards the
  day and week totals exactly like an agreed one: it is the load you are
  proposing, and the warning about a heavy week is only useful while you can
  still redesign it — which is before the coach is asked, not after.

- On Everyone, the state shows but does not change: it is the tab you look at
  to see whether the fortnight is settled, and answering belongs where the
  session can also be moved and removed. A shared lane is about sixty-five
  pixels and will not hold a mark and the word *Private* on one line, so there
  the mark comes off with the name and the length — the unfilled, dashed card
  is doing the saying, and the hover carries the word.

- The tally under each day of the shared calendar now names the children in the
  order their lanes run above it, rather than the order the blocks happened to
  be written in, which had Olivia's hours sitting under Ian's column.

## [2.27.0] — 2026-09-10

### Changed

- **Everyone is one calendar rather than a list of blocks to pick between.** Two
  children in the same camp were two chips reading *Camp plan · 26 Nov – 8 Dec*,
  and telling them apart meant reading the dot. Worse, the tab that exists to
  show the family showed one child at a time anyway: seeing whether both were on
  court on Thursday morning meant switching tabs and holding the fortnight in
  your head. Every block is now drawn onto a single grid — a shared morning has
  both children in it, ordered by the clock rather than by whose block was
  written first, and coloured by whose it is rather than by the type of session,
  because stacked against a sibling's morning the type is the thing the words
  can carry and the owner is not.

  Hours are not merged, and never will be: two bodies averaged into one figure
  describe neither. The foot of each day lists the children side by side, each
  read against their own age ceiling, and the readout above counts days instead
  — *planned*, *out*, *clear* — the diary being the thing a family actually
  shares. Season totals stay one chip per child.

- **A slot is a row, not a stack.** Each child gets a lane in it, in the order
  of the strip above, so a child keeps the same side of every cell all the way
  down the calendar and a morning is read across rather than down. It halves
  the height of a day two children are both out on, and a lane with nothing in
  it is left empty on purpose — that gap is the answer to *is anybody free*.

  A shared lane is about sixty-five pixels, so the card gives back what it can:
  the name, its dot and the session length come off, leaving the type and the
  hours it runs. The lane it sits in and the foot below — which names the
  children in the same order — have already said whose it is, and the hover
  carries the whole line. Alone in a cell, or on a phone where a day is the
  full width, all three come back.

- **The load checks are said under the name they belong to.** Everyone runs them
  once per block and prefixes each with the child, so the same 4h day can be a
  heavy one at nine and an ordinary one at thirteen on the same screen.

- **Weeks nobody trains collapse to a rule saying how many there were.** A camp
  in June and a camp in March are one calendar rather than three empty months
  scrolled past. A block names itself once, on the day it starts, rather than on
  all thirteen of its days.

- The chip bar and the session palette come off Everyone, having nothing left to
  switch between or drop into. A block is still written on the tab of the child
  it is for, which is where its age, its ceilings and its owner already live.

- Printed pages set the session names, the day hours and the week totals in ink
  rather than in the screen's near-white, which was invisible on paper.

## [2.26.1] — 2026-09-09

### Changed

- **The block bar reads left to right as what the block is, then what to do with
  it.** The name box is a name box again rather than whatever width was left
  over, and the slack in the row sits between the dates and the actions.

- The owner picker, which only appears for a block filed under nobody, lost its
  *Whose* label: reading *Nobody yet* is the question.

## [2.26.0] — 2026-09-09

### Changed

- **Everyone reads; a child's tab edits.** Every question the block bar puts is
  about one child — whose week this is, what it is called, when it ends — so it
  has no business on the tab that shows all of them at once. The overview keeps
  the blocks, the plan and the load figures; it no longer offers the bar.

  *+ New block* goes with it. A block made on Everyone would belong to nobody,
  and a block filed under nobody has no age to read a load ceiling from, so a
  block is started on the tab of the child it is for.

## [2.25.0] — 2026-09-09

### Changed

- **A block is no longer asked whose it is when it already knows.** The tab a
  block is read on names the child, and the line under the title says it again
  — a picker that only repeats them is one more thing to read on a bar that was
  already full. A block made on a child's tab is theirs, and *Copy to…* is how
  one gets to the other child.

  The question is still put to a block filed under nobody: one left behind by a
  child who has gone, or one saved before the page knew about children at all.
  Age is what the load ceilings are read from, so an unclaimed block is a real
  question and not a tidiness one.

## [2.24.1] — 2026-09-09

### Fixed

- **Every child is asked the same questions about a block.** A child with no
  block of their own was still shown the bar, holding the last block's name and
  dates — somebody else's camp, presented as theirs, and presented without the
  two controls that would have said whose it was. The bar describes a block, so
  with no block there is now no bar: the page says there are none for this child
  and offers to start one. When they do have one, they are asked exactly what
  the other child is asked.

### Changed

- **The block bar holds one row again.** *Copy to…* was one control more than it
  had room for, and the wrap left *Print* and *Delete block* stranded on a line
  of their own. It is packed a little tighter now, and the name field gives up
  its width first — it is the one thing on the bar the heading below already
  says.

## [2.24.0] — 2026-09-09

### Added

- **A plan written for one child can be copied to the other.** The weeks a
  block runs, the days it rests, the shape of a build-up — none of that is
  different because the child is. What differs is an hour here and a session
  there, which is an edit rather than a second afternoon's work.

  *Copy to…* in the block bar offers whichever children the block does not
  belong to, and lands the page on the copy, filed under its new owner and
  ready to be changed. It is a copy and not a link: the two go their own ways
  from the moment it is made, which is the whole point of making one.

## [2.23.1] — 2026-09-09

### Changed

- **A block is asked for by the day it ends, not by a number of days.** A camp
  runs to the Sunday; nobody counts that it is thirteen days long and types
  thirteen. It is still *stored* as a length, which is what the grid and every
  check are counted in — only the question changed.

  The last day counts, so a block ending the day it starts is one day long.
  Neither end can be dragged past the other, sixty days is as far as the box
  will offer, and an emptied or impossible date leaves the block as it was.

- **The block bar keeps to one row**, which it now has room for.

### Removed

- **Load suggested plan.** The built-in fortnight is laid down once, on the very
  first plan, and nothing offers to lay it down again: by the time anyone would
  think of pressing such a button the plan is their own work, and the button's
  whole effect is to throw it away.

## [2.23.0] — 2026-09-09

### Added

- **A child can be renamed.** It was the one thing about them the app had no way
  to change, so correcting a name cost the child themselves: removing and adding
  again takes their entries, their results and every list naming them with it.
  The name is a field on Setup now, beside the birth year.

  Worth doing, not merely possible: a scorecard and an STA draw both name a
  child in full, and *Ian Lin* is matched against those where *Ian* ties with
  every other Ian in the draw — which happens, and which the reader then refuses
  to guess between.

  Renaming keeps the child. Their entries, their results and every list naming
  them are held by who they are rather than by what they are called. Emptying
  the box puts the old name back: a child with no name is nobody.

## [2.22.0] — 2026-09-09

### Added

- **A Summary at the top of the season**, a line per child: tournaments they are
  in, results written down, matches won, and what it has paid. It follows the
  filters, so a year picked is a year summed, and it keeps the purses apart —
  two children's winnings added together is a number nobody settles up with.

  The season check says what wants *doing*; the summary says where things
  *stand*. They are the two halves of one glance, so one reads above the list
  and the other below it.

### Changed

- **The season check is part of the summary**, under the figures rather than in
  a box of its own. Where the season stands and what it still wants are one
  thought — the summary says a child has two results, and the line beneath says
  a third is owed. Two headings made them read as two subjects. It no longer
  totals what was earned either: the figures above say it once and in more
  detail.

- **The rewards schemes show with All players and not with one child.** A scheme
  is the terms the whole family plays on, so it reads with the whole family;
  filtered to one child the question is how their season is going, and the terms
  are not part of it.

- **The filter reads All players** rather than All children.

## [2.21.0] — 2026-09-09

### Changed

- **The season is one page, and the tabs are filters.** There was a tab per
  child and an **Everyone** that could be read but not touched — so the one view
  where both children's weekends could be seen against each other was the one
  view where nothing could be corrected. Every edit belongs to a child, but that
  is an argument about which row a change lands on, not about which page it can
  be made from.

  Everything is on one page now and all of it is editable. The strip becomes a
  filter by child, with a filter by year beside it once the list runs to more
  than one season. A filter narrows what is shown and changes nothing about what
  may be done, which is the whole difference between a filter and a mode.

- **The season reads newest first.** It is read from the end it is happening at:
  the next weekend and the last result are the two things worth seeing, and both
  are at the top this way round.

- **What is finished folds away**, under a line saying how many. It is the
  larger half of a season by the end of a year and the half nobody is looking
  for. It stays as you leave it while the page is open, and a filter change does
  not shut it.

  Setup keeps the order the season runs in and folds nothing: it is a list read
  to find a row and fix it, and that reads better in order.

### Removed

- **Nothing on the tournaments page is read-only any more.** The lock, the line
  explaining it, and the guard every mutator carried against it are all gone —
  there is no state left for them to describe.

## [2.20.0] — 2026-09-09

### Added

- **A knockout draw is read straight off STA.** A group sheet has to be pasted —
  it is a private file belonging to whoever ran the event. A knockout is not:
  STA publish the draw itself, unauthenticated and with
  `Access-Control-Allow-Origin: *`, which is how the page already reads their
  calendar. So on a tournament that came from STA there is nothing to copy at
  all. **Read the draw from STA** in the Results dialog fills in the rounds won
  and the placing.

  Every event of the tournament is read, singles and doubles. A doubles pair is
  read as its two players, so a child is found by their own name either way.
  Qualifying draws are left out: a qualifier is a way into the main draw rather
  than a result of its own, and counting both would pay twice for one weekend.

  **Only a finished run is recorded.** A draw is usually looked at while it is
  still being played — the round after the last one finished is already on the
  page, with both names in it and no winner yet — and a child waiting for that
  match has not gone out in it. Reading the round they merely appear in would
  record them as beaten before they had played, and pay them for it. So a player
  is out where they lost, and still being in the draw is not a result at all. A
  bye is a round nobody won, and does not count as one.

  A paste still wins where there is one: it is the more deliberate answer of the
  two. And if STA cannot be reached the dialog says so and points at the box
  below, which is unaffected.

### Fixed

- **A placing past eighth is spelled properly.** Draws run to 16, 32, 64 and
  128, and the page could only name a podium — *32th* is how you know it was
  written for one and handed a draw.

- **A place can be as far down as 128.** It was capped at 64, which a 128 draw
  quietly exceeds in its first round.

## [2.19.4] — 2026-09-09

### Removed

- **A note is gone from a scheme entirely.** Taking the Format box away left the
  text already written in it still showing on the rewards line — *Red ball,
  played in group* against a group column, saying what the column says. A scheme
  carries figures now and nothing else: an old note is dropped on the way in
  rather than kept out of sight, and `data/matches.json` no longer has a `note`
  to ship with a suggestion.

### Changed

- **The chips naming children are one width.** A column of them stepping in and
  out with the length of each name read as a ragged edge rather than as a list,
  and every row is answering the same question.

## [2.19.3] — 2026-09-09

### Removed

- **The Format line is off the rewards dialog.** Free text that was shown and
  never paid, describing the draw a second time now that a tournament says what
  shape it is with a tag.

  A note already on a scheme is not thrown away with the box: it still shows on
  the rewards line, and `data/matches.json` can still ship one with a suggestion.
  It is simply not asked for any more, and editing a scheme keeps whatever was
  there.

## [2.19.2] — 2026-09-09

### Fixed

- **The tag standing in on the rewards dialog follows the shape.** Picking
  Knockout left it offering *Group*, which is a name for the wrong thing beside
  a knockout column.

### Changed

- **The note under the rewards dialog is four lines shorter.** It explained the
  form sitting above it — what a group pays for, what a knockout pays for, what
  blank means — none of which needed saying twice. What is left is the one thing
  the dialog cannot show for itself: that the knockout bonuses stack.

## [2.19.1] — 2026-09-09

### Changed

- **The draw type is picked, not typed.** Both on the add form and on the row.
  The shapes a season is made of are a short list and the same list every time,
  so choosing from it is quicker than typing — and it is the only thing that
  really stops one tag being written three ways, which a free-text field with a
  suggestion list only discourages.

  **Group** and **Knockout** are always offered, so the first tournament of a
  season is a choice and not a spelling exercise. Anything else in use follows.
  **Something else…** is the way to a shape nobody has used yet: it asks for a
  name once, joins it to a tag already there if the two differ only in case, and
  thereafter that name is on the list like the rest.

  The prompt on the row is gone with it. Untagged is a choice in the list now
  rather than an empty answer to a question.

## [2.19.0] — 2026-09-09

### Added

- **The add form asks what shape of draw it is.** A **Draw type** field beside
  the dates and the venue, answered while the rest of the tournament is being
  typed rather than chased afterwards — which is how a tournament ends up
  untagged and quietly paying nothing. The tags already in use are offered as
  you type, so a season does not drift into three spellings of one thing.

  Left blank it is untagged, which is a state and not a failure to add. The chip
  on the row is still there for changing it later, and for everything the STA
  import brings in, where there is no form to fill.

### Removed

- **Categories are no longer typed by hand.** Nothing there was worth typing:
  the age groups come out of the tournament's name, and who an event is for is
  answered by **For**, which states it outright instead of guessing.

  The field is off the form, not out of the data. A pasted STA link still
  records what STA publishes, and the bulk import always did — both still show
  on the row, and the age rule still reads them.

## [2.18.2] — 2026-09-09

### Changed

- **A tag keeps the case it was written in.** Everything was flattened to lower
  case on the way in, so a chip you typed as *Group* read back as *group* — the
  page speaking with its own accent rather than yours. Now **Group**,
  **Knockout** and *Red ball group* read as written.

  Matching still ignores case, which is the part that matters: *Group* and
  *group* are one tag, not two quietly paying different money. The second
  tournament of a kind joins the first however it is typed, taking the spelling
  already in use — and renaming a scheme is how that spelling changes, carrying
  its tournaments with it.

  Tags written before this get their capitals back on load, but only the two the
  app names itself. Anything you chose is left exactly as you wrote it, that
  being the whole point of keeping the spelling.

## [2.18.1] — 2026-09-09

### Changed

- **The draw-type chip moved to Setup**, beside who a tournament is for. What
  shape a draw is belongs to the event, like its dates and its venue, and Setup
  is where a tournament is answered for at all — so it can be settled as the
  tournament goes on the list rather than chased afterwards.

- **The tournaments view reads the tag instead of setting it.** It shows on the
  row beside the venue, and an untagged one says so outright: that is the case
  where no scheme applies and no money can, and a row that pays nothing has to
  give some account of itself.

## [2.18.0] — 2026-09-09

### Changed

- **A rewards scheme belongs to a shape of draw now, not to a child.** A child
  had one standard and it carried the shape inside it, so a child who played
  both a group and a knockout could only be paid properly for one of them: every
  event of the other shape needed an exception of its own. That is the wrong
  place for the shape to live. A group pays for every match won and for where
  they finish; a knockout pays for turning up and for every rung climbed. Those
  are facts about the draw, and none of them is about whose season it is.

  So a scheme is filed under a **tag**, and a tournament carries one. Two
  children on the same shape play for the same terms; one child across two
  shapes is paid by each. Free text rather than a fixed pair, so a season that
  grows a third kind of event needs no new code.

  Schemes resolve as before, with the middle rung changed:

      tournament exception  →  the tag's scheme  →  a data/matches.json suggestion

- **The tag and the schemes can be set from Everyone.** That tab is read-only
  because every edit on it belongs to whichever child it is about — and neither
  of these does. What shape a draw is belongs to the event; a scheme belongs to
  nobody.

### Added

- **A chip on each tournament row saying what shape of draw it is**, and asking
  when it does not know. Untagged reads as unset rather than as a fault, because
  it is not one — but it does mean nothing is being paid, so it does not read as
  settled either. The tags already in use are offered when a new one is asked
  for, so the second event of a kind is a copy rather than a spelling test.

- **The rewards box counts what each scheme is paying** — *2 tournaments* — so a
  scheme nothing carries is easy to spot, and so is a tag with no scheme behind
  it.

### Migration

Read forward without asking. Each child's standard becomes the scheme for its
shape, and every tournament that standard was paying takes that shape as its
tag, so the same afternoons go on paying the same money.

Two children with standards of the *same* shape is the one case that cannot
survive whole, there being one scheme per shape now: the first is kept and the
second dropped rather than silently averaged. Where the two children played
different shapes — the case this change exists for — both survive.

## [2.17.1] — 2026-09-09

### Fixed

- **A scorecard laid out differently read nobody.** Another draw came back with
  its rows labelled by group and position — D1, D2 — rather than by a bare
  number. The name is taken as the first cell that reads like one, and “has
  letters in it” took D1 for the name, so the numbers came out right against a
  player nobody was called. A label of a letter or two and a number is now
  passed over.

- **A points difference between Won and Rank stopped a headerless block being
  read.** The columns were found by looking for the placing and taking the
  count of wins beside it, and that sheet puts a difference in between. Won is
  now looked for leftwards rather than immediately: it cannot be missing where a
  placing is given, nor larger than the players there were to beat, and a
  difference fails both — negative half the time and outsized when it is not.

- **Two groups pasted together are checked a group at a time.** A header is
  believed unless the placings it produces repeat, which is how a header written
  a cell per player against two-cell rows gives itself away. Across two groups
  they repeat for the best of reasons, each group having a first place of its
  own, and the check was reading them as one.

## [2.17.0] — 2026-09-08

### Added

- **“Use these” takes the figures the rewards dialog is showing.** They are grey
  placeholders and not values, which reads as a form already filled in: press
  Save against them and nothing is stored, every tournament then pays nothing,
  and no row anywhere says why. One press now turns them into real values, to be
  edited or saved like any others.

  Only the lines the shape is showing. A group has no quarterfinal to pay for
  and a knockout no third place, and filling a hidden line would promise money
  for something the draw cannot award. Pick **Knockout** first and it takes that
  column instead — $20 to start, $20 a round, $50 for the quarterfinal.

  It is called *Use these* rather than *Use standard*, which the tournament
  dialog already uses for a different thing: dropping that event's exception and
  falling back to the child's standard. Two buttons reading alike and doing
  differently is a trap of its own.

### Changed

- **The dialog says what the grey figures are.** “The grey figures are
  suggestions and pay nothing until they are taken.” The note had explained
  every line except the one thing that was actually catching people out.

## [2.16.2] — 2026-09-08

### Fixed

- **A tournament row still named the child whose season was being read.** The
  rule shipped in 2.16.1 was written as "with one child", which is the case it
  was noticed in and not the case it is. A family with two children reading one
  child's tab saw that child's name against every row of it — and their tab
  lists only the tournaments they are on, so the name never said anything.

  The rule is now the one that was meant: a row never names the child whose
  season is being read. Who *else* is playing is still named, that being a fact
  about the event rather than about whose season it is, and **Everyone** names
  everybody, which is what that tab is for. With one child there is no tab to be
  on and the whole page is theirs, which comes to the same thing — so the
  original case is covered by the same sentence rather than by counting
  children.

  A tournament nobody is on still says so, whoever is reading. On a single
  child's page that is the only way to see it.

## [2.16.1] — 2026-09-08

### Fixed

- **A scorecard pasted without its header now reads.** It said no player was
  found, which was true and useless: the header naming Won and Rank was what
  aimed it, and that header is the awkward part to select — it sits above a
  merged title and a couple of blank rows, so copying the players alone is what
  the hand does.

  The block can now speak for itself. Down a group **Rank** runs 1, 2, 3 … once
  each, and no column of scores ever does that, scores repeating all the time —
  so the rightmost column whose values are distinct and inside the size of the
  group is the placing, and Won is beside it. A header, where there is one, is
  still believed outright; this only runs when there is none.

  Fewer than four rows is left alone rather than guessed at, two rows being able
  to agree by chance, and the dialog says when the columns were worked out
  rather than read so the numbers can be glanced at before saving.

### Changed

- **With one child, their name no longer appears on every tournament row.**
  Every row is theirs, so the chip said nothing. A tournament nobody is on still
  says so — with one child that is the only way to see it.

## [2.16.0] — 2026-09-08

### Added

- **A tournament's results are read off the sheet rather than typed.** Press
  **Results** on a row, paste the group's scoring matrix, and the wins and the
  place are filled in for every child of yours in it. The dialog says who it
  found before anything is written.

  It reads the header row naming **Won** and **Rank** to learn which columns
  hold the numbers, so it does not have to be told the shape of the sheet.
  Several groups can be pasted at once — each header re-aims the columns for the
  rows beneath it, which is what makes groups of eight and nine both work. A
  name quoted because it holds a comma survives whole. A dash is a player who
  never turned up and is not a nought, so that row is skipped. Tabs and commas
  both read, a spreadsheet copying one and an exported CSV the other.

  Names are matched leniently but not carelessly. *Ian* finds *Ian Lin*, whose
  name it starts, and not *Ho Yin Ian Chiu*, who merely contains it — a real
  pair in a real draw. Two rows tying are named in the dialog and nothing is
  filled in, a wrong result being worse than one typed by hand.

  Whole rows can be selected rather than hunting for the matrix, which is the
  easier thing to tell somebody. That drags in the scorecard's own **RANK**
  column, fifty columns to the left of the matrix's **Won, Rank** pair, so the
  Rank taken is the one that follows Won. The two columns agree in every sheet
  seen so far, which is precisely why choosing between them by position rather
  than by luck is worth the line of code.

- **The link to the draw sits on the tournament's own line**, beside
  *Tournament page*, and is set in the same dialog.

### Changed

- **The result link is the tournament's, not each child's.** A draw is one sheet
  covering everybody in it, so a link per child was one link too many. Any link
  already entered against a child becomes that tournament's.

### Notes

The sheet is pasted rather than fetched, and no amount of work would change
that. It arrives as a private `.xlsx` belonging to whoever ran the event, so
there is no address a page can read. It is a zip of XML, so reading it would
mean shipping a spreadsheet library into a file that has no dependencies at all.
And it carries fifty other families' names, emails and part of their NRIC, none
of which belongs in a planner for one family.

Pasting keeps all three out of the way: the parse happens in the page, nothing
is fetched, and only the matched child's two numbers are stored.

## [2.15.0] — 2026-09-08

### Removed

- **The entry status cycle is gone.** Being on a tournament is now the whole of
  the statement: a child on it is playing it. *Planned → entered → confirmed →
  skipping* asked a question the app could never answer — the entry is submitted
  at the organiser's end, and nothing here could tell whether it had been — so
  all four ever recorded was that somebody had pressed the button the right
  number of times, and then every check in the season had to guess which of them
  counted as going.

  There were two answers to "is this child playing this?" and they could
  disagree. Now there is one, and it is the list the tournament is already on.

### Added

- **A link to the result, per child per tournament.** A **Results** box beside
  Wins and Place takes the address of wherever the draw was published — the
  organiser's sheet, whatever they put it on — and the row then shows a
  **Results** link rather than the address, which is long and says nothing. Only
  http(s) is stored, because it is rendered as a link. Two children at one event
  can point at different draws. It rides along into the CSV as its own column,
  where **Status** used to be.

### Changed

- **Who is playing is set on Setup, and stated on Tournaments.** The chips on a
  tournament row now say who is on it; pressing a name to change it is done on
  Setup. That is not tidiness: a child's own tab lists only the tournaments they
  are on, so taking them off one there would delete the row out from under the
  press, with the chip to undo it gone with it.

- **Taking the last child off a tournament now says nobody is playing it**,
  where before it quietly handed the tournament back to the age rule and put
  them straight back on. An empty list is a real answer and a different one from
  never having said. Such a tournament reaches no child's tab, but Setup lists
  every tournament there is and says which are on no one's list, so it is never
  lost. Removing a *child* still drops the list instead — with them gone it says
  nothing about anybody, rather than saying nobody plays it.

- **A result is kept when a child is taken off a tournament**, not deleted.
  Taking someone off is as often a mis-click as a change of plan, and putting
  them back should not have cost them the afternoon. Until then it counts
  towards nobody's season and appears nowhere.

- **An entry now holds a result and nothing else**, so one recording nothing is
  no longer stored: the tournament's own list is what says who is playing it.
  The season checks, the calendar dots and tooltip, the CSV and the header count
  all read that list now rather than a status.

- Result boxes follow the list rather than an entry, so every child on a
  tournament has somewhere to record how they did — which was always the
  intention, most tournaments paying nothing and being the season anyway.

### Migration

Stored plans are read forward without asking. Wins, places and who is on what
all survive. Two things to know:

- **Anything marked *Skipping* is dropped**, that being the one thing the new
  model cannot say by keeping the row: the child simply appears on the
  tournament again. Press their name on Setup to take them off, which now
  sticks.
- A child who had a status on a tournament whose list named other children is
  added to that list, so nobody falls off an event they were down for.

## [2.14.1] — 2026-09-08

### Changed

- **The two shapes of draw are priced to pay a child about the same.** Each was
  sensible on its own; side by side they paid two children very differently for
  comparable years. A group hands out eight matches and a podium finish every
  time, so its place money was a near-certain payout — while on a 128 draw the
  1st and 2nd lines were decoration, being rungs a child winning one or two
  rounds cannot reach at all. The same afternoon was worth much more in one
  shape than the other.

  Raising a line only moves what a child takes home as often as the line
  actually pays, so the money moved to where each shape reaches. A group gains
  a third place at 10, because the bottom of a podium it stands on every time
  is worth marking and not only the top two. A knockout's quarterfinal rises to
  50 and its 2nd to 80 — the rungs a large draw can genuinely be climbed to.
  Both now come out around the same over a season, while still paying for
  entirely different things: a group pays steadily, a knockout pays for
  surviving.

- **Both improvement lines now read the same on either shape.** A knockout's
  Beat last comes down from 30 to 15 and its Best ever from 50 to 20, in line
  with the group's. Beating your own record is the same achievement whichever
  shape the draw is, and pricing it by format said otherwise.

  Initial prize and per round stay at 20. Turning up is the floor a knockout
  needs, having no guaranteed second match, and a round is worth four times a
  group win because losing one ends the day.

  These are the dialog's grey figures and not values, so nothing already
  entered moves: a scheme a parent has saved is theirs and stays as typed.

## [2.14.0] — 2026-09-06

### Added

- **A tournament left serving nobody is offered up when a child is removed.**
  Deleting a child has never deleted tournaments and still does not: a
  tournament is an event in the world and belongs to the family, not to a
  child — on a list of two it is as likely the other's. But a tournament added
  for one child and narrowed to them is left on a list of nobody the moment
  they go, and until now it simply sat there to be come across later.

  Removing a child now asks a second question where that has happened, naming
  the rows it means. Cancel keeps them. It only ever offers tournaments added
  by hand — one from the STA feed would be back on the next fetch — and it
  offers nothing when the last child goes, because with an empty list every
  tournament trivially serves nobody and a season should outlast a list being
  briefly empty. A tournament any remaining child has a status on is never
  offered, whatever the age groups say: a recorded decision holds a row on the
  list on its own.

### Changed

- **Everything a tournament owns is now dropped in one place.** The **×** on
  Setup and the offer above both go through `dropTournament`, so neither can
  forget the entries, the scheme or the list it was on.

## [2.13.0] — 2026-09-06

### Added

- **A reward scheme now starts by asking the shape of the draw.** *Group* or
  *Knockout*, and each brings its own lines and its own figures to start from.
  A group is priced per match won and down the podium, which is what the dialog
  has always offered. A knockout opens with an **Initial prize** for turning up
  and playing at all, is then priced per **round** won, and stacks bonuses on
  the rungs above that: **Quarterfinal**, **2nd place**, **1st place** — shown
  in that order, bottom rung first, the way the draw is actually played.

  The bonuses stack rather than replace one another, so a child who wins the
  thing is paid the starting money, the round money, the quarterfinal money —
  they went through it — and the 1st place money on top. The quarterfinal pays
  on any finish of 8th or better, since a recorded place is the only evidence on
  hand that they reached the last eight.

  The sum reads back in the child's own words: *$230 · played $20 · 4 rounds
  $80 · quarterfinal $30 · 1st $100*. A knockout counts the same matches a group
  does, but a child who played one talks about rounds, so the breakdown and the
  rewards line both say rounds. It reaches the results `.csv` unchanged.

- **Best ever** joins **Beat last** as a second improvement line. Beat last
  pays for beating their previous tournament; Best ever pays for beating *every*
  tournament before it. They are different achievements and both can land on one
  afternoon — beating last time is the week-to-week nudge, beating everything is
  the rarer thing. Neither pays at a child's first tournament, which has nothing
  behind it to beat, the rule Beat last already followed.
- **4th place** joins 1st through 3rd on a group draw. `ORDINAL` already listed
  eight; only `MAX_PLACES` held it to three. A knockout still awards 1st and 2nd
  and nothing below it, having no way to tell third from fourth.

### Changed

- **A knockout has an initial prize and a quarterfinal a group has not, and a
  group has a third and fourth place a knockout cannot award**, so switching
  shape empties those lines where you can watch them go, rather than leaving
  them filled in and dropping them without a word at **Save**. Every line the
  two shapes share — per win, 1st, 2nd, beat last, best ever, format — keeps
  whatever has been typed into it.
- **The figures each shape offers are placeholders, not values.** A grey *15*
  beside Quarterfinal says what the rung is usually worth without quietly
  promising to pay it — the same bargain the group lines have always struck. A
  scheme still pays only what was actually typed.
- **Nought wins no longer adds a line to the sum.** A child who turned up and
  lost the first round read *0 rounds $0*, which is a line that earned nothing
  and said nothing. It is dropped, and with an initial prize set the sum now
  reads simply *played $20*.
- Every scheme saved before there was a choice reads as a group one, which is
  what it was. An unreadable shape in a stored or imported file is treated the
  same way rather than being trusted.

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
