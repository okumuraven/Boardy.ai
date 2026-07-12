# 🚀 Vokazi: 3-Month Engineering & Growth Roadmap

Welcome to the **Vokazi Master Plan**. 

As a team, we have officially pivoted from "Boardy.ai" to **Vokazi**. This document serves as the absolute source of truth for our engineering, product, and growth strategy over the next 90 days as we build towards the final hackathon. 

Our ultimate goal is to present a fully functional, real-time product with **1,000 active users**. To do this, we are sequencing our build into three distinct phases.

---

## 📖 The Vokazi Philosophy (Why We Win)

Our main competitor (Boardy) relies on an "invisible UI" (WhatsApp/Email only) and warm email nudges to connect founders. This creates a massive "Spam Cannon" effect and high ghosting rates.

**Vokazi's Unique Edge:** We are the **Web3 evolution** of professional matchmaking. 
1. **The Frictionless Start:** Users sign in with Google. Behind the scenes, Thirdweb instantly provisions an Avalanche C-Chain wallet. Zero crypto friction.
2. **The Voice AI (Vapi):** Users do a live voice interview directly in the browser to extract their business Needs and Offers.
3. **The Trust-Gate (Avalanche Staking):** When our Elixir backend's `pgvector` + Gemini AI pipeline finds a genuinely complementary match and both users mutually accept the detailed score breakdown, they must each stake 0.01 native AVAX on Avalanche Fuji to unlock the introduction. If they ghost, they lose their stake. This forces financial accountability.
4. **Escrow-Gated Meetings:** We automatically schedule a Google Meet *only* after both parties have confirmed their Web3 stake.

---

## 🛠️ Phase 1: The Frictionless Core (Weeks 1 - 3)
*Objective: Get the first 100 users through the door, testing the Voice AI, and proving the UX.*

### Frontend Team (React / Vite)
- [ ] **Conversational Onboarding UI:** Build a landing page that mimics a chat interface. *"Hey, I'm Vokazi. Drop your phone number to get started."*
- [ ] **Thirdweb Integration:** Implement "Sign in with Google" using Thirdweb's In-App Wallets. Verify that an Avalanche wallet address is successfully generated upon login.
- [ ] **Instant Voice AI:** Integrate the Vapi Web SDK. Upon login, show a microphone pulse animation: *"Vokazi is ready to listen."* The user must be able to complete their interview in the browser.

### Backend Team (Elixir / Phoenix)
- [ ] **Webhook Catcher:** Finalize the `/api/vapi` POST endpoint to receive the "End of Call Report" from Vapi.
- [ ] **Data Storage:** Save the parsed transcript, the user's `need_text`, and `offer_text` into PostgreSQL.
- [ ] **Mock Matching:** Write a simple script to pair users manually or via basic text search so we can start matching the first 100 users while the vector math is being built.

---

## 🔐 Phase 2: The Trust-Gate & Vector Math (Weeks 4 - 7)
*Objective: Automate AI matching and introduce the Avalanche financial commitment. Target: 400 Users.*

### Backend & AI Team
- [x] **Gemini Embeddings:** Connect the Phoenix backend to the Google Gemini API (`gemini-embedding-2`) to convert `need_text` and `offer_text` into 1536-dimensional vectors directly via `outputDimensionality` (leveraging Gemini's free tier during the building stage).
- [x] **pgvector Matching:** Activate bidirectional `cosine distance` calculations in the database (my need vs. their offer, and their need vs. my offer — the weaker direction sets the score). When a new vector is saved, shortlist candidates clearing a `0.75` similarity floor.
- [x] **AI Validation & Detailed Match Score:** Gemini judges each shortlisted candidate for a *genuinely* complementary fit (not just lexical similarity), producing a 0-100 confidence score, a reasoning summary, transparent "what lines up" / "what's uncertain" breakdowns (`ai_strengths` / `ai_gaps`), and a ready-to-send introduction message. Only candidates clearing both the pgvector floor and a `70`+ AI score become a match.
- [x] **Mutual Consent Screen:** Both users see the full score breakdown (`MatchReview.jsx`) and independently accept or decline before anything unlocks — neither side is ever auto-matched into a conversation.
- [x] **On-chain Stake Verification (in place of AvaCloud Webhooks):** Rather than subscribing to AvaCloud's real-time event product (a separate third-party account we haven't set up), the Phoenix backend (`Vokazi.Avalanche`) directly re-reads `getMatch` off the deployed contract via a signed JSON-RPC call whenever a user reports a stake, and only unlocks once the contract itself confirms both sides staked. Functionally equivalent zero-trust verification; revisit if a literal AvaCloud subscription is wanted later.

### Web3 & Frontend Team
- [x] **Smart Contract Deployment:** `VokaziMatchStaking.sol` deployed to the Avalanche Fuji Testnet at `0x3e5E4D5FA56fa78F9665Bc36b8D08964Dc790eFA`. Stake amount is **0.01 native AVAX** (not USDC).
- [x] **Staking UI:** `StakingGate.jsx` shows once both sides mutually accept: *"Match Accepted — stake 0.01 AVAX to unlock chat."* Uses Thirdweb's `useSendTransaction`/`prepareContractCall` to sign the real `stake()` transaction from the user's own wallet.

---

## 🤝 Phase 3: Engagement & Scaling (Weeks 8 - 12)
*Objective: Finalize the viral loop, ensure retention, and scale aggressively to 1,000 active users.*

### Full Stack Engineering
- [ ] **Escrow-Gated Google Calendar:** Use the Google OAuth calendar permissions gathered in Phase 1. When Phoenix receives the "unlocked" signal from AvaCloud, automatically find a mutual free slot and send a calendar invite to both founders containing their meeting agenda.
- [ ] **Real-Time Chat Rooms:** Provision secure Phoenix WebSocket channels so matched founders can message each other directly on the Vokazi platform.
- [ ] **Work Escrow Contracts (Bonus):** Deploy a secondary Avalanche contract allowing founders to lock funds for milestone-based work payments.
- [ ] **Notification Engine:** Integrate Whapi.cloud (WhatsApp) or Telegram. Push mobile alerts to users when a new match is found to drive them back to the platform.

---

## 🏢 Phase 4: Vokazi Enterprise (The Talent Marketplace)
*Objective: Launch our B2B monetization engine. Solve enterprise recruiting inefficiencies using AI & Escrow.*

### The Enterprise Workflow
- [ ] **Talent Bounties:** Enable large companies to post job openings and stake a recruitment bounty (e.g., $500 USDC) plus a "Candidate Time-Incentive" (e.g., $10 USDC).
- [ ] **Structured AI Technical Screens:** Vapi AI calls matched developers in our database to conduct a graded technical interview based on the company's specific rubric.
- [ ] **The "Anti-Ghosting" Final Interview:** If the developer accepts the human interview, they are guaranteed the $10 USDC time-incentive. If they ghost, they lose platform credibility.
- [ ] **Smart Contract Revenue:** Upon successful hire, the Avalanche contract automatically routes the $500 USDC bounty into the Vokazi Treasury.

---

## 📈 Growth Strategy (How We Hit 1,000)
Vokazi inherently possesses a viral "Double Opt-In" loop. 
If User A stakes their 0.50 USDC, they are financially incentivized to text User B and say, *"I just put down money on Vokazi to meet you—go accept the match!"* 

**Daily Focus:**
Every single day, we measure our success by two metrics:
1. **Interviews Completed:** How many users talked to the Vapi AI today?
2. **Stakes Confirmed:** How many users actually committed their USDC on Avalanche?

Let's build the future of networking in the Silicon Savannah. 🌍🚀
