# Vokazi vs. Boardy AI — Friction & Complexity Audit

> **Update, same day:** after this audit was written, the Kuzana representative met with the team
> and gave direct instruction to remove the Avalanche staking step *entirely*, not just simplify its
> language - overriding this doc's §5 recommendation to keep the mechanic. That's now done: no
> staking, no wallet-funding blocker (nothing left to fund), items #2-4 below (jargon cleanup) were
> applied as part of the same change. §5's reasoning is left below as the record of why the stake
> was built in the first place, not as current guidance - see `ROADMAP.md`'s 2026-07-22 pivot note.

**Written 2026-07-22.** Direct follow-up to `competitors.md`'s feature/traction comparison. That
doc asked "who's ahead on what." This one asks a narrower, more actionable question: **exactly
where does Vokazi make a user work harder than Boardy does, file by file, and what should we
actually do about it.** Every claim below is sourced to a real file - this is a code audit, not a
guess, and it's marked wherever a claim is inference rather than direct evidence.

---

## 1. Bottom line

Boardy's entire pre-match funnel is two steps: *give us your number/LinkedIn → our AI calls you →
wait for the intro.* Vokazi's is **eight** screens/waits before two people can even start chatting,
and three of them expose blockchain terminology a Kenyan SME founder has no reason to know. One of
those steps has a **real gap that would block a genuine new user with no developer around to help
them** - not "sophisticated," actually broken for anyone outside the test accounts. That's the
single highest-priority fix below, ahead of any UI polish.

---

## 2. Funnel comparison

| Step | Boardy AI (verified, `competitors.md`) | Vokazi (verified, this audit) |
|---|---|---|
| 1 | Give phone number or connect LinkedIn | Enter phone number (`LandingPage.jsx`) |
| 2 | *(nothing else - AI calls you)* | Google sign-in via Thirdweb, told "we'll automatically provision your invisible Avalanche Wallet" (`Login.jsx:39`) |
| 3 | | Name + role form, told again "Your invisible Avalanche wallet is provisioned" (`ProfileSetup.jsx:89`) |
| 4 | AI calls you, ~30min natural conversation | In-browser mic tap, told the AI is "extracting your technical requirements and preparing them for **vectorization**" (`VoiceInterview.jsx:68`) |
| 5 | *(instant - result of the call)* | Wait ~35-60s watching a staged progress bar (`InterviewProcessing.jsx`) |
| 6 | AI searches its network in the background | Match Found screen - accept/decline with score + reasoning (`MatchReview.jsx`) - **this one is good, see §4** |
| 7 | Double opt-in via **email** | Wait for the other side to also accept (poll every 8s) |
| 8 | *(nothing - opt-in was the only gate)* | **Stake 0.01 AVAX (Fuji testnet)** via a real on-chain transaction, then wait for the other side to stake too (`StakingGate.jsx`) |
| 9 | Automated WhatsApp group invite link sent | Chat unlocks |

Boardy: 2 user-facing steps, zero jargon, zero financial action. Vokazi: 6 user-facing steps before
chat even unlocks, 3 of which mention wallets/blockchain/vectorization before the user has received
any value at all.

---

## 3. The one that actually blocks people, not just "feels sophisticated"

**There is no faucet, no funding flow, and no wallet address shown anywhere in the UI.**
Confirmed by search - `faucet`/`fund wallet`/`airdrop` return zero matches anywhere in
`frontend/src` or `backend/lib`, and `ProfileView.jsx` is the only screen that even touches wallet
state, purely internally (`activeAccount?.address` used in an API call, never rendered as text a
user could copy).

Concretely: Thirdweb auto-provisions a brand-new wallet for every new sign-in with a **zero AVAX
balance**. When that real, new user reaches `StakingGate.jsx` and taps "Stake 0.01 AVAX," the
transaction has nothing to pay from - it will fail on insufficient funds, and the user has no way to
even see their own wallet address to go request testnet funds from a public Fuji faucet themselves.

The 4 real accounts in the database today only got through this because a developer manually funded
their wallets behind the scenes. **A real Kuzana founder signing up today, with no developer
watching, would hit a dead end at the single most important step in the entire product** - the one
that's supposed to be the differentiator. This is the top priority, above every jargon/copy fix
below, because it's not friction, it's a wall.

---

## 4. What to fix, ranked

