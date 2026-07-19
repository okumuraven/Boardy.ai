# VokaziMilestoneEscrow — Research & Integration Reference

This document is a full audit of `VokaziMilestoneEscrow.sol` as it actually exists in this repo today: what it does, exactly how it's built, what's already tested, and — critically — **what it is not yet doing in our system**, since it is currently a deployed-but-unused contract.

---

## 1. What it is

`VokaziMilestoneEscrow` is a standalone Solidity contract that lets two matched Vokazi users hold real AVAX in escrow against a specific piece of work, and release it only when the work is actually delivered — rather than one side having to pay upfront on trust or chase the other after the fact.

Conceptually it's the second half of Vokazi's Trust-Gate story:
- **`VokaziMatchStaking`** (already wired in) answers *"will these two people actually show up to the intro?"* — a small symmetric 0.01 AVAX stake from both sides.
- **`VokaziMilestoneEscrow`** (not yet wired in) answers *"once they're working together, will the payer actually pay for delivered work, and will the payee actually deliver?"* — an asymmetric, work-sized escrow (a founder pays a developer, for example).

It is **generic to any payer/payee pair and any amount** — it has no knowledge of Vokazi's matches, users, or chat rooms. It's a pure escrow primitive; all the Vokazi-specific meaning (which milestone belongs to which match/chat, who's allowed to see it) has to live in our own backend, the same way `VokaziMatchStaking` does today.

---

## 2. How it's built

**Location:** `contracts/src/VokaziMilestoneEscrow.sol`
**Solidity version:** `^0.8.28` (compiled with optimizer on, 200 runs — see `contracts/hardhat.config.js`)
**Inherits:**
- OpenZeppelin `Ownable` — gates two admin-only functions (see below).
- OpenZeppelin `ReentrancyGuard` — every function that moves AVAX (`fundMilestone`, `release`, `refund`, `resolveDispute`) is `nonReentrant`.

**Core data model:**
```solidity
enum MilestoneStatus { Proposed, Funded, Completed, Released, Refunded, Disputed }

struct Milestone {
    address payer;
    address payee;
    uint256 amount;
    string description;
    MilestoneStatus status;
}

mapping(bytes32 milestoneId => Milestone) public milestones;
```
Every milestone is identified by a caller-supplied `bytes32 milestoneId` (in practice, expected to be a deterministic hash the backend derives — e.g. `keccak256("vokazi-milestone-{id}")`, mirroring how `Vokazi.Avalanche.onchain_match_id/1` derives match IDs today). There is no on-chain list of milestone IDs — the mapping is a lookup table, and the backend is expected to be the source of truth for "which IDs exist," the same way it already is for match IDs.

Unlike `VokaziMatchStaking` (where the stake amount is a fixed, contract-wide `0.01 AVAX`), **every milestone has its own arbitrary `amount`**, set at creation time — this contract is built for real, variable-sized payments, not a fixed commitment fee.

---

## 3. Lifecycle / state machine

```
Proposed --fundMilestone()--> Funded --markCompleted()--> Completed --release()--> Released
                                 |                            |
                                 |<---------- refund() -------|   (payer can still refund from Completed too)
                                 |                            |
                                 +---------openDispute()-------+--> Disputed --resolveDispute()--> Released
```

- **Proposed**: created by the backend, no funds held yet.
- **Funded**: payer has sent exactly `amount` in AVAX.
- **Completed**: payee has self-attested the work is done. *No funds move at this step* — it's just a status flag the payer's `release()` depends on.
- **Released**: funds sent to payee. Terminal.
- **Refunded**: funds returned to payer. Terminal. Reachable from either `Funded` or `Completed` — i.e. the payer can still pull back funds even after the payee claims completion, right up until the payer actually calls `release()`. This is a deliberate power imbalance toward the payer (see §6).
- **Disputed**: either party can freeze a `Funded` or `Completed` milestone here; only `resolveDispute` (owner-only) moves it out, straight to `Released` for whichever address the owner names.

---

## 4. Function-by-function reference

| Function | Caller | Preconditions | Effect | Event |
|---|---|---|---|---|
| `createMilestone(id, payer, payee, amount, description)` | **Owner only** | payer/payee non-zero and distinct; amount > 0; id not already used | Creates milestone in `Proposed` | `MilestoneCreated` |
| `fundMilestone(id)` *(payable)* | payer only | milestone exists; status `Proposed`; `msg.value == amount` exactly | → `Funded` | `MilestoneFunded` |
| `markCompleted(id)` | payee only | status `Funded` | → `Completed` (no funds move) | `MilestoneCompleted` |
| `release(id)` | payer only | status `Completed` | → `Released`; sends `amount` to payee | `MilestoneReleased` |
| `refund(id)` | payer only | status `Funded` **or** `Completed` | → `Refunded`; sends `amount` back to payer | `MilestoneRefunded` |
| `openDispute(id)` | payer **or** payee | status `Funded` or `Completed` | → `Disputed` | `MilestoneDisputed` |
| `resolveDispute(id, recipient)` | **Owner only** | status `Disputed`; `recipient` must be the milestone's payer or payee | → `Released`; sends `amount` to `recipient` | `DisputeResolved` |
| `getMilestone(id)` | anyone (view) | — | Returns the full `Milestone` struct | — |

**Custom errors** (gas-efficient reverts, no string messages): `MilestoneAlreadyExists`, `MilestoneNotFound`, `InvalidParticipant`, `InvalidAmount`, `InvalidAddresses`, `InvalidStatus(current, required)`, `TransferFailed`.

**Who plays "owner"?** Same as `VokaziMatchStaking` today: the contract's deployer wallet (`0x9d52Ad13d70C8404a1a2439961eC9e8495245A13` on Fuji), which the backend controls the private key for via `Ethers.Signer.Local`. `payer`/`payee` are just addresses passed into `createMilestone` — the contract has no concept of "Vokazi user," only whatever addresses the backend tells it about.

---

## 5. Existing test coverage

`contracts/test/VokaziContracts.test.js` has a `describe("VokaziMilestoneEscrow", ...)` block with **3 passing Hardhat tests**:
1. Full happy path: fund → payee marks completed → payer releases → payee's balance increases by `amount`.
2. Payer refund after funding (before completion) — balance check nets out gas cost.
3. Dispute resolution: payee opens a dispute after funding, owner resolves it in the payee's favor.

**Not currently tested** (worth adding before real money flows through this): refund *after* `Completed` (the contract explicitly allows it — a payer could revoke funds even after the payee says they're done, right up until `release()`), every `InvalidStatus`/`InvalidParticipant` revert path, and `resolveDispute` resolving in the *payer's* favor.

---

## 6. Deployment status

| | |
|---|---|
| Network | Avalanche Fuji Testnet (chainId `43113`) |
| Address | `0xb26Ef6c2fC70D831924622fa783b1cc800eb3F64` |
| Deployed | 2026-07-03, alongside `VokaziMatchStaking`, by `contracts/scripts/deploy.js` |
| Deployer/owner | `0x9d52Ad13d70C8404a1a2439961eC9e8495245A13` |
| Manifest | `contracts/deployments/fuji.json` |
| Explorer | `https://testnet.snowtrace.io/address/0xb26Ef6c2fC70D831924622fa783b1cc800eb3F64` |

It is **deployed and functional on-chain**, but genuinely idle — a repo-wide search confirms **zero references to it in `backend/lib` or `frontend/src`**. It only appears in documentation (`contracts.md`, `README.md`, `ROADMAP.md`) as an acknowledged gap. `contracts.md`'s current description of it ("Deposit funds... release when approved") is a rough two-line stub written before this deeper look — it doesn't mention the `Completed` step, `refund`, or `dispute` paths at all, so that doc is due for a rewrite once wiring starts.

---

## 7. What it needs to do in our system (the wiring plan)

Nothing here is built yet — this is the concrete plan for turning "deployed" into "used," following the exact pattern `Vokazi.Avalanche` / `VokaziMatchStaking` already established (backend never trusts the frontend's word; it re-reads on-chain state before recording anything):

1. **New `Vokazi.Avalanche` functions** (or a sibling module) mirroring the existing match-staking calls:
   - `create_milestone_onchain(payer, payee, amount, description)` — signed `createMilestone` tx from the backend/owner wallet, deterministic `milestoneId` via `keccak256("vokazi-milestone-{id}")` (same `to_bytes32/1` pattern already solved for match IDs).
   - `get_milestone_onchain(milestone_id)` — read-only `getMilestone` call, the verification source of truth.
2. **New Ecto schema/table** (`Vokazi.Escrow.Milestone` or similar) to associate an on-chain milestone with Vokazi domain data the contract itself has no concept of: which `match`/chat room it belongs to, which two `user_id`s are payer/payee, a human-readable status mirror, and the relevant tx hashes — same shape as how `Match` already carries `onchain_match_id`, `stake_tx_hash_a/b`.
3. **Backend endpoints**: propose a milestone (creates the DB row + on-chain `createMilestone`), confirm-funded / confirm-completed / confirm-released (each re-verifies via `get_milestone_onchain/1` before updating local state — never trust the frontend's claim that a tx succeeded, exactly like `confirm-stake` does today).
4. **Frontend**: a "Deliverables" panel inside the existing chat room (`ChatSystem.jsx`) — propose a milestone with an amount + description, fund it (`useSendTransaction`/`prepareContractCall`, same thirdweb pattern as `StakingGate.jsx`), mark-complete, release, or open a dispute, each button gated by the milestone's current on-chain status.
5. **Decide the dispute story before launch**: `resolveDispute` is owner-only today, meaning *we* (the backend/deployer wallet) are the arbiter for every disputed milestone. That's a fine, honest MVP tradeoff to state explicitly in the pitch — but it means we need at least a manual admin path (even just a Postgres query + a signed CLI call) to actually resolve a real dispute if one happens during the hackathon.

---

## 8. Security / design notes worth knowing before wiring this up

- **Reentrancy**: correctly guarded on every value-transferring function. Good.
- **No partial release**: a milestone is all-or-nothing — no percentage-based partial payouts.
- **No milestone cancellation pre-funding**: a `Proposed` milestone that's never funded just sits there forever; harmless (no funds locked) but there's no explicit `cancelMilestone` to clean it up.
- **No timeouts**: there's no auto-refund-after-N-days if a payee never delivers and a dispute is never opened — a `Funded` milestone with a payer who goes silent stays `Funded` indefinitely unless someone acts.
- **Payer-favoring refund window**: `refund()` works from `Completed` too, not just `Funded` — meaning a payer can still reclaim funds after the payee has marked the work done, as long as the payer hasn't called `release()` yet. Worth deciding if that's the intended trust balance for real users, or if `refund` should be blocked once `Completed`.
- **Centralized dispute resolution**: `resolveDispute` is `onlyOwner` — i.e., us. Not a decentralized arbitration mechanism; fine for an MVP/hackathon as long as it's described accurately rather than implied to be trustless.
