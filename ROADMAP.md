# 🚀 Kuzana Connect: Engineering & Growth Roadmap

Welcome to the **Kuzana Connect Master Plan**.

This document is the source of truth for engineering, product, and growth strategy — for the
MiniHack bounty deadline, and beyond it. The goal has shifted: this isn't just a hackathon
submission anymore. It's a tool we want Kuzana to look at and decide it's worth **investing in, or
buying outright**, because it's already been shaped by real interviews with their own members, not
just our own assumptions about what they'd want. See `PITCHING.md` for the business case built on
that research, and `kuzana_connect_discovery.md` / `kuzana_playbook.md` for the underlying source
material.

---

## 📖 The Kuzana Connect Philosophy (Why We Win)

Our main global reference point (Boardy AI) relies on an "invisible UI" (WhatsApp/Email only) and
warm email nudges to connect founders. This creates a massive "Spam Cannon" effect and high
ghosting rates. That's a useful comparison, but it's not who we're actually building for — we're
building specifically for **Kuzana's existing, already-vetted community**, using what that
community's own members told Kuzana they wanted.

> **2026-07-22:** the Web3 staking mechanic described in earlier versions of this document as our
> "Trust-Gate" answer to ghosting was removed per direct Kuzana feedback — it introduced more
> friction than the ghosting problem it solved was worth for this stage. Our edge now leans on
> match quality (the pgvector + Gemini pipeline), transparent mutual consent, and — validated
> directly by Kuzana's own July 2026 member interviews — being the searchable, structured version
> of a discovery process members are already asking for. See `boardy_comparison.md` for the full
> reasoning and `kuzana_connect_discovery.md` for the interview findings.

**Kuzana Connect's Unique Edge:**
1. **The Frictionless Start:** Users sign in with Google — no separate account, no password.
2. **The Voice AI (Vapi):** Users do a live voice interview directly in the browser to extract
   their business Needs and Offers.
3. **Transparent Mutual Consent:** Our Elixir backend's `pgvector` + Gemini AI pipeline finds a
   genuinely complementary match and shows both users the full score breakdown — strengths, gaps,
   reasoning — before either commits to anything. Both must say yes; neither is ever auto-matched
   into a conversation.
4. **Mutual-Consent Scheduling:** Once a match is unlocked, booking the actual intro call is still
   gated behind both sides curating and confirming a mutual time — see `calendar.md`.
5. **Built on real member research, not assumption:** every major scope decision from here on is
   checked against Kuzana's own July 2026 Discovery Report (`kuzana_connect_discovery.md`) — 15
   real member interviews validating exactly this product and naming what it should have on day
   one.

---

## 🛠️ Phase 1: The Frictionless Core (Weeks 1 – 3) — Done
*Objective: Get the first users through the door, testing the Voice AI, and proving the UX.*

### Frontend Team (React / Vite)
- [x] **Conversational Onboarding UI:** Landing/onboarding flow live.
- [x] **Google Sign-In:** via Thirdweb (identity only, no wallet provisioning).
- [x] **Instant Voice AI:** Vapi Web SDK integrated with mic-pulse UI (`VoiceInterview.jsx`);
  interview completes fully in-browser.

### Backend Team (Elixir / Phoenix)
- [x] **Webhook Catcher:** `/api/vapi` POST endpoint live, handles End-of-Call report + identity
  resolution via `assistantOverrides.metadata`.
- [x] **Data Storage:** Transcript, `need_text`, `offer_text` persisted to PostgreSQL.
- [x] **Real Matching:** went straight to real pgvector + Gemini matching below rather than a
  manual/text-search placeholder.

---

## 🔐 Phase 2: Vector Math & Mutual Consent (Weeks 4 – 7) — Done
*Objective: Automate AI matching.*

### Backend & AI Team
- [x] **Gemini Embeddings:** Connect the Phoenix backend to the Google Gemini API
  (`gemini-embedding-2`) to convert `need_text` and `offer_text` into vectors directly via
  `outputDimensionality`.