**1. Fix the funding gap (blocking, do first).** Either auto-fund new wallets server-side from a
   backend-held faucet wallet the moment a profile is created (mirrors the existing pattern of the
   backend never trusting the frontend for on-chain state - `Vokazi.Avalanche` already re-reads
   contract state directly, so a small backend-initiated funding transfer fits the same trust model),
   or at minimum surface the wallet address plus a direct faucet link on `StakingGate.jsx` so a user
   isn't stuck with zero recourse. The first option removes an entire manual step Boardy's users
   never have to think about at all; the second is a stopgap.

**2. Strip blockchain language from anything before the stake screen.** `Login.jsx:39` and
   `ProfileSetup.jsx:89` both mention "invisible Avalanche wallet" before the user has gotten
   anything of value yet. Boardy never mentions infrastructure at all. Replace with plain outcome
   language ("we'll get you set up automatically") and save the *only* on-chain mention for the one
   screen where it's actually load-bearing information (the stake itself) - not three separate
   screens repeating it.

**3. Reframe the stake screen's language, keep the mechanic.** "0.01 AVAX (Fuji testnet)" is
   internal precision that means nothing to the target user. This is the one piece of real,
   deliberate complexity worth keeping (see §5) - but it doesn't need to *look* complex. "Lock in
   your commitment - you get it back once you both show up" communicates the same trust mechanic
   Boardy verifiably lacks, without exposing token names, testnets, or gas.

**4. Cut "vectorization" and similar raw ML terms from user-facing copy.** `VoiceInterview.jsx:68`
   tells the user their words are being "vectorized" mid-interview - a raw implementation detail with
   zero user-facing meaning. `InterviewProcessing.jsx`'s stage labels ("Extracting your Offer & Need",
   "Generating your match profile") are already the right register - match that tone everywhere.

**5. Don't let the post-match feature surface overwhelm a first-time user.** Social Profile/GitHub
   verification, reputation/ranking, Personal Events/Agenda, the curated day-picker - all real,
   all more built-out than anything verified about Boardy (see `competitors.md` §"What This Means
   for Vokazi") - but none of it exists in Boardy's flow at all, and a brand-new user can wander into
   all of it before ever completing a single real intro. Consider a "first match" mode that hides
   everything except the core loop (interview → match → stake → chat → call) until someone's been
   through it once, rather than presenting the full app surface immediately. This is a real UI
   project, not a copy fix - lowest priority of the five, since it doesn't block anyone, it just adds
   cognitive load.

---

## 5. What NOT to simplify away

The stake itself is the one piece of complexity that's actually the point, not accidental
sophistication. Per `competitors.md`'s adversarially-verified research, Boardy's own admitted failure
modes are match quality and no motivation to re-engage - and Boardy has **zero mechanism** forcing
follow-through once a match is made. The stake is Vokazi's answer to exactly that gap. Simplifying
the *language* around it (§4, item 3) is free upside; removing the mechanic itself would just make
Vokazi a slower, more expensive Boardy clone with no differentiation left. The goal is "as easy as
Boardy to get *to* the stake decision," not "as easy as Boardy to skip commitment entirely."

> **Update, 2026-07-22:** as noted at the top of this document, the stake was removed entirely -
> so the gap this section identifies (something has to filter for seriousness) is real and still
> unanswered by "removed, nothing replaces it." Kuzana's own July 2026 member interviews
> (`kuzana_connect_discovery.md`, §8) independently confirm members *want* some filter - Peter
> Okwara pays into his own community specifically because a small paywall filters out unserious
> members, and Kenn Andika separately stressed vetting is what keeps a network valuable. Read
> together with the Playbook's own $400 cash-deposit discussion (`kuzana_playbook.md`, §4), the
> pattern is consistent: members object to *crypto/wallet* friction specifically, not to *all*
> signal-of-seriousness mechanisms. The validated replacement isn't a stake, it's the paid
> direct-contact tier scoped in `ROADMAP.md` Phase 5 - a plain paywall, not a financial commitment
> device, gating contact rather than the match itself.

---

## 6. Methodology

Every friction point above is sourced to a real file (`Login.jsx`, `ProfileSetup.jsx`,
`VoiceInterview.jsx`, `InterviewProcessing.jsx`, `MatchReview.jsx`, `StakingGate.jsx`, `App.jsx`),
read in full during this audit, plus a direct search of the entire backend and frontend for any
existing faucet/funding mechanism (none found). The Boardy-side comparison points are the same
adversarially-verified claims already established in `competitors.md` - not re-derived here, cited
by reference to avoid duplicating that research.
