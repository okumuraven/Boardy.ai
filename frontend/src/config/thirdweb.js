import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";

// Fetch the client ID securely from the environment
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId) {
  console.warn("VITE_THIRDWEB_CLIENT_ID is missing in .env file. Thirdweb authentication will fail.");
}

// 1. Initialize the Thirdweb Client - Google sign-in identity only. The
// Avalanche staking contract this used to also configure was removed per
// direct Kuzana feedback (friction) - see boardy_comparison.md.
export const client = createThirdwebClient({
  clientId: clientId || "",
});

// 2. The in-app wallet still needs a chain to provision on, even with no
// on-chain actions left to take - Ethereum mainnet is the neutral default
// here, not a leftover from the removed Avalanche staking mechanic.
export const activeChain = defineChain(1);