- [x] **pgvector Matching:** Bidirectional `cosine distance` calculations in the database (my need
  vs. their offer, and their need vs. my offer — the weaker direction sets the score). When a new
  vector is saved, shortlist candidates clearing a `0.75` similarity floor.
- [x] **AI Validation & Detailed Match Score:** Gemini judges each shortlisted candidate for a
  *genuinely* complementary fit, producing a 0–100 confidence score, a reasoning summary,
  transparent "what lines up" / "what's uncertain" breakdowns, and a ready-to-send introduction
  message. Only candidates clearing both the pgvector floor and a `70`+ AI score become a match.
- [x] **Mutual Consent Screen:** Both users see the full score breakdown (`MatchReview.jsx`) and
  independently accept or decline. The match unlocks and its chat room is created the moment both
  sides accept.

---

## 🤝 Phase 3: Engagement & Scaling (Weeks 8 – 12) — Done
*Objective: Finalize the loop, ensure retention.*

### Full Stack Engineering
- [x] **Real-Time Chat Rooms:** Phoenix Channels + Presence, keyset-paginated history, join-time
  authorization (`Chat.participant?/2`), composite message indexes, automated channel tests.
  Unlocks the moment mutual consent is given — no on-chain step of any kind.
- [x] **Mutual-Consent Google Calendar:** Once a chat room unlocks, each side independently
  connects Google Calendar (or declines to enter availability manually) and explicitly curates
  which free days to offer via an assisted day-picker — connecting Calendar never silently
  auto-schedules from someone's full calendar. The picker surfaces which days the other side
  already offered (never their raw calendar) so both sides converge fast; once both submit, the
  backend intersects their windows, generates a private per-side AI briefing, and creates the real
  Google Calendar event once both pick the same slot. See `calendar.md` for the full write-up.
- [x] **Personal Events + Agenda view:** Users can add their own agenda items (not just Kuzana
  Connect calls) directly on the Calendar tab — these feed back into the day-picker above so a
  commitment that only lives in Kuzana Connect still blocks that time from being offered to a new
  match. The Calendar tab itself is a real day-grouped, plain-language agenda rather than a card
  list, with a clickable mini month-grid.
- [x] **Notification Engine:** In-app notification hub + Web Push shipped — zero ongoing cost, no
  WhatsApp/Telegram dependency. Covers new match, reminders, slot proposed, and confirmed calls;
  clicking a notification routes into the right chat + scheduling drawer. See
  `notification_system.md`.
- [x] ~~Wire the Milestone Escrow Contract~~ — **removed.** `VokaziMilestoneEscrow.sol` was
  deployed but never wired in; it depended on the same on-chain trust pattern as the removed
  match-staking mechanic. With Avalanche gone entirely, this item is dropped rather than rebuilt —
  Phase 4 below replaces it with something grounded in real member research instead of a
  speculative on-chain extension.

---

## 🧭 Phase 4: Kuzana MVP Parity (Next Up)
*Objective: Close the gap between what we've built and what Kuzana's own members explicitly asked
for in the July 2026 Discovery Report (`kuzana_connect_discovery.md`). These are day-one asks from
real interviews, not speculative features.*

### Discovery & Directory
- [ ] **Searchable, filterable member directory** — a browsable list of all members, independent
  of the AI-suggested match queue. This was the single most-requested item across the 15
  interviews and is explicitly called out as a "day one" feature in Kuzana's own MVP
  recommendation. Additive to AI matching, not a replacement for it.
- [ ] **Industry/sector taxonomy**, split out as its own filterable field from `role` — real
  members are agribusiness, logistics, finance, real estate, branding, sustainability, consulting,
  not "founder/developer/designer/investor." Raised independently by multiple interviewees.
- [ ] **Structured "looking for" / "can help with" tags** on top of the existing voice-derived
  `offer_text`/`need_text` — funding, customers, partners, mentors, hiring — so the directory can
  be filtered, not just semantically matched.
- [ ] **Portfolio/website link field** on profiles.

