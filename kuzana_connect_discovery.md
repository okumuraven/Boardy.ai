# Kuzana Connect Discovery Report — Notes for Reasoning About the Build

**Written 2026-07-22.** Source: "Kuzana Connect Discovery Report — Community Member Interviews,
15–17 July 2026," prepared by Frank Chege (Community Coordinator), shared directly by Kuzana as a
PDF export of their Google Doc. Unlike [[kuzana_playbook]] (which covers how the *program* runs),
this is real primary user research on **the exact product we're building** — 15 structured
interviews with actual Kuzana members (founders, investors, operators, consultants, lenders)
conducted specifically to validate and scope Kuzana Connect. This is the single most directly
actionable document we've been given so far.

---

## 1. Headline finding: the need is validated, unprompted

Every one of the 15 interviewees who gave feedback on Connect immediately understood its value
without needing to be sold on it — the conversation moved straight past "should this exist" into
"how should this work." That's a strong signal: we're not fighting to prove the problem is real,
we're being handed a feature backlog by the people who'll use it.

## 2. The actual problem, in members' own words

Kuzana's current "networking" is: post in the WhatsApp group and hope the right person sees it, or
notice someone's post and DM them. Every interview described some version of this. Named pain
points:

- Don't know who's even in the community or what they do (June: active member, never met anyone,
  no idea what other members did).
- Can't find people with specific expertise (Abraham: joined looking for partners/advisors,
  couldn't find them despite being active).
- Discovery depends entirely on lucky timing of a WhatsApp post.
- The community *feels* too restrictive/moderated, which paradoxically makes organic discovery
  harder, not safer (Samuel Kagwe, Kenn Andika — independently).
- Chat itself is a bad discovery medium — people aren't glued to their phones (June specifically
  flagged this and suggested Zoom calls instead as a better way to build familiarity).

This directly matches Kuzana Connect's existing thesis (voice-interview-derived offer/need
matching solves exactly "discovering the right person without waiting on chance"), but it reframes
the specific mechanism members are asking for: **a searchable/filterable directory first**, with
AI matching as something to layer in after, not the front door.

## 3. What members actually asked Connect to have (feature list, direct from interviews)

Repeated, unprompted, across multiple interviewees:

- Searchable, filterable member profiles
- Industry/sector categorization — "day one, not a future enhancement" per the report (Mr. Dickson
  and Korir both raised this independently)
- Expertise tags + a clear "what I'm looking for" field (funding, customers, partners, mentors,
  hiring)
- "How I can help other members" — the inverse of "what I need," worth having as its own field
  rather than folding into a free-text offer
- Member verification/authenticity checks
- Portfolio/website links (optional)
- For founders raising: a condensed business summary, funding stage, amount sought, key financials
- For investors/lenders specifically: pitch-deck-style summaries, traction, team composition,
  funding stage/amount — i.e. a genuinely different profile view for capital-side members, not the
  same card as a founder or service provider

## 4. Investors and lenders don't see "networking" — they see deal flow

The most strategically significant single finding: a **NAIBAN** (Nairobi Business Angels Network)
member interviewed the platform as a **deal-flow / sourcing tool**, not a networking app — a way to
discover and screen investable businesses without relying on referrals or cold outreach. They asked
directly when it would be ready, i.e. real, immediate intent to use it.

Separately, **Korir (Vula East Africa)** framed it as a *lending* sourcing tool — he's looking
specifically for businesses at a defined revenue threshold to offer unsecured loans, and suggested
grouping companies by funding-type needed (not just "seeking investment" as one bucket — equity vs.
loans vs. grants vs. working capital are different segments with different qualifying data).

**Implication for Connect's scope:** the "investor" role shouldn't be treated as symmetrical to
founder/developer/designer in the current role taxonomy — investors and lenders are look-only,
filter-heavy, deal-flow consumers who need condensed structured financials up front, not a voice
interview about their own "offer/need." This is a distinct profile *type*, not just a different
value of the same `role` enum. Also reframes monetization: a vetted deal-flow layer for
capital-side members is called out explicitly in the report as a bigger, more scalable opportunity
than membership fees alone.

## 5. Paid-tier signal, unprompted

Samuel Kagwe asked directly whether Connect would be free or paid — without being asked. The
report's own MVP recommendation includes **"Direct member contact for paid members"** as a gate,
i.e. browsing/discovery could be open, but unlocking direct contact could be a paywall — a cleaner,
more validated monetization hook than anything we've built toward so far, and worth weighing against
our existing mutual-consent-unlock mechanic (which currently gates on *both parties accepting*, not
on payment).

## 6. Explicit MVP scope Kuzana themselves recommended

Direct quote-equivalent from the report's own "Kuzana Connect MVP" section:

