// Minimal ABI for VokaziMatchStaking.sol - only the function the
// frontend actually calls. `createMatch` is owner-only (submitted by the
// backend's deployer wallet) so it isn't included here.
export const matchStakingAbi = [
  {
    type: "function",
    name: "stake",
    stateMutability: "payable",
    inputs: [{ name: "matchId", type: "bytes32" }],
    outputs: [],
  },
];
