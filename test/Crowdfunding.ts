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
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  describe.only("Campaign creation", () => {
    it("The crowdfunding contract can not be deployed with zero addresses", async () => {
      const cf = await ethers.getContractFactory("Crowdfunding");

      await expect(
        cf.deploy(ethers.constants.AddressZero, owner.address)
      ).to.be.revertedWith("The main token address can not be zero");

      await expect(
        cf.deploy(token.address, ethers.constants.AddressZero)
      ).to.be.revertedWith("The owner address can not be zero");

      await expect(
        cf.deploy(ethers.constants.AddressZero, ethers.constants.AddressZero)
      ).to.be.revertedWith("The main token address can not be zero");
    });

    it("Token balances for the users", async () => {
      expect(await token.balanceOf(owner.address)).to.be.equal(0);
      expect(await token.balanceOf(crowdfunding.address)).to.be.equal(0);
      expect(await token.balanceOf(bob.address)).to.be.equal(1e12);
      expect(await token.balanceOf(alice.address)).to.be.equal(2e12);
    });

    it("An owner of contract can create campaigns", async () => {
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
      expect(infos[0][2]).to.be.equal(startDate);
      expect(infos[0][3]).to.be.equal(endDate);
      expect(infos[0][4]).to.be.equal(name);
      expect(infos[0][5]).to.be.equal(description);
    });

    it("Can get the information about certain campaign", async () => {
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
      expect(result[2]).to.be.equal(startDate);
      expect(result[3]).to.be.equal(endDate);
      expect(result[4]).to.be.equal(name);
      expect(result[5]).to.be.equal(description);
    });

    it("Only owner can create a campaign", async () => {
      await expect(crowdfunding.campaigns(0)).to.be.reverted;

      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;
      await expect(
        crowdfunding
          .connect(bob)
          .createCampaign(fundingGoal, startDate, endDate, name, description)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(crowdfunding.campaigns(0)).to.be.reverted;
    });

    it("Owner can not create a campaign if start date the same as end date", async () => {
      await expect(crowdfunding.campaigns(0)).to.be.reverted;

      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + ONE_DAY;
      await expect(
        crowdfunding
          .connect(owner)
          .createCampaign(fundingGoal, startDate, endDate, name, description)
      ).to.be.revertedWith(
        "The campaign`s end date must be more than start date"
      );

      await expect(crowdfunding.campaigns(0)).to.be.reverted;
    });

    it("Owner can not create a campaign if start date > end date", async () => {
      await expect(crowdfunding.campaigns(0)).to.be.reverted;

      const currentTime = await time.latest();
      const startDate = currentTime + 2 * ONE_DAY;
      const endDate = currentTime + ONE_DAY;
      await expect(
        crowdfunding
          .connect(owner)
          .createCampaign(fundingGoal, startDate, endDate, name, description)
      ).to.be.revertedWith(
        "The campaign`s end date must be more than start date"
      );

      await expect(crowdfunding.campaigns(0)).to.be.reverted;
    });

    it("Can not create a new campaign is max reached (25)", async () => {
      await expect(crowdfunding.campaigns(0)).to.be.reverted;

      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;
      for (let i = 0; i < 25; ++i) {
        await crowdfunding
          .connect(owner)
          .createCampaign(fundingGoal, startDate, endDate, name, description);
      }

      await expect(
        crowdfunding
          .connect(owner)
          .createCampaign(fundingGoal, startDate, endDate, name, description)
      ).to.be.revertedWith("Maximum campaigns reached");

      const result = await crowdfunding.getInfo();
      let indexes = result[0];
      expect(indexes.length).to.be.equal(25);
    });

    it("Check that the funding goal can not be zero value", async () => {
      await expect(crowdfunding.campaigns(0)).to.be.reverted;

      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;

      await expect(
        crowdfunding
          .connect(owner)
          .createCampaign(0, startDate, endDate, name, description)
      ).to.be.revertedWith("The funding goal can not be zero value");

      const result = await crowdfunding.getInfo();
      let indexes = result[0];
      expect(indexes.length).to.be.equal(0);
    });
  });

  describe.only("Fund a campaign", () => {
    it("Check that bob can not top up the campaign without approve", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      await time.increase(ONE_DAY);
      // top up a campaign by bob
      await expect(
        crowdfunding.connect(bob).pledge(
          0, // campaignId
          1e10 // amount
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Check that bob and alice can top up the active campaign", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      await time.increase(ONE_DAY);

      // top up a campaign
      await token.connect(bob).approve(crowdfunding.address, 1e9);
      await token.connect(alice).approve(crowdfunding.address, 1e9);

      await crowdfunding.connect(bob).pledge(
        0, // campaignId
        1e9 // amount
      );

      await crowdfunding.connect(alice).pledge(
        0, // campaignId
        1e9 // amount
      );

      const result = await crowdfunding.getInfo();
      let infos = result[1];
      expect(infos.length).to.be.equal(1);
      expect(infos[0][0]).to.be.equal(1e10); // check fundingGoal
      expect(infos[0][1]).to.be.equal(2e9); // check totalRaise
    });

    it("Alice can top up the campaign that already reached fundingGoal but not its end time", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      await time.increase(ONE_DAY);

      // top up a campaign
      await token.connect(bob).approve(crowdfunding.address, 2e10);
      await token.connect(alice).approve(crowdfunding.address, 1e10);

      await crowdfunding.connect(bob).pledge(
        0, // campaignId
        2e10 // amount
      );

      await crowdfunding.connect(alice).pledge(
        0, // campaignId
        1e10 // amount
      );

      const result = await crowdfunding.getInfo();
      let infos = result[1];
      expect(infos.length).to.be.equal(1);
      expect(infos[0][0]).to.be.equal(1e10); // check fundingGoal
      expect(infos[0][1]).to.be.equal(3e10); // check totalRaise
    });

    it("Check that alice can not top up non-active campaign", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      await time.increase(3 * ONE_DAY);

      // top up a campaign
      await token.connect(alice).approve(crowdfunding.address, 1e10);

      await expect(
        crowdfunding.connect(alice).pledge(
          0, // campaignId
          1e10 // amount
        )
      ).to.be.revertedWith("The campaign is not active");
    });

    it("Check that alice can not top up a campaign using 0 amount as parameter", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      await time.increase(ONE_DAY);

      // top up a campaign
      await token.connect(alice).approve(crowdfunding.address, 1e10);

      await expect(
        crowdfunding.connect(alice).pledge(
          0, // campaignId
          0 // amount
        )
      ).to.be.revertedWith("Pledged amount should be more than zero");
    });

    it("Check that alice can not top up a non-exist campaign", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      await time.increase(3 * ONE_DAY);

      // top up a campaign
      await token.connect(alice).approve(crowdfunding.address, 1e10);

      await expect(
        crowdfunding.connect(alice).pledge(
          10, // campaignId
          1e10 // amount
        )
      ).to.be.revertedWith("Invalid campaign Id");
    });
  });
});
