# Vokazi.ai Smart Contracts Documentation

This document serves as a comprehensive guide for collaborators to understand the smart contracts that power the Vokazi.ai Web3 ecosystem.

## Overview
Vokazi.ai uses smart contracts to guarantee commitment and facilitate secure escrow between matched users (e.g., developers and founders). The contracts are currently deployed on the **Avalanche Fuji Testnet** (Chain ID: `43113`).

### Deployed Contracts
- **VokaziMatchStaking**: `0x3e5E4D5FA56fa78F9665Bc36b8D08964Dc790eFA`
- **VokaziMilestoneEscrow**: `0xb26Ef6c2fC70D831924622fa783b1cc800eb3F64`

---

## 1. VokaziMatchStaking
This contract handles bilateral commitment staking. When the AI matches two users, both must stake a small amount (0.01 AVAX) to unlock the introduction.

### The Flow
1. **Match Creation**: The backend (acting as the deployer/admin) calls `createMatch(matchId, userA, userB)` when it identifies a strong match via pgvector.
2. **Staking**: `userA` and `userB` both call `stake(matchId)` and send `0.01 AVAX`.
3. **Unlock**: Once both users have staked, the match is marked as `Unlocked`. An event `MatchUnlocked` is emitted.
4. **Withdrawal**: Both users can then call `withdrawStake(matchId)` to reclaim their 0.01 AVAX. The stake serves purely as a sybil-resistance and commitment mechanism.
5. **Refund**: If one party flakes and never stakes, the user who *did* stake can call `refundUnmatched(matchId)` to retrieve their funds.

---

## 2. VokaziMilestoneEscrow
This contract is used for handling the actual deliverables between the matched users (for instance, a founder paying a developer).

### The Flow
1. **Deposit**: The funder deposits AVAX into the escrow contract for specific milestones.
2. **Release**: Once the milestone is completed and approved, the funds are released to the worker.

---

## Deployment Details
- **Network**: Avalanche Fuji Testnet
- **Chain ID**: `43113`
- **RPC URL**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Deployer Wallet**: `0x9d52Ad13d70C8404a1a2439961eC9e8495245A13`
- **Deployment Manifest**: Saved locally in `contracts/deployments/fuji.json`

## Integration Guide

### Frontend
Add the following to your `frontend/.env`:
```env
VITE_CHAIN_ID=43113
VITE_MATCH_STAKING_ADDRESS=0x3e5E4D5FA56fa78F9665Bc36b8D08964Dc790eFA
VITE_MILESTONE_ESCROW_ADDRESS=0xb26Ef6c2fC70D831924622fa783b1cc800eb3F64
```
Use `ethers.js` or `thirdweb` to interact with the contracts, calling the `stake` function with `parseEther("0.01")` when a match is presented.

### Backend
The Elixir backend must hold the private key of the deployer wallet (or an authorized admin wallet). When `pgvector` finds a match, the backend calculates a deterministic `matchId` and sends a transaction to `createMatch(matchId, userA, userB)` on the `VokaziMatchStaking` contract.
