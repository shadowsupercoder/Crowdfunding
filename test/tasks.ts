import { time, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";

import * as hre from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Crowdfunding, IceToken } from "../typechain-types";

const { ethers, network, run } = hre;

describe("Crowdfunding", () => {
  let snapshot: number;
  const ONE_DAY: number = 24 * 60 * 60;
  const fundingGoal = 1e10;
  const name = "Development";
  const description = "Funds to create demo projects";

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  let token: IceToken;
  let crowdfunding: Crowdfunding;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
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
    it("check that `create` script creates campaigns", async () => {
      const currentTime = await time.latest();
      const startDate: number = currentTime + ONE_DAY;
      const endDate: number = currentTime + 2 * ONE_DAY;
      
      await run("create", {
        crowdfunding: crowdfunding.address,
        fundingGoal: fundingGoal.toString(),
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        name: name,
        description: description,
      });

      const result = await crowdfunding.getInfo();
      const indexes = result[0];
      const infos = result[1];
      expect(indexes.length).to.be.equal(1);
      expect(infos.length).to.be.equal(1);
      expect(indexes[0]).to.be.equal(0); // check index
      expect(infos[0][0]).to.be.equal(false); // finished
      expect(infos[0][1]).to.be.equal(1e10); // check fundingGoal
      expect(infos[0][2]).to.be.equal(0); // check totalRaise
      expect(infos[0][3]).to.be.equal(startDate);
      expect(infos[0][4]).to.be.equal(endDate);
      expect(infos[0][5]).to.be.equal(name);
      expect(infos[0][6]).to.be.equal(description);
    });

    it("check that `create` script raise error if campaigns was tot created", async () => {
      const currentTime = await time.latest();
      const startDate: number = currentTime + ONE_DAY;
      const endDate: number = currentTime + 2 * ONE_DAY;
      
      await expect(run("create", {
        crowdfunding: crowdfunding.address,
        fundingGoal: '0', // wrong amount
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        name: name,
        description: description,
      })).to.be.revertedWith('The funding goal can not be zero value');

      const result = await crowdfunding.getInfo();
      const indexes = result[0];
      const infos = result[1];
      expect(indexes.length).to.be.equal(0);
      expect(infos.length).to.be.equal(0);
    });
  });

    describe.only("Fund a campaign", () => {
      it("check that `create` script creates campaigns", async () => {
      const currentTime = await time.latest();
      const startDate: number = currentTime + ONE_DAY;
      const endDate: number = currentTime + 2 * ONE_DAY;
      
      await run("create", {
        crowdfunding: crowdfunding.address,
        fundingGoal: fundingGoal.toString(),
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        name: name,
        description: description,
      });

      const result = await crowdfunding.getInfo();
      const indexes = result[0];
      const infos = result[1];
      expect(indexes.length).to.be.equal(1);
      expect(infos.length).to.be.equal(1);
      expect(indexes[0]).to.be.equal(0); // check index
      expect(infos[0][0]).to.be.equal(false); // finished
      expect(infos[0][1]).to.be.equal(1e10); // check fundingGoal
      expect(infos[0][2]).to.be.equal(0); // check totalRaise
      expect(infos[0][3]).to.be.equal(startDate);
      expect(infos[0][4]).to.be.equal(endDate);
      expect(infos[0][5]).to.be.equal(name);
      expect(infos[0][6]).to.be.equal(description);
    });

    it("check that `create` script raise error if campaigns was tot created", async () => {
      const currentTime = await time.latest();
      const startDate: number = currentTime + ONE_DAY;
      const endDate: number = currentTime + 2 * ONE_DAY;
      
      await expect(run("create", {
        crowdfunding: crowdfunding.address,
        fundingGoal: '0', // wrong amount
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        name: name,
        description: description,
      })).to.be.revertedWith('The funding goal can not be zero value');

      const result = await crowdfunding.getInfo();
      const indexes = result[0];
      const infos = result[1];
      expect(indexes.length).to.be.equal(0);
      expect(infos.length).to.be.equal(0);
    });
    });

});
