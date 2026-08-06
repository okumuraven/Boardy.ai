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

## 🔀 Deviations from the Official Technical Brief (and why)

**Written 2026-08-06.** `Kuzana_boardy.ai.md` is our own copy of the requirements Kuzana/MiniHack
gave us, and it describes a specific baseline stack: outbound Vapi/Synthflow phone calls, OpenAI
embeddings, Airtable/HubSpot as the database, Make.com/Zapier cron orchestration, and — the biggest
one — **Whapi.cloud/Zoko-driven WhatsApp double opt-in and automated group creation**. What's
actually running today deviates from that baseline in five places. Every one of these was a
deliberate, cost/practicality call made during the build, not something that drifted unnoticed —
but until now that reasoning lived only in internal working notes, not in a document a judge would
actually read. This section fixes that. **None of these substitutions change what capability is
being demonstrated** — voice discovery → structured extraction → semantic vector matching → a
gated, mutual-consent introduction is fully implemented; only the concrete tool behind each step
differs from the brief's suggested baseline.

| Brief's baseline | What's built instead | Why |
|---|---|---|
| **WhatsApp double opt-in + automated group creation** (Whapi.cloud/Zoko) | In-app mutual-consent screen (`MatchReview.jsx`) + a persistent Phoenix Channels chat room, unlocked the moment both sides accept | Whapi/Zoko are paid gateways billed per message/API call — real recurring cost for a feature the brief itself frames as a mechanism (double opt-in), not a specific vendor requirement. A first-party chat room also does more than a WhatsApp group link ever could here: it's the same surface our calling and mutual-availability scheduling features are built on, so an unlocked match gets messaging, voice/video calls, and calendar coordination in one place instead of handing the user off to a separate app after the intro. |
| **Outbound Voice AI phone call** (dial out to the member's number) | In-browser Vapi Web SDK call (WebRTC), user-initiated from the app | Zero per-minute telephony cost vs. outbound calling; no phone-number collection/consent step needed since the member is already signed in and in the app. The brief's own Phase 1 spec allows the call to be "inbound when requested" — this satisfies that reading directly, and fits a web product where Google Sign-In is already the identity layer. |
| **OpenAI `text-embedding-3-small`** | Google Gemini embeddings (`gemini-embedding-2`) | Free tier during the build (real cost difference at this stage), and Gemini is already the model doing match validation/scoring and tag extraction elsewhere in the same pipeline — one AI vendor instead of two reduces integration surface and key management for no loss of matching quality. |
| **Airtable/HubSpot + Make.com/Zapier cron orchestration** | PostgreSQL + `pgvector`, Elixir/Phoenix (Oban for background jobs) | Postgres+pgvector does real cosine-similarity search natively — a spreadsheet-backed CRM can't run the actual semantic-matching requirement the brief asks for; Make.com/Zapier would just be gluing that same gap over with per-automation SaaS billing. This is a strictly more capable substrate for the literal Phase 2 requirement, not just a preference. |
| **Async matching cron, every 24–48 hours** | On-demand, synchronous matching (`POST /matchmaking/find_match`, `Matchmaking.find_match!/1`) — pgvector shortlist + Gemini validation run immediately when triggered | A batch cron makes sense at Boardy's scale (thousands of users, matches trickling in continuously); at Kuzana's actual community size — low hundreds, per `kuzana_playbook.md` §7's own growth targets — a 24–48h delay just adds latency with no batching benefit. Immediate feedback is better UX for a small, high-touch community, and the *scoring logic itself* (pgvector floor + Gemini validation threshold) is identical either way — only the trigger cadence differs. |

**What did *not* deviate**: the required data model (user records, embeddings, call history, match
states), the matching engine's actual logic (pgvector similarity + LLM validation, threshold-gated),
and the core requirement — voice call → structured needs/offers → vector match → gated introduction
— all match the brief's intent. The 60-day no-repeat-match constraint (brief §4.2) has **not been
independently re-verified as part of this pass** and should be checked before being cited as done.

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

## 🧭 Phase 4: Kuzana MVP Parity — Done
*Objective: Close the gap between what we've built and what Kuzana's own members explicitly asked
for in the July 2026 Discovery Report (`kuzana_connect_discovery.md`). These are day-one asks from
real interviews, not speculative features. Design discussion held 2026-07-23 - decisions below are
the outcome of that discussion. Built across three rounds (Stage A, Stage B, Investor & Lender
View), each verified end-to-end against real data before moving to the next.*

### Discovery & Directory
- [x] **Searchable, filterable member directory** — new "Directory" tab (`Vokazi.Directory`,
  `DirectoryController`, `frontend/src/features/directory/`), independent of the AI-suggested match
  queue. Search box + tappable filter chips (industry, role, "looking for"/"can help", funding
  type), the same interaction pattern as filtering products on any shopping app. Each result is a
  compact card: name, role, industry, one-line offer snippet, tags, verified badge, portfolio link.
- [x] **Industry/sector taxonomy**, its own filterable field on `Vokazi.Accounts.User` - a fixed
  13-option list (Agribusiness, Logistics, Finance, Sustainability, Branding & Marketing,
  Consulting, Accounting, Real Estate, Technology, Investment, Retail & Consumer Goods, Hospitality,
  Other) drawn from Kuzana's actual member industries, picked via dropdown in Profile Setup/Edit.
- [x] **Structured "looking for" / "can help with" tags** — `Vokazi.AI.extract_tags/2`, a dedicated
  Gemini call (deliberately separate from `extract_summary/1`) classifying existing offer/need text
  into a fixed 5-tag vocabulary (funding, customers, partners, mentors, hiring). Runs automatically
  after every interview; zero new onboarding steps. `mix backfill_tags` covers profiles that
  predate the field.
- [x] **Portfolio/website link field** — reused the pre-existing `SocialProfiles.portfolio_url`
  rather than adding a duplicate field; now surfaced on directory cards.

### Directory Contact Model — decided (2026-07-23)
The open question was: once someone finds a person in the directory, what happens next? Resolved
as a combination of both options originally on the table, explicitly **without** a payment layer:
- **Browsing/search is fully open** — anyone can search and filter the whole directory, no
  restriction, no gate (the openness half of the original "Option B").
- **Contact still goes through the existing mutual-consent flow** — tapping "Connect" on a
  directory profile runs through the same AI-reasoning / accept-decline screen already built for
  suggested matches, just user-initiated instead of AI-initiated. Raw contact info (phone, etc.)
  is never displayed directly; nobody is ever reachable without both sides agreeing first (the
  mechanism half of the original "Option A"). This keeps one consistent "how do you talk to
  someone" rule across the entire app, whether the AI suggested the person or you found them
  yourself.
- **No payment/monetization gate is being built on top of this right now.** Per direct guidance
  from the Kuzana representative (reconfirmed 2026-07-23), monetization is explicitly off the
  table for now — see Phase 5 below, which stays paused. This open-browse + consent-gated-contact
  model is designed so a paid tier *could* sit on top of it later without changing the underlying
  mechanic, but building that gate is not in scope today.

### Investor & Lender View
- [x] **A distinct investor/lender profile type** — new `Vokazi.Investment.InvestmentProfile`
  (own table, not bolted onto `Profile`), condensed business summary/funding stage/amount
  sought/key financials for founders, check size/sectors of interest for investors and lenders.
  Directly answers the NAIBAN member and Korir (Vula East Africa), who both framed Connect as a
  deal-flow/sourcing tool from their side of the table. The voice interview stays the front door for
  everyone; the structured form (`InvestmentDetailsForm.jsx`) only appears - via a Home banner - to
  whoever it applies to (anyone with "funding" in their looking-for tags, or role "investor"), and
  its "Key financials" field is explicitly labeled ("be specific - turnover, profit, or growth,
  your choice, just say which") to directly prevent the exact ambiguity the Discovery Report's
  "Note to Kyle" flagged as a real member's complaint (financials misread during a funding review).
- [x] **Funding-type segmentation** — equity/loan/grant/working-capital as a shared fixed vocabulary
  (`InvestmentProfile.funding_types/0`), filterable in the Directory, doubling as "what a founder
  wants" and "what an investor/lender provides" depending on which side fills it in.

### Trust & Presentation
- [x] **Neutral business-stage field** — `InvestmentProfile.business_stage` (Idea stage / Early
  revenue / Growing / Established), rendered as plain text everywhere, never a colored/tiered
  badge - directly answers the Discovery Report finding that Kuzana already "feels like a place for
  big businesses" to an earlier-stage founder. (`StatsCard.jsx`'s activity-rank language is still
  worth a separate look, but is a different mechanic from business stage.)
- [x] **Surface existing GitHub verification more prominently** — a small verified-checkmark next
  to the name on every directory card (`SocialProfiles.github_username`), shipped as part of Stage A.

---

## 💰 Phase 5: Monetization — What Kuzana's Own Members Already Asked For
*Objective: keep a scoped, evidence-backed monetization shape on record for when Kuzana is ready to
discuss it - not to build it now. This replaces the old, speculative "Vokazi Enterprise"
AVAX-bounty talent-marketplace vision below (which is dropped, not just paused - see the
superseded note). But the pause on monetization work itself is still fully in effect: the Kuzana
representative's 2026-07-18 guidance to deprioritize monetization was reconfirmed directly on
2026-07-23 - do not start building anything in this phase until told otherwise. Nothing here is
built, nothing is scheduled; it exists only so the shape (paid direct-contact tier, investor/lender
deal-flow tier) is ready to discuss whenever Kuzana raises it.*

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

## 📞 Phase 6: In-App Calling
*Objective: close a real, silent dead-end discovered in the scheduling flow, and give matched
members a way to actually connect for their intro call that doesn't depend on either side's
personal Google account. Design discussion held 2026-07-24.*

### Phase 1: Signaling + coturn — Done
- [x] **Self-hosted `coturn`** running in `docker-compose.yml` (`network_mode: host`,
  `--use-auth-secret`), verified for real - not just started - by generating live credentials via
  `Vokazi.Calling.TurnCredentials` and confirming an actual TURN allocation succeeds against them
  using `turnutils_uclient`.
- [x] **`Vokazi.Calling.TurnCredentials`** + `GET /api/calls/turn_credentials` - short-lived
  HMAC-signed credentials, ready for Phase 2 to hand straight to `RTCPeerConnection`.
- [x] **Call signaling on the existing `ChatRoomChannel`** - `call_ring`/`call_accept`/
  `call_decline`/`call_cancel`/`call_end`, reusing the same join/authorization chat already has.
  Verified with two real concurrent Phoenix Channel clients (not mocked) exercising all three
  paths - ring→accept→end, ring→decline, ring→cancel - plus a live browser check of the actual
  `CallPanel.jsx` UI (Calling/incoming/in-call states, live timer, correct system messages in chat).
  One real bug caught and fixed in the process: call-outcome system messages were being persisted
  but never broadcast to an already-open chat window, so they only appeared after a reload -
  `create_call_message/3` now broadcasts `new_msg` the same way the real send path already does.
### Phase 2: Real media — Done
- [x] **`RTCPeerConnection`/`getUserMedia` wired to the Phase 1 signaling events** - only the
  caller ever creates an SDP offer (no glare/renegotiation to handle, since a call here only ever
  negotiates once); the callee preps its own mic + peer connection the instant it clicks Accept so
  it's ready when the offer arrives. New pure-relay backend handlers (`webrtc_offer`/
  `webrtc_answer`/`webrtc_ice_candidate`) never interpret SDP/ICE content, just forward it -
  verified with two real concurrent Channel clients confirming correct relay (including a
  malformed-payload case rejected cleanly instead of crashing).