### Investor & Lender View
- [ ] **A distinct investor/lender profile type**, not a shared shape with founder profiles:
  condensed business summary, funding stage, amount sought, key financials/traction. Directly
  requested by the NAIBAN member and by Korir (Vula East Africa) — both explicitly framed Connect
  as a deal-flow/sourcing tool, not a peer-networking tool, from their side of the table.
- [ ] **Funding-type segmentation** — equity, loans, grants, working capital treated as distinct
  filterable categories rather than one "seeking investment" bucket, per Korir's specific
  suggestion.

### Trust & Presentation
- [ ] **Neutral business-stage field** — a plain descriptor ("Idea stage" / "Early revenue" /
  "Scaling"), not a tier badge. Directly responds to a named risk in the Discovery Report: one
  interviewee said Kuzana already feels like "a place for big businesses," which made her feel
  inferior as an earlier-stage founder. Worth a pass on `StatsCard.jsx`'s activity-based rank
  language too, to make sure it doesn't compound the same feeling.
- [ ] **Surface existing GitHub verification more prominently** in the directory context — this
  already exists (`SocialProfiles`) and reasonably covers the "member verification/authenticity"
  ask, it just isn't visible where members are actually browsing yet.

---

## 💰 Phase 5: Monetization — What Kuzana's Own Members Already Asked For
*Objective: replace the old, speculative "Vokazi Enterprise" AVAX-bounty talent-marketplace vision
below with something grounded in Kuzana's own member interviews. This supersedes the 2026-07-18
guidance that paused monetization work — that pause was about the old speculative direction, not
about monetization generally. Nothing here is built yet, and no pricing is fixed; this is a scoped
direction to align with Kuzana on, not a shipped decision.*

- [ ] **Paid direct-contact tier** — open browsing/discovery of the directory, with direct member
  contact gated behind a paid tier. This is Kuzana's own stated MVP gate, and Samuel Kagwe asked,
  unprompted, whether Connect would be free or paid — a real member already assuming a monetized
  product is coming.
- [ ] **Investor/lender deal-flow tier** — a higher-touch, filterable view for capital-side members
  (structured financials, funding stage, traction) as a separate, likely higher-value tier from
  general membership. The Discovery Report frames this as a potentially larger and more scalable
  opportunity than membership fees alone.
- [ ] **Pricing TBD with Kuzana directly** — nothing below (or above) is a committed number; both
  tiers exist as validated *shapes* of what to charge for, not amounts.

<details>
<summary>Superseded: the old "Vokazi Enterprise" talent-marketplace vision (kept for record only)</summary>

This phase originally proposed an AVAX-bounty talent marketplace (companies staking a recruitment
bounty + a candidate time-incentive, AI-screened technical interviews, smart-contract revenue
routing on hire). That vision depended entirely on the Avalanche staking infrastructure that's now
removed from the product, and was never validated against a real Kuzana use case the way Phase 5
above is. It's dropped, not rebuilt — Kuzana's own Discovery Report gives us a monetization
direction with actual member demand behind it instead.
</details>

---

## 📈 Growth Strategy
Kuzana Connect's viral loop is the mutual-consent moment itself: once User A sees a genuinely
compelling AI-scored match and accepts, they're motivated to text User B directly — *"Our AI
networker found us a great match, go accept it!"* — since the match doesn't unlock (and the intro
doesn't happen) until both sides say yes.

> **Scale calibration (2026-07-22):** Kuzana's own internal targets, per `kuzana_playbook.md`, are
> a WhatsApp community of ~400 members (from ~200 today) and ~2k LinkedIn followers (from ~1k) —
> not thousands of active users in the near term. The "1,000" figure tied to this bounty is a
> long-run alignment with Kuzana's own "1,000 millionaires by 2040" mission, not a realistic
> near-term active-user KPI. Cold-start and growth-loop decisions should be sized against Kuzana's
> actual current community (low hundreds), not a thousand-user near-term target.

**Daily Focus:**
1. **Interviews Completed:** How many members talked to the Vapi AI today?
2. **Matches Unlocked:** How many mutual-consent matches actually converted into a real
   conversation?

Let's build the tool Kuzana's own members already told them they wanted.