- Member profiles with industry categorization
- Search and filtering by role, industry, expertise, and what members are looking for
- Direct member contact for paid members
- Investor-ready business profile summaries

And explicitly **deferred** to post-validation: *"Advanced features such as AI-powered matching,
automated introductions and deal flow facilitation can follow after initial validation with real
users."*

This is worth sitting with directly: **Kuzana's own stated sequencing puts a searchable directory
before AI matching**, while our build to date has gone straight for AI-matching-as-the-core-loop
(voice interview → embedding → AI-suggested match → mutual consent → unlock). That's not
necessarily wrong — AI matching is a real differentiator and may be exactly why we were brought in
rather than a plain directory — but it does mean **a simple, non-AI searchable/filterable member
directory may be worth having as a fallback/parallel discovery path**, not just the AI-suggested
queue, especially since several interviewees explicitly said they just want to be able to search
for "who here does X" themselves rather than wait to be matched.

## 7. Stage-shame is a real, named risk to avoid in the UI

Cate (accountant, shoe-business founder) said Kuzana feels like "a place for big businesses" and
made her feel inferior as an earlier-stage founder. The report calls this out explicitly:
business stage should be presented in profiles as a **neutral descriptor, not a status marker**.
Worth keeping in mind for whatever "business stage" field/badge design we eventually add to
profiles — avoid anything that reads as a ranking or tier (a plain label like "Idea stage" /
"Early revenue" / "Scaling," not a gold/silver/bronze-style badge).

This connects to something already in the codebase: `StatsCard.jsx`'s rank ("Ranked #3 of 12
Founders") is a *reputation* ranking based on real activity (matches/calls), which is a different
thing from *business stage* — but worth double-checking neither ranking mechanic ever makes an
early-stage or less-active member feel implicitly graded down in a way that discourages
participation, since that's the exact failure mode Cate described.

## 8. Community quality/vetting is a stated asset, not friction to remove

Peter Okwara pays into his own separate paid community specifically because a small paywall (KES
500) filters out unserious members. Kenn Andika separately stressed that vetting is what keeps the
network valuable. This is a useful counterweight to the "reduce friction" mandate that drove the
Avalanche-staking removal (see `boardy_comparison.md`): **members themselves want *some* filter for
seriousness** — the lesson from the Playbook's own $400-deposit discussion and this finding
together is that the friction they object to is specifically *crypto/wallet* friction, not *all*
signal-of-seriousness mechanisms. A lightweight paid tier (per finding 5) may be exactly the kind
of "friction" members actually want, versus the on-chain stake, which nobody asked for and Kuzana's
own client contact told us to remove.

## 9. Structured, human touchpoints members want alongside the platform

Not build items for Connect itself, but useful context for how Connect should fit into the wider
Kuzana experience: physical sectored meetups, monthly speaker sessions, Zoom networking calls for
people who can't attend in person, better onboarding/orientation for new members (including a
proper introduction to the Kuzana team). June's point that chat is a bad discovery medium because
people aren't glued to their phones is a good argument for Connect leaning on async, browsable
profiles + notifications rather than assuming real-time chat engagement will carry discovery.

## 10. Positioning takeaway

Kuzana is not "an investment platform with a chat group" in members' own heads — funding is one of
several reasons people join (partners, customers, mentorship, learning), and several members who
didn't qualify for funding stayed anyway for the community value. The report's own framing:
Kuzana's biggest asset isn't its programmes or capital — **it's the quality of the existing
network**; the problem isn't creating opportunity, it's making already-present opportunity
discoverable. That's a clean, quotable positioning line for how we describe Kuzana Connect's value
in our own docs (`ROADMAP.md`, pitch materials) going forward.

## 11. One internal, sensitive item (flagged, not a product item)

The report closes with a private note to Kyle about a specific member (a logistics operator) who
felt his funding application was reviewed unfairly / financials misread, and remains discouraged.
This is a member-relations matter for Kuzana's internal team to handle directly — it isn't a Connect
feature request, but it's a reminder that whatever "investor-ready business summary" fields Connect
ends up collecting should be unambiguous about what's being asked for (e.g. turnover vs. profit vs.
audited-statement availability windows) so applicants aren't evaluated against data they were never
asked to provide.

---

*Companion doc: [[kuzana_playbook]] (Kuzana's internal operations — team, program structure,
Strategy Board matching workflow, commitment-device thinking). Read together, the two documents
say roughly the same thing from two directions: Kyle's team already does discovery/matching by hand
(Playbook, §3), and the members on the receiving end of that manual process are asking for exactly
the searchable, filterable, structured version of it (this report). That convergence is the
strongest validation we have for the product's core premise.*
