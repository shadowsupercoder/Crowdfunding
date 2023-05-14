import { time, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";

import * as hre from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Crowdfunding, IceToken } from "../typechain-types";

const { ethers, network } = hre;

describe("Crowdfunding", () => {
  let snapshot: number;
  const ONE_DAY: number = 24 * 60 * 60;
  const fundingGoal = 1e10;
  const name = "Development";
  const description = "Funds to create demo projects";

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carl: SignerWithAddress;

  let token: IceToken;
  let crowdfunding: Crowdfunding;

  before(async () => {
    [owner, alice, bob, carl] = await ethers.getSigners();
    // Deploy contracts
    const CrowdfundingContract = await ethers.getContractFactory(
      "Crowdfunding"
    );

    const IceTokenContract = await ethers.getContractFactory("IceToken");

    token = await IceTokenContract.deploy();
    await token.deployed();

    crowdfunding = await CrowdfundingContract.connect(owner).deploy(
      token.address,
      owner.address
    );
    await crowdfunding.deployed();

    // top up the users
    await token.connect(owner).mint(3e12);
    await token.connect(owner).transfer(bob.address, 1e12);
    await token.connect(owner).transfer(alice.address, 2e12);
    await token.connect(bob).approve(crowdfunding.address, 1e12);
    await token.connect(alice).approve(crowdfunding.address, 2e12);
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  it.only("check token balances for the users", async () => {
    expect(await token.balanceOf(owner.address)).to.be.equal(0);
    expect(await token.balanceOf(crowdfunding.address)).to.be.equal(0);
    expect(await token.balanceOf(bob.address)).to.be.equal(1e12);
    expect(await token.balanceOf(alice.address)).to.be.equal(2e12);
  });

  it.only("check that an owner of contract can create campaigns", async () => {
    let result = await crowdfunding.getInfo();
    expect(result[0]).to.be.empty; // check indexes before
    expect(result[1]).to.be.empty; // check values before
    const currentTime = await time.latest();
    const startDate = currentTime + ONE_DAY;
    const endDate = currentTime + 2 * ONE_DAY;
    await crowdfunding
      .connect(owner)
      .createCampaign(fundingGoal, startDate, endDate, name, description);

    result = await crowdfunding.getInfo();
    let indexes = result[0];
    let infos = result[1];
    expect(indexes.length).to.be.equal(1);
    expect(infos.length).to.be.equal(1);
    expect(indexes[0]).to.be.equal(0); // check index
    expect(infos[0][0]).to.be.equal(1e10); // check fundingGoal
    expect(infos[0][1]).to.be.equal(0); // check totalRaise
    expect(infos[0][2]).to.be.equal(startDate); // check end date
    expect(infos[0][3]).to.be.equal(endDate); // check end date
    expect(infos[0][4]).to.be.equal(name); // check end date
    expect(infos[0][5]).to.be.equal(description); // check end date
  });

  it.only("check that can get the information about certain campaign", async () => {
    await expect(crowdfunding.campaigns(0)).to.be.reverted;

    const currentTime = await time.latest();
    const startDate = currentTime + ONE_DAY;
    const endDate = currentTime + 2 * ONE_DAY;
    await crowdfunding
      .connect(owner)
      .createCampaign(fundingGoal, startDate, endDate, name, description);

    const result = await crowdfunding.campaigns(0);
    expect(result[0]).to.be.equal(1e10); // check fundingGoal
    expect(result[1]).to.be.equal(0); // check totalRaise
    expect(result[2]).to.be.equal(startDate); // check end date
    expect(result[3]).to.be.equal(endDate); // check end date
    expect(result[4]).to.be.equal(name); // check end date
    expect(result[5]).to.be.equal(description); // check end date
  });

  
});
