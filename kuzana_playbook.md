# The Kuzana Playbook — Notes for Reasoning About Kuzana Connect

**Written 2026-07-22.** Source: "The Kuzana Playbook" (Google Doc, shared directly by Kuzana),
exported to PDF and read in full. This is an internal operations document, not a pitch deck or
brand guide - it's how Kuzana actually runs day to day. **Important caveat:** the source doc has
15 tabs (The Kuzana Playbook, Felicity to do, Carol - Key Areas, Bizi Playbook, WorkshopLeaders
Playbook, Accountant, Finance for Founders BOSSmode, Kyle JD & KPIs, Strategy Board, Bizi Buddy
System, Recruiting Bizi, Content/Marketing, Finance, Legal, Organizing Data) - only the main
"Playbook" tab (plus overlapping JD/KPI content) was captured in this pass. Treat this as a first
layer, not the complete picture - **Bizi Playbook**, **Strategy Board**, **Bizi Buddy System**, and
**Recruiting Bizi** in particular are likely directly load-bearing for how Kuzana Connect's
matching/community features should work, and haven't been read yet.

---

## 1. Who's actually running this

- **Kyle Schutter** — CEO. Owns Strategy Board (chairing meetings, matching Bizis to advisors,
  onboarding advisors), Workshops Admin, Curriculum, and Bizi compliance follow-ups.
- **Carol / Carolyne** — senior operator, delivers workshops (CX, storytelling), runs community
  and LinkedIn. A former CEO who *doubled* a microfinance institution's business while there - real
  operating credibility, not a marketing hire.
- **Felicity** — owns Applications (screening incoming founders), Partners (venture scouts, mentor
  programs), and Bizi compliance follow-ups.
- **"CG"** — someone handing off Applications/Strategy Board/Workshops/WhatsApp/Curriculum/
  Partners/Bizi responsibilities to the three above (a transition captured mid-document).

## 2. Vocabulary that should inform product language

- **"Bizi"** — Kuzana's own word for a founder/business participating in the program. Not
  "startup," not "user." Worth considering whether Kuzana Connect's own UI copy should adopt this
  term for consistency with how the community actually talks about itself.
- **"Batch"** — a program cohort (currently on Batch 2, building Batch 2 programming/curriculum).
- The core product is a **12-week structured SME accelerator**: in-person workshops, a Strategy
  Board of advisors, an active WhatsApp community (4 segmented portals: General/MM/WW/FF), and a
  post-program "Kuzana Club" for alumni check-ins. Matchmaking software is one piece of a much more
  hands-on, in-person operation - not the whole business.

## 3. The single most important discovery for how we build

**"Match Bizi + Strat Advisors" is already a real, manually-run workflow Kyle personally owns**,
under Strategy Board. Kuzana already does founder-to-mentor matching today, by hand, in meetings.
This is a far more concrete and already-validated use case for Kuzana Connect's AI matching engine
than "help founders meet random investors" - the sharpest, most defensible internal pitch may be
**"the tool that does what Kyle currently does manually in Strategy Board meetings,"** not a
general-purpose networking app. Worth revisiting whether our role taxonomy (founder/developer/
designer/investor) should instead reflect their real internal categories (Bizi, Strategic Advisor,
venture scout) for a tighter fit with actual usage.

## 4. First-party validation of the Avalanche-removal decision

Kuzana already uses plain-cash commitment devices internally, independent of anything we built. For
a planned factory visit, they're debating: *"charge $400 if you don't show up"* vs. *"pay $400
upfront, refunded if you show."* Same instinct as the original on-chain stake (skin in the game
against flaking) - but their own reflex, completely independent of us, is a boring deposit, never
blockchain. This is real, first-party evidence that the *problem* (no-shows, low intent) is one they
genuinely think about and solve for - but their own solution pattern confirms crypto was never the
natural fit, consistent with the direct feedback to remove Avalanche (see `boardy_comparison.md`,
`ROADMAP.md`'s 2026-07-22 pivot note).

## 5. Real scale - recalibrates growth assumptions

- WhatsApp community target: **doubling to 400 members** (~200 today).
- LinkedIn target: **doubling to 2k followers** by end of June, explicitly framed as *"position for
  investors"* - their LinkedIn is being cultivated as an investor-facing channel, not just a
  founder one.
- Kuzana's actual current community is small - low hundreds, not thousands. `ROADMAP.md`'s "how we
  hit 1,000 users" framing may be aimed at a bigger number than Kuzana's own near-term reality
  supports. Worth treating the realistic near-term Kuzana Connect user base as hundreds, not
  thousands, when reasoning about cold-start/growth strategy.

## 6. Stated operating philosophy (worth matching in product tone and UX)

- **Active learning over lecture** - they cite Minerva University's "professors talk max 4 minutes
  at a time" as a model to study.
- **Source trainers from real former entrepreneurs** wherever possible, not professional trainers.
- **Give direct, "tough love" feedback** to founders - no softening.
- **"Interruption technique"** - a named facilitation method (keep engagement high, don't let
  passive listening dominate a session).
- **Decisions grounded in real data**, not vibes - directly consistent with the brand guide's own
  "Real Numbers. Real Growth." type sample and "Say This: Every company has 2x'd revenue in 12
  weeks" voice example.
- **A living, editable playbook** - "proactive problem solving, add/remove items from playbook" is
  itself a listed responsibility. This document is treated as something that gets rewritten as
  reality changes, not a fixed manual.

## 7. Concrete numbers worth remembering

- $400 - the commitment-deposit amount under discussion for the pyrethrum factory visit.
- ~200 → 400 - current/target WhatsApp community size.
- ~1k → 2k - current/target LinkedIn followers.
- "$10m company" - the aspirational scale benchmark Kyle wants Bizis to see up close (via the
  factory visit), not an abstract case study.

---

*Next step, if useful: export and read the remaining 14 tabs, especially Bizi Playbook, Strategy
Board, Bizi Buddy System, and Recruiting Bizi - these are the ones most likely to directly shape
how Kuzana Connect's matching, community, and advisor-pairing features should actually work.*
