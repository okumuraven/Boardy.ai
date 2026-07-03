# Boardy.ai Smart Contracts

Solidity contracts for the Boardy.ai Web3 layer on **Avalanche Fuji testnet** (chain ID `43113`).

## Contracts

| Contract | Purpose |
|---|---|
| `BoardyMatchStaking` | Bilateral 0.01 AVAX commitment stakes to unlock AI-matched introductions |
| `BoardyMilestoneEscrow` | AVAX escrow for deliverables between matched users |

### Match staking flow

```
Backend creates match (createMatch)
        ↓
User A stakes 0.01 AVAX ──→ status: StakedA
        ↓
User B stakes 0.01 AVAX ──→ status: Unlocked  →  MatchUnlocked event
        ↓
Both parties withdrawStake() to reclaim commitment
```

If one party never stakes, the committed party can call `refundUnmatched()`.

## Setup

```bash
cd contracts
npm install
cp .env.example .env
```

Edit `.env` and set `DEPLOYER_PRIVATE_KEY` to a Fuji-funded wallet.

Get test AVAX from the [Avalanche Fuji faucet](https://faucet.avax.network/).

## Commands

```bash
npm run compile          # Compile contracts
npm test                 # Run Hardhat tests
npm run deploy:local     # Deploy to local Hardhat node
npm run deploy:fuji      # Deploy to Avalanche Fuji
```

## Fuji network

| Setting | Value |
|---|---|
| Chain ID | `43113` |
| RPC | `https://api.avax-test.network/ext/bc/C/rpc` |
| Explorer | [testnet.snowtrace.io](https://testnet.snowtrace.io) |
| Native stake | `0.01 AVAX` |

After deployment, addresses are saved to `deployments/fuji.json`.

## Frontend integration

Wire these into `frontend/.env`:

```env
VITE_CHAIN_ID=43113
VITE_MATCH_STAKING_ADDRESS=0x...
VITE_MILESTONE_ESCROW_ADDRESS=0x...
```

Use Thirdweb `defineChain(43113)` and call `stake(matchId)` on `BoardyMatchStaking` with `{ value: parseEther("0.01") }`.

`matchId` should be deterministic from the backend match record, e.g.:

```js
import { id } from "ethers";
const matchId = id(`boardy-match-${matchPrimaryKey}`);
```

The backend (deployer wallet) calls `createMatch(matchId, userA, userB)` when pgvector finds a pair.

## Verify on Snowtrace (optional)

```bash
npx hardhat verify --network fuji <MATCH_STAKING_ADDRESS> "10000000000000000"
npx hardhat verify --network fuji <MILESTONE_ESCROW_ADDRESS>
```

Set `SNOWTRACE_API_KEY` in `.env` first.
