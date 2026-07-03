const { expect } = require("chai");
const { ethers } = require("hardhat");

const STAKE = ethers.parseEther("0.01");

describe("BoardyMatchStaking", function () {
  let staking;
  let owner;
  let userA;
  let userB;
  let matchId;

  beforeEach(async function () {
    [owner, userA, userB] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BoardyMatchStaking");
    staking = await Factory.deploy(STAKE);
    matchId = ethers.id("match-1");
    await staking.createMatch(matchId, userA.address, userB.address);
  });

  it("creates a match with pending status", async function () {
    const match = await staking.getMatch(matchId);
    expect(match.userA).to.equal(userA.address);
    expect(match.userB).to.equal(userB.address);
    expect(match.status).to.equal(0n); // Pending
  });

  it("unlocks when both parties stake", async function () {
    await expect(staking.connect(userA).stake(matchId, { value: STAKE }))
      .to.emit(staking, "Staked")
      .withArgs(matchId, userA.address, 1n); // StakedA

    await expect(staking.connect(userB).stake(matchId, { value: STAKE }))
      .to.emit(staking, "MatchUnlocked")
      .withArgs(matchId, userA.address, userB.address);

    const match = await staking.getMatch(matchId);
    expect(match.status).to.equal(3n); // Unlocked
  });

  it("allows either party to stake first", async function () {
    await staking.connect(userB).stake(matchId, { value: STAKE });
    await staking.connect(userA).stake(matchId, { value: STAKE });

    const match = await staking.getMatch(matchId);
    expect(match.status).to.equal(3n);
  });

  it("rejects incorrect stake amount", async function () {
    await expect(
      staking.connect(userA).stake(matchId, { value: ethers.parseEther("0.02") })
    ).to.be.revertedWithCustomError(staking, "IncorrectStakeAmount");
  });

  it("allows withdrawal after unlock", async function () {
    await staking.connect(userA).stake(matchId, { value: STAKE });
    await staking.connect(userB).stake(matchId, { value: STAKE });

    const balanceBefore = await ethers.provider.getBalance(userA.address);
    const tx = await staking.connect(userA).withdrawStake(matchId);
    const receipt = await tx.wait();
    const gas = receipt.gasUsed * receipt.gasPrice;
    const balanceAfter = await ethers.provider.getBalance(userA.address);

    expect(balanceAfter + gas - balanceBefore).to.equal(STAKE);
  });

  it("refunds when counterparty never stakes", async function () {
    await staking.connect(userA).stake(matchId, { value: STAKE });

    const balanceBefore = await ethers.provider.getBalance(userA.address);
    const tx = await staking.connect(userA).refundUnmatched(matchId);
    const receipt = await tx.wait();
    const gas = receipt.gasUsed * receipt.gasPrice;
    const balanceAfter = await ethers.provider.getBalance(userA.address);

    expect(balanceAfter + gas - balanceBefore).to.equal(STAKE);

    const match = await staking.getMatch(matchId);
    expect(match.status).to.equal(4n); // Refunded
  });

  it("slashes offender stake to owner", async function () {
    await staking.connect(userA).stake(matchId, { value: STAKE });
    await staking.connect(userB).stake(matchId, { value: STAKE });

    const ownerBefore = await ethers.provider.getBalance(owner.address);
    const tx = await staking.slash(matchId, userA.address);
    const receipt = await tx.wait();
    const gas = receipt.gasUsed * receipt.gasPrice;
    const ownerAfter = await ethers.provider.getBalance(owner.address);

    expect(ownerAfter + gas - ownerBefore).to.equal(STAKE);
  });
});

describe("BoardyMilestoneEscrow", function () {
  let escrow;
  let owner;
  let payer;
  let payee;
  let milestoneId;
  const amount = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, payer, payee] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BoardyMilestoneEscrow");
    escrow = await Factory.deploy();
    milestoneId = ethers.id("milestone-1");
    await escrow.createMilestone(milestoneId, payer.address, payee.address, amount, "MVP delivery");
  });

  it("funds, completes, and releases milestone", async function () {
    await escrow.connect(payer).fundMilestone(milestoneId, { value: amount });
    await escrow.connect(payee).markCompleted(milestoneId);

    const payeeBefore = await ethers.provider.getBalance(payee.address);
    await escrow.connect(payer).release(milestoneId);
    const payeeAfter = await ethers.provider.getBalance(payee.address);

    expect(payeeAfter - payeeBefore).to.equal(amount);
  });

  it("allows payer refund before release", async function () {
    await escrow.connect(payer).fundMilestone(milestoneId, { value: amount });

    const payerBefore = await ethers.provider.getBalance(payer.address);
    const tx = await escrow.connect(payer).refund(milestoneId);
    const receipt = await tx.wait();
    const gas = receipt.gasUsed * receipt.gasPrice;
    const payerAfter = await ethers.provider.getBalance(payer.address);

    expect(payerAfter + gas - payerBefore).to.equal(amount);
  });

  it("resolves disputes via owner", async function () {
    await escrow.connect(payer).fundMilestone(milestoneId, { value: amount });
    await escrow.connect(payee).openDispute(milestoneId);

    const payeeBefore = await ethers.provider.getBalance(payee.address);
    await escrow.resolveDispute(milestoneId, payee.address);
    const payeeAfter = await ethers.provider.getBalance(payee.address);

    expect(payeeAfter - payeeBefore).to.equal(amount);
  });
});
