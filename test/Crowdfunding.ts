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

  describe("Campaign creation", () => {
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
      expect(infos[0][0]).to.be.equal(false);
      expect(infos[0][1]).to.be.equal(1e10); // check fundingGoal
      expect(infos[0][2]).to.be.equal(0); // check totalRaise
      expect(infos[0][3]).to.be.equal(startDate);
      expect(infos[0][4]).to.be.equal(endDate);
      expect(infos[0][5]).to.be.equal(name);
      expect(infos[0][6]).to.be.equal(description);
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
      expect(result[0]).to.be.equal(false);
      expect(result[1]).to.be.equal(1e10); // check fundingGoal
      expect(result[2]).to.be.equal(0); // check totalRaise
      expect(result[3]).to.be.equal(startDate);
      expect(result[4]).to.be.equal(endDate);
      expect(result[5]).to.be.equal(name);
      expect(result[6]).to.be.equal(description);
    });

    it("Owner can create a campaign", async () => {
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

  describe("Fund a campaign", () => {
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
      expect(infos[0][1]).to.be.equal(1e10); // check fundingGoal
      expect(infos[0][2]).to.be.equal(2e9); // check totalRaise
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
      expect(infos[0][1]).to.be.equal(1e10); // check fundingGoal
      expect(infos[0][2]).to.be.equal(3e10); // check totalRaise
    });

    it("Alice can not claim funds before campaigns is finished", async () => {
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

      await crowdfunding.connect(alice).pledge(
        0, // campaignId
        1e9 // amount
      );

      let result = await crowdfunding.getInfo();
      let infos = result[1];
      expect(infos.length).to.be.equal(1);
      expect(infos[0][2]).to.be.equal(1e9); // check totalRaise

      await expect(crowdfunding.claim(0)).to.be.revertedWith(
        "The campaign has not finished yet"
      );
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

  describe("Claim funds", () => {
    it("Users can claim their funds back after endDate of campaigns (raise not reached)", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;

      const startDate2 = currentTime + 1.5 * ONE_DAY;
      const endDate2 = currentTime + 4 * ONE_DAY;

      // create campaign 1
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      // create campaign 2
      await crowdfunding
        .connect(owner)
        .createCampaign(
          fundingGoal * 2,
          startDate2,
          endDate2,
          "Marketing",
          "Something about Marketing goals"
        );

      const aliceBalanceBefore = await token.balanceOf(alice.address);
      const bobBalanceBefore = await token.balanceOf(bob.address);

      await time.increase(ONE_DAY);

      // top up a campaign
      await token.connect(bob).approve(crowdfunding.address, 4e10);
      await token.connect(alice).approve(crowdfunding.address, 1e10);

      await crowdfunding.connect(bob).pledge(0, 1e6);
      await crowdfunding.connect(alice).pledge(0, 1e7);

      await time.increase(1.5 * ONE_DAY);

      await crowdfunding.connect(bob).pledge(1, 1e3);
      await crowdfunding.connect(alice).pledge(1, 1e3);

      const result = await crowdfunding.getInfo();
      let infos = result[1];
      expect(infos.length).to.be.equal(2);
      expect(infos[0][1]).to.be.equal(1e10); // check fundingGoal1
      expect(infos[0][2]).to.be.equal(11e6); // check totalRaise1

      expect(infos[1][1]).to.be.equal(2e10); // check fundingGoal2
      expect(infos[1][2]).to.be.equal(2e3); // check totalRaise2
      expect(await token.balanceOf(crowdfunding.address)).to.be.equal(
        2e3 + 11e6
      ); // check totalRaise

      expect(await crowdfunding.pledgedFunds(bob.address, 0)).to.be.equal(1e6);
      expect(await crowdfunding.pledgedFunds(bob.address, 1)).to.be.equal(1e3);

      expect(await crowdfunding.pledgedFunds(alice.address, 0)).to.be.equal(
        1e7
      );
      expect(await crowdfunding.pledgedFunds(alice.address, 1)).to.be.equal(
        1e3
      );

      // final check that users can claim their tokens back

      await time.increase(4 * ONE_DAY);

      await crowdfunding.connect(alice).claim(0);
      await crowdfunding.connect(alice).claim(1);
      await crowdfunding.connect(bob).claim(0);
      await crowdfunding.connect(bob).claim(1);

      expect(await crowdfunding.pledgedFunds(bob.address, 0)).to.be.equal(0);
      expect(await crowdfunding.pledgedFunds(bob.address, 1)).to.be.equal(0);

      expect(await crowdfunding.pledgedFunds(alice.address, 0)).to.be.equal(0);
      expect(await crowdfunding.pledgedFunds(alice.address, 1)).to.be.equal(0);

      expect(await token.balanceOf(alice.address)).to.be.equal(
        aliceBalanceBefore
      );
      expect(await token.balanceOf(bob.address)).to.be.equal(bobBalanceBefore);
      expect(await token.balanceOf(crowdfunding.address)).to.be.equal(0);
    });

    it("Users can not claim their funds back after endDate of campaigns (raise reached)", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;

      const startDate2 = currentTime + 1.5 * ONE_DAY;
      const endDate2 = currentTime + 4 * ONE_DAY;

      // create campaign 1
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      // create campaign 2
      await crowdfunding
        .connect(owner)
        .createCampaign(
          fundingGoal * 2,
          startDate2,
          endDate2,
          "Marketing",
          "Something about Marketing goals"
        );

      const aliceBalanceBefore = await token.balanceOf(alice.address);
      const bobBalanceBefore = await token.balanceOf(bob.address);

      await time.increase(ONE_DAY);

      // top up a campaign
      await token.connect(bob).approve(crowdfunding.address, 20e10);
      await token.connect(alice).approve(crowdfunding.address, 20e10);

      await crowdfunding.connect(bob).pledge(0, 1e9);
      await crowdfunding.connect(alice).pledge(0, 10e9);

      await time.increase(1.5 * ONE_DAY);

      await crowdfunding.connect(bob).pledge(1, 1e10);
      await crowdfunding.connect(alice).pledge(1, 1e10);

      const result = await crowdfunding.getInfo();
      let infos = result[1];
      expect(infos.length).to.be.equal(2);
      expect(infos[0][1]).to.be.equal(1e10); // check fundingGoal1
      expect(infos[0][2]).to.be.equal(11e9); // check totalRaise1

      expect(infos[1][1]).to.be.equal(2e10); // check fundingGoal2
      expect(infos[1][2]).to.be.equal(2e10); // check totalRaise2
      expect(await token.balanceOf(crowdfunding.address)).to.be.equal(
        11e9 + 2e10
      ); // check total

      expect(await crowdfunding.pledgedFunds(bob.address, 0)).to.be.equal(1e9);
      expect(await crowdfunding.pledgedFunds(bob.address, 1)).to.be.equal(1e10);
      expect(await crowdfunding.pledgedFunds(alice.address, 0)).to.be.equal(
        1e10
      );
      expect(await crowdfunding.pledgedFunds(alice.address, 1)).to.be.equal(
        1e10
      );

      // final check that users can not claim their tokens back

      await time.increase(4 * ONE_DAY);

      await expect(crowdfunding.connect(alice).claim(0)).to.be.revertedWith(
        "Can not claim. Funds successfully raised"
      );
      await expect(crowdfunding.connect(alice).claim(1)).to.be.revertedWith(
        "Can not claim. Funds successfully raised"
      );
      await expect(crowdfunding.connect(bob).claim(0)).to.be.revertedWith(
        "Can not claim. Funds successfully raised"
      );
      await expect(crowdfunding.connect(bob).claim(1)).to.be.revertedWith(
        "Can not claim. Funds successfully raised"
      );

      // Balances the same. They will not be used anymore for these campaigns
      expect(await crowdfunding.pledgedFunds(bob.address, 0)).to.be.equal(1e9);
      expect(await crowdfunding.pledgedFunds(bob.address, 1)).to.be.equal(1e10);

      expect(await crowdfunding.pledgedFunds(alice.address, 0)).to.be.equal(
        1e10
      );
      expect(await crowdfunding.pledgedFunds(alice.address, 1)).to.be.equal(
        1e10
      );

      expect(await token.balanceOf(alice.address)).to.be.equal(
        aliceBalanceBefore - 1e10 - 1e10
      );
      expect(await token.balanceOf(bob.address)).to.be.equal(
        bobBalanceBefore - 1e9 - 1e10
      );
      expect(await token.balanceOf(crowdfunding.address)).to.be.equal(
        1e9 + 3 * 1e10
      );
    });

    it("Only owner can get funds back after funding goal is met", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;

      const startDate2 = currentTime + 1.5 * ONE_DAY;
      const endDate2 = currentTime + 4 * ONE_DAY;

      // create campaign 1
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      // create campaign 2
      await crowdfunding
        .connect(owner)
        .createCampaign(
          fundingGoal * 2,
          startDate2,
          endDate2,
          "Marketing",
          "Something about Marketing goals"
        );

      await time.increase(ONE_DAY);

      // top up a campaign
      await token.connect(bob).approve(crowdfunding.address, 20e10);
      await token.connect(alice).approve(crowdfunding.address, 20e10);

      await crowdfunding.connect(bob).pledge(0, 1e9);
      await crowdfunding.connect(alice).pledge(0, 100e9);

      // can not be executed earlier
      await expect(crowdfunding.connect(owner).getTokens(0)).to.be.revertedWith(
        "The funding goal has not reached yet"
      );

      await time.increase(1.5 * ONE_DAY);

      await crowdfunding.connect(bob).pledge(1, 1e10);
      await crowdfunding.connect(alice).pledge(1, 1e10);
      const expectedBalance = 1e9 + 100e9 + 2 * 1e10;
      expect(await token.balanceOf(crowdfunding.address)).to.be.equal(
        expectedBalance
      ); // check total

      // can not be executed earlier
      await expect(crowdfunding.connect(owner).getTokens(1)).to.be.revertedWith(
        "The funding goal has not reached yet"
      );

      // final check that users can not claim their tokens back
      await time.increase(4 * ONE_DAY);

      expect(await token.balanceOf(crowdfunding.address)).to.be.equal(
        expectedBalance
      );

      let result = await crowdfunding.campaigns(0);
      expect(result[1]).to.be.equal(1e10); // goal
      expect(result[2]).to.be.equal(101e9); // totalRaise

      result = await crowdfunding.campaigns(1);
      expect(result[1]).to.be.equal(2e10); // goal
      expect(result[2]).to.be.equal(2e10); // totalRaise

      // check that owner can get tokens after the end Date
      const ownerBalanceBefore = await token.balanceOf(owner.address);
      await expect(crowdfunding.connect(bob).getTokens(0)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );

      await crowdfunding.connect(owner).getTokens(0);
      await crowdfunding.connect(owner).getTokens(1);

      expect(await token.balanceOf(owner.address)).to.be.equal(
        ownerBalanceBefore + expectedBalance
      );
    });

    it("Owner can not execute get funds twice", async () => {
      // define a campaign
      const currentTime = await time.latest();
      const startDate = currentTime + ONE_DAY;
      const endDate = currentTime + 2 * ONE_DAY;

      // create campaign
      await crowdfunding
        .connect(owner)
        .createCampaign(fundingGoal, startDate, endDate, name, description);

      await time.increase(ONE_DAY);

      // top up a campaign
      await token.connect(bob).approve(crowdfunding.address, 20e10);
      await token.connect(alice).approve(crowdfunding.address, 20e10);

      await crowdfunding.connect(bob).pledge(0, 1e9);
      await crowdfunding.connect(alice).pledge(0, 100e9);

      const expectedBalance = 1e9 + 100e9;
      expect(await token.balanceOf(crowdfunding.address)).to.be.equal(
        expectedBalance
      ); // check total

      // can not be executed earlier
      await expect(crowdfunding.connect(owner).getTokens(0)).to.be.revertedWith(
        "The funding goal has not reached yet"
      );
      // final check that users can not claim their tokens back
      await time.increase(4 * ONE_DAY);

      expect(await token.balanceOf(crowdfunding.address)).to.be.equal(
        expectedBalance
      );

      // check that owner can get tokens after the end Date
      const ownerBalanceBefore = await token.balanceOf(owner.address);

      await crowdfunding.connect(owner).getTokens(0);

      expect(await token.balanceOf(owner.address)).to.be.equal(
        ownerBalanceBefore + expectedBalance
      );

      await expect(crowdfunding.connect(owner).getTokens(0)).to.be.revertedWith(
        "Can not get tokens twice for the same campaign"
      );
    });
  });
});