- [x] **ICE candidate queueing** - candidates arriving before the remote description is set are
  buffered and flushed after, a real WebRTC signaling detail, not an edge case skipped.
- [x] **Mic permission handling, mute toggle, and full cleanup** (peer connection closed, mic
  released) on end/cancel/decline/unmount - `frontend/src/lib/webrtc.js` (pure helpers, no React)
  + `CallPanel.jsx`/`CallOverlay.jsx` (split to stay under the 250-line file cap).
- [x] **Verified with real browser WebRTC, not simulated**: triggered a real `getUserMedia` +
  `RTCPeerConnection.createOffer()` from an actual Chrome tab, confirmed a genuine SDP offer
  (real ICE ufrag/pwd, DTLS fingerprint, opus codec) was generated and correctly relayed to the
  other side, and confirmed the "Connecting audio..." UI state renders correctly while awaiting
  the answer. Two-way audio actually connecting (both real sides, live) still needs a real
  two-person test - not something provable solo in this environment.
### Phase 3: Polish — Done
*Scope decided 2026-07-24: video mode (`contact_preference` finally driving call vs. video) is
split off into its own follow-up phase rather than bundled in here - a real feature (camera capture,
renegotiating the WebRTC track), not polish. Call history is a dedicated view, not just the existing
in-chat call log.*
- [x] **Call session foundation (`call_id` + `Vokazi.Calling.CallLog`)** - every `call_ring` now
  creates a `call_logs` row (`match_id`, `caller_id`, `callee_id`, `status`, `duration_seconds`),
  and its id is round-tripped through accept/decline/cancel/end. This is what makes ring-timeout and
  call history possible at all: the caller's and callee's channel handlers each run on a different
  socket process with no other shared state, so without a row both sides can agree on by id, neither
  feature is buildable.
