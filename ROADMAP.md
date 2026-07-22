# 🚀 Vokazi: 3-Month Engineering & Growth Roadmap

Welcome to the **Vokazi Master Plan**. 

As a team, we have officially pivoted from "Boardy.ai" to **Vokazi**. This document serves as the absolute source of truth for our engineering, product, and growth strategy over the next 90 days as we build towards the final hackathon. 

Our ultimate goal is to present a fully functional, real-time product with **1,000 active users**. To do this, we are sequencing our build into three distinct phases.

---

## 📖 The Vokazi Philosophy (Why We Win)

Our main competitor (Boardy) relies on an "invisible UI" (WhatsApp/Email only) and warm email nudges to connect founders. This creates a massive "Spam Cannon" effect and high ghosting rates.

> **2026-07-22:** the Web3 staking mechanic described below as our original "Trust-Gate" answer to
> ghosting was removed per direct Kuzana feedback - it introduced more friction than the ghosting
> problem it solved was worth for this stage. Our edge now leans fully on match quality (the
> pgvector + Gemini pipeline) and mutual, transparent consent, not a financial commitment device.
> See `boardy_comparison.md` for the full reasoning.

**Vokazi's Unique Edge:**
1. **The Frictionless Start:** Users sign in with Google - no separate account, no password.
2. **The Voice AI (Vapi):** Users do a live voice interview directly in the browser to extract their business Needs and Offers.
3. **Transparent Mutual Consent:** Our Elixir backend's `pgvector` + Gemini AI pipeline finds a genuinely complementary match and shows both users the full score breakdown - strengths, gaps, reasoning - before either commits to anything. Both must say yes; neither is ever auto-matched into a conversation.
4. **Escrow-Gated Meetings:** Once a match is unlocked, scheduling the actual intro call is still gated behind both sides curating and confirming a mutual time - see `calendar.md`.

---

## 🛠️ Phase 1: The Frictionless Core (Weeks 1 - 3)
*Objective: Get the first 100 users through the door, testing the Voice AI, and proving the UX.*

### Frontend Team (React / Vite)
- [x] **Conversational Onboarding UI:** Landing/onboarding flow live.
- [x] **Thirdweb Integration:** "Sign in with Google" via Thirdweb In-App Wallets, Avalanche wallet auto-provisioned.
- [x] **Instant Voice AI:** Vapi Web SDK integrated with mic-pulse UI (`VoiceInterview.jsx`); interview completes fully in-browser.

### Backend Team (Elixir / Phoenix)
- [x] **Webhook Catcher:** `/api/vapi` POST endpoint live, handles End-of-Call report + identity resolution via `assistantOverrides.metadata`.
- [x] **Data Storage:** Transcript, `need_text`, `offer_text` persisted to PostgreSQL.
- [x] **Real Matching (superseded the "mock" plan):** Went straight to real pgvector + Gemini matching below rather than a manual/text-search placeholder.

---

## 🔐 Phase 2: Vector Math & Mutual Consent (Weeks 4 - 7)
*Objective: Automate AI matching. Target: 400 Users.*

> ⚠️ **2026-07-22 pivot:** the Avalanche on-chain staking step described in earlier versions of this
> phase has been **removed entirely**, per direct feedback from the Kuzana representative after a
> real stakeholder meeting - it was the single biggest source of friction in the whole funnel (see
> `boardy_comparison.md`). Mutual consent now unlocks a match immediately; no wallet stake, no
> testnet AVAX, no on-chain wait. `Vokazi.Avalanche`, `StakingGate.jsx`, and the `ethers`/`ex_keccak`
> deps are gone. Google sign-in via Thirdweb stays (identity only) - the friction was the stake
> action itself, not the sign-in.

