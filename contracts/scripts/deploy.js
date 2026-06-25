const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// 0.01 AVAX on Fuji — matches Dashboard.jsx copy
const STAKE_AMOUNT = hre.ethers.parseEther("0.01");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("Deploying Boardy contracts");
  console.log("  Network:", hre.network.name, `(chainId ${network.chainId})`);
  console.log("  Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("  Balance:", hre.ethers.formatEther(balance), "AVAX");

  const MatchStaking = await hre.ethers.getContractFactory("BoardyMatchStaking");
  const matchStaking = await MatchStaking.deploy(STAKE_AMOUNT);
  await matchStaking.waitForDeployment();

  const MilestoneEscrow = await hre.ethers.getContractFactory("BoardyMilestoneEscrow");
  const milestoneEscrow = await MilestoneEscrow.deploy();
  await milestoneEscrow.waitForDeployment();

  const matchStakingAddress = await matchStaking.getAddress();
  const milestoneEscrowAddress = await milestoneEscrow.getAddress();

  console.log("\nDeployed:");
  console.log("  BoardyMatchStaking:", matchStakingAddress);
  console.log("  BoardyMilestoneEscrow:", milestoneEscrowAddress);
  console.log("  Stake amount:", hre.ethers.formatEther(STAKE_AMOUNT), "AVAX");

  const deployment = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      BoardyMatchStaking: {
        address: matchStakingAddress,
        stakeAmountWei: STAKE_AMOUNT.toString(),
        stakeAmountAvax: "0.01",
      },
      BoardyMilestoneEscrow: {
        address: milestoneEscrowAddress,
      },
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log("\nSaved deployment manifest:", outFile);

  if (hre.network.name === "fuji") {
    console.log("\nFuji explorer links:");
    console.log(`  MatchStaking: https://testnet.snowtrace.io/address/${matchStakingAddress}`);
    console.log(`  MilestoneEscrow: https://testnet.snowtrace.io/address/${milestoneEscrowAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
