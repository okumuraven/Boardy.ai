import { createThirdwebClient, getContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { matchStakingAbi } from "./matchStakingAbi";

// Fetch the client ID securely from the environment
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId) {
  console.warn("VITE_THIRDWEB_CLIENT_ID is missing in .env file. Thirdweb authentication will fail.");
}

// 1. Initialize the Thirdweb Client
export const client = createThirdwebClient({
  clientId: clientId || "",
});

// 2. Define the Target Network for Vokazi (Avalanche Fuji Testnet)
// Chain ID for Avalanche Fuji is 43113
export const activeChain = defineChain(43113);

// 3. The Avalanche Trust-Gate contract: both sides stake here (real AVAX
// on Fuji) once they've mutually accepted a match, before the chat unlocks.
const matchStakingAddress = import.meta.env.VITE_MATCH_STAKING_ADDRESS;

if (!matchStakingAddress) {
  console.warn("VITE_MATCH_STAKING_ADDRESS is missing in .env file. Staking will fail.");
}

export const matchStakingContract = getContract({
  client,
  chain: activeChain,
  address: matchStakingAddress || "",
  abi: matchStakingAbi,
});

export const stakeAmountAvax = import.meta.env.VITE_STAKE_AMOUNT_AVAX || "0.01";