- [x] **Ring-timeout for an unanswered call** - `ChatRoomChannel` schedules a server-side
  `Process.send_after` (not a client-side timer, so it still fires if the caller's own tab closes)
  on every ring; if nothing resolves it within 45s, the call is marked missed and both sides get a
  `call_timeout` event clearing their UI. Race-guarded with an atomic `UPDATE ... WHERE status =
  'ringing'` so a timeout that fires just after a real accept/decline/cancel is a correct no-op, not
  a duplicate/incorrect transition. Verified with 6 new real Phoenix Channel tests (ring→accept→end
  completes with duration persisted; decline/cancel/timeout each land in the right terminal status;
  the no-op race case explicitly covered) plus a live browser + real Postgres check of the
  ring→cancel path end-to-end.
- [x] **Ringtones** - `frontend/src/lib/ringtone.js` synthesizes two audibly distinct Web Audio tones
  (440+480Hz ringback for outgoing, 425Hz for incoming) rather than shipping an audio file asset; a
  `status`-driven effect in `CallPanel.jsx` starts/stops the right one and cleans up on any
  transition away from `calling`/`incoming`.
- [x] **Web Push for the tab-closed case** - reuses the existing Oban + web-push-elixir pipeline
  as-is (new `"incoming_call"` notification type added to the allowlist); `call_ring` fires a push
  only if Presence shows the callee isn't connected to this room at all, mirroring the exact
  "absent" check `Chat.notify_recipient_if_absent/2` already uses for messages. The subtler half of
  this: the original `call_ring` broadcast only reaches sockets already subscribed at that instant,
  so opening the app from the notification wouldn't otherwise show anything - `Calling.
  active_ring_for_room/2` + a check in `handle_info(:after_join, ...)` re-surfaces a still-ringing
  call the moment the callee's channel (re)joins, pushed to just that one socket. Verified with 3 new
  real Phoenix Channel tests (notifies when absent, doesn't when present, a late-joining socket gets
  the ring re-pushed) plus a live browser + real Postgres check confirming the actual `notifications`
  row (correct body/link shape) and correctly *no* Oban push job for a test account with zero
  registered subscriptions.
- [x] **In-app incoming call visible from anywhere, not just the open chat** (2026-07-24, user
  feedback: "make it like WhatsApp/Telegram, visible anywhere as long as logged in") - `CallPanel`
  used to live only inside a specific match's chat screen, so a ring was invisible on every other
  tab. Fixed by also broadcasting `call_ring` on the callee's own always-connected personal channel
  (`user:{id}`, the same one `NotificationBell` already keeps open across every tab switch) and
  adding `IncomingCallBanner.jsx`, a small global banner mounted once at `AppShell` level. Tapping it
  reuses the exact same navigation as a notification click (no duplicate WebRTC/channel logic in the
  banner itself) - landing on the chat re-surfaces the real Accept/Decline UI via the after-join
  re-push above. `call_accepted`/`call_declined`/`call_cancelled`/`call_timeout` are also broadcast
  on the personal channel so the banner dismisses itself the instant the call resolves any way other
  than tapping it. Verified live end-to-end: a real call placed from a second real WebSocket client
  (not simulated) while the browser sat on the Home tab - the banner appeared, tapping it navigated
  to Matches and correctly re-surfaced the incoming-call UI there.
- [x] **Dedicated call history view** - new "Calls" nav rail/tab-bar icon, `GET /api/calls/history`
  (`CallHistoryController` + `Calling.list_history/1`) listing every call across all matches, not
  just what's visible per-chat. Direction- and viewer-aware labeling mirrors how a real phone
  distinguishes the two sides of an unanswered call: "Missed call" only for a ring *you* didn't
  answer, "No answer" for one *you* placed that nobody picked up, "Declined"/"Cancelled" for the
  rest - the same status is worded differently depending on whether you were the caller or callee.
  Tapping a row reuses the same `openMatchChat` navigation as the incoming-call banner. Verified with
  a real curl against the live endpoint (correct JSON shape, direction, other-party name) and live in
  the browser against real historical data from this session's own testing.

### Phase 3 - fully complete
All five items above (call session foundation, ring-timeout, ringtones, Web Push, in-app visibility,
and call history) are done and verified. Video mode (`contact_preference` driving call vs. video) is
the next, separately-scoped phase - see the split-off note above.

### The bug this is actually fixing
Found by reading the live scheduling code, not assumed: `Vokazi.Scheduling.EventFinalizer` only
creates a real Google Calendar event (with its auto-generated Meet link) if **at least one side
connected their personal Google Calendar**. If both sides decline Calendar and only submit manual
availability, the schedule silently gets stuck at "confirmed" from the user's perspective with
**no event, no Meet link, no phone number** (never exposed to the other side, by design) — nothing
to actually join. `contact_preference` ("call"/"video"/"chat") is purely decorative today; nothing
anywhere branches on its value. See `calendar.md` §7 for the full write-up of this gap.

### Direction decided
- **Self-hosted WebRTC, not a managed third-party platform** (not LiveKit/Twilio/Agora). Every call
  Kuzana Connect will ever host is 1:1 (matched pairs only) — the SFU/group-call-scaling benefits a
  managed platform sells don't apply here, so paying for one is unnecessary overhead.
- **Architecture:** Phoenix Channels (already running, used for chat) for signaling; self-hosted
  `coturn` (mature open source) for STUN/TURN NAT traversal and relay fallback; native browser
  WebRTC APIs (`RTCPeerConnection`/`getUserMedia`) on the frontend — no SDK, no vendor in the media
  path.
- This finally makes `contact_preference` do something real: "call" joins audio-only, "video"
  prompts for camera — instead of a decorative label with no execution path.

### Cost model
Everything rides on infrastructure that already exists or is free by design (browser WebRTC,
Phoenix Channels, STUN, Let's Encrypt for TLS, Web Push already built) except one real line item:
hosting `coturn` itself — a small always-on machine, relay bandwidth for the ~15–30% of calls
direct peer-to-peer can't establish, and possibly a couple dollars/month for a static IP. At
Kuzana's actual current scale (low hundreds of members, per `kuzana_playbook.md`), this is
realistically a few dollars a month, not a budget line — and it stays flat regardless of call
volume in a way per-minute-billed platforms don't.

### Honest limitation
Being a web app (not a native mobile app), we cannot make a phone physically ring from a
fully-closed app the way WhatsApp's OS-level VoIP integration does. Mitigation: fire a Web Push
notification the moment a call starts, so the recipient is alerted even with the tab closed;
tapping it opens/focuses the app to join. Real and useful, but "notification → tap → connect," not
"phone rings in your pocket" — a ceiling of being a web app, not something more engineering effort
removes.

See `call_feature.md` (audio) and `video_call_feature.md` (video) for the full technical write-ups.

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
