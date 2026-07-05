import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";

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