### Backend & AI Team
- [x] **Gemini Embeddings:** Connect the Phoenix backend to the Google Gemini API (`gemini-embedding-2`) to convert `need_text` and `offer_text` into 1536-dimensional vectors directly via `outputDimensionality` (leveraging Gemini's free tier during the building stage).
- [x] **pgvector Matching:** Activate bidirectional `cosine distance` calculations in the database (my need vs. their offer, and their need vs. my offer — the weaker direction sets the score). When a new vector is saved, shortlist candidates clearing a `0.75` similarity floor.
- [x] **AI Validation & Detailed Match Score:** Gemini judges each shortlisted candidate for a *genuinely* complementary fit (not just lexical similarity), producing a 0-100 confidence score, a reasoning summary, transparent "what lines up" / "what's uncertain" breakdowns (`ai_strengths` / `ai_gaps`), and a ready-to-send introduction message. Only candidates clearing both the pgvector floor and a `70`+ AI score become a match.
- [x] **Mutual Consent Screen:** Both users see the full score breakdown (`MatchReview.jsx`) and independently accept or decline. **The match unlocks and its chat room is created the moment both sides accept** — neither side is ever auto-matched into a conversation, and there's nothing further to do once both say yes.

---

## 🤝 Phase 3: Engagement & Scaling (Weeks 8 - 12)
*Objective: Finalize the viral loop, ensure retention, and scale aggressively to 1,000 active users.*

### Full Stack Engineering
- [x] **Real-Time Chat Rooms:** Phoenix Channels + Presence, keyset-paginated history, join-time authorization (`Chat.participant?/2`), composite message indexes, automated channel tests. Unlocks the moment both stakes verify on-chain.
- [ ] **⭐ NEXT UP: Wire the Milestone Escrow Contract:** `VokaziMilestoneEscrow.sol` is already deployed to Fuji but not yet called from anywhere in the app. This is the natural extension of the Trust-Gate story we already shipped for match staking — reuse the same "backend re-reads on-chain state, never trusts the frontend" pattern from `Vokazi.Avalanche`.
- [x] **Escrow-Gated Google Calendar:** Once a chat room unlocks, each side independently connects Google Calendar (or declines to enter availability manually) and explicitly curates which free days to offer via an assisted day-picker — connecting Calendar no longer silently auto-schedules from someone's full calendar. The picker surfaces which days the other side already offered (never their raw calendar) so both sides converge fast; once both submit, the backend intersects their windows, generates a private per-side AI briefing, and creates the real Google Calendar event once both pick the same slot. See `calendar.md` for the full write-up.
- [x] **Personal Events + Agenda view:** Users can add their own agenda items (not just Vokazi calls) directly on the Calendar tab — these feed back into the day-picker above so a commitment that only lives in Vokazi still blocks that time from being offered to a new match. The Calendar tab itself is a real day-grouped, plain-language agenda ("11:00 AM · Call with Hasan Ali") rather than a card list, with a clickable mini month-grid.
- [x] **Notification Engine:** In-app notification hub (Phase 1) + Web Push (Phase 2) shipped — zero ongoing cost, no WhatsApp/Telegram dependency. Covers new match, reminders, slot proposed, and confirmed calls; clicking a notification routes into the right chat + scheduling drawer instead of a bare conversation. See `notification_system.md`.

---

## 🏢 Phase 4: Vokazi Enterprise (The Talent Marketplace)
*Objective: Launch our B2B monetization engine. Solve enterprise recruiting inefficiencies using AI & Escrow.*

> ⏸️ **Paused per Kuzana's 2026-07-18 session guidance: monetization work is deprioritized for now.** Focus is the core matching + Trust-Gate + chat loop above until told otherwise.

### The Enterprise Workflow
- [ ] **Talent Bounties:** Enable large companies to post job openings and stake a recruitment bounty (e.g., $500 USDC) plus a "Candidate Time-Incentive" (e.g., $10 USDC).
- [ ] **Structured AI Technical Screens:** Vapi AI calls matched developers in our database to conduct a graded technical interview based on the company's specific rubric.
- [ ] **The "Anti-Ghosting" Final Interview:** If the developer accepts the human interview, they are guaranteed the $10 USDC time-incentive. If they ghost, they lose platform credibility.
- [ ] **Smart Contract Revenue:** Upon successful hire, the Avalanche contract automatically routes the $500 USDC bounty into the Vokazi Treasury.

---

## 📈 Growth Strategy (How We Hit 1,000)
Vokazi's viral loop is now the mutual-consent moment itself, not a financial commitment: once User A
sees a genuinely compelling AI-scored match and accepts, they're motivated to text User B directly -
*"Our AI networker found us a great match, go accept it!"* - since the match doesn't unlock (and
the intro doesn't happen) until both sides say yes.

**Daily Focus:**
Every single day, we measure our success by two metrics:
1. **Interviews Completed:** How many users talked to the Vapi AI today?
2. **Matches Unlocked:** How many mutual-consent matches actually converted into a real conversation?

Let's build the future of networking in the Silicon Savannah. 🌍🚀
