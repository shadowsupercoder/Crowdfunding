import { time, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";

import * as hre from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Crowdfunding, IceToken } from "../typechain-types";

const { ethers, network, run } = hre;

/*
  These tests were developed only to quick check main logic using tasks
*/
describe.only("Crowdfunding DEMOs tests using tasks \n", () => {
  let snapshot: number;
  const ONE_DAY: number = 24 * 60 * 60;

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  let token: IceToken;
  let crowdfunding: Crowdfunding;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  it("📄 DEMO 1: user can claim his funds back if funds goal isn't met", async () => {
    console.log(`\t\t Table 1. Demo timeline example for May, 13 - May, 19 period for two campaigns
      
      +=================================================+
      |              |     fund/daytime                 |
      |Name of camp. +----------------------------------+
      |              | 13 | 14 | 15 | 16 | 17 | 18 | 19 |
      +=================================================+
      |"Development" | -- | $$ | $$ | -- | -- | -- | -- |
      +-------------------------------------------------+
      |"New"         | -- | $$ | $$ | $$ | $$ | $$ | -- |
      +=================================================+

      '$$' - means that a user can deposit his funds\n`);

    // deploy IceToken and return use it address to deploy Crowdfunding
    const tokenAddr = await run("deploy-token");
    const token = await hre.ethers.getContractAt("IceToken", tokenAddr);

    // deploy Crowdfunding
    const crowdfundingAddr = await run("deploy", {
      token: tokenAddr,
      owner: owner.address,
    });
    const crowdfunding = await hre.ethers.getContractAt(
      "Crowdfunding",
      crowdfundingAddr
    );

    // prepare data for a "Development" and "New" campaign
    const fundingGoal = 1e10;
    const currentTime = await time.latest();
    let startDate = currentTime + ONE_DAY; // next day
    let endDate = currentTime + 2 * ONE_DAY; // current datetime + 2 days

    // create the "Development" campaign
    // TODO: check why the type in tasks requires string instead of numbers.
    await run("create", {
      crowdfunding: crowdfundingAddr,
      fundingGoal: fundingGoal.toString(),
      startDate: startDate.toString(),
      endDate: endDate.toString(),
      name: "Development",
      description: "Funds to create demo v1",
    });

    let result = await crowdfunding.campaigns(0);
    expect(result[1]).to.be.equal(fundingGoal); // goal
    expect(result[2]).to.be.equal(0); // totalRaise

    // create the "Searching" campaign
    startDate = currentTime + ONE_DAY; // next day
    endDate = currentTime + 5 * ONE_DAY; // current datetime + 5 days
    await run("create", {
      crowdfunding: crowdfundingAddr,
      fundingGoal: fundingGoal.toString(),
      startDate: startDate.toString(),
      endDate: endDate.toString(),
      name: "New",
      description: "2 months of investigation",
    });

    result = await crowdfunding.campaigns(1);
    expect(result[1]).to.be.equal(fundingGoal); // goal
    expect(result[2]).to.be.equal(0); // totalRaise

    let ownerBalBefore = await token.balanceOf(owner.address);
    // mint fundingGoal tokens to the owner
    await run("mint", {
      token: tokenAddr,
      amount: fundingGoal.toString(),
    });

    let ownerBalAfter = await token.balanceOf(owner.address);

    expect(ownerBalAfter).to.be.equal(fundingGoal);
    expect(fundingGoal).to.be.equal(ownerBalAfter - ownerBalBefore);

    console.log(`\t\t 📜 Bob\'s full address is \x1b[32m${bob.address}\x1b[0m`);
    console.log(
      `\t\t 📜 Alice\'s full address is \x1b[32m${alice.address}\x1b[0m`
    );
    ownerBalBefore = await token.balanceOf(owner.address);
    let bobBalanceBefore = await token.balanceOf(bob.address);

    // transfer half tokens to Bob acc
    await run("transferFrom", {
      token: tokenAddr,
      from: owner.address,
      to: bob.address,
      amount: (fundingGoal / 2).toString(),
    });
    ownerBalAfter = await token.balanceOf(owner.address);
    let bobBalance = await token.balanceOf(bob.address);

    expect(ownerBalAfter).to.be.equal(fundingGoal / 2);
    expect(bobBalance).to.be.equal(bobBalanceBefore + fundingGoal / 2);

    console.log(
      `\t\t 💰 Bob has\x1b[33m`,
      bobBalance.toString(),
      `\x1b[0mtokens`
    );

    let aliceBalanceBefore = await token.balanceOf(alice.address);

    // transfer half tokens to Alice acc
    await run("transferFrom", {
      token: tokenAddr,
      from: owner.address,
      to: alice.address,
      amount: (fundingGoal / 2).toString(),
    });

    ownerBalAfter = await token.balanceOf(owner.address);
    let aliceBalance = await token.balanceOf(alice.address);

    expect(ownerBalAfter).to.be.equal(0);
    expect(aliceBalance).to.be.equal(aliceBalanceBefore + fundingGoal / 2);

    console.log(
      `\t\t 💰 Alice has\x1b[33m`,
      aliceBalance.toString(),
      `\x1b[0mtokens`
    );

    // Bob approves Crowdfunding sc to transfer his tokens
    expect(await token.allowance(bob.address, crowdfundingAddr)).to.be.equal(0);
    await run("approve", {
      token: tokenAddr,
      from: bob.address,
      crowdfunding: crowdfundingAddr,
      amount: (fundingGoal / 2).toString(),
    });
    expect(await token.allowance(bob.address, crowdfundingAddr)).to.be.equal(
      fundingGoal / 2
    );

    // Alice approves Crowdfunding sc to transfer her
    expect(await token.allowance(alice.address, crowdfundingAddr)).to.be.equal(
      0
    );

    await run("approve", {
      token: tokenAddr,
      from: alice.address,
      crowdfunding: crowdfundingAddr,
      amount: (fundingGoal / 2).toString(),
    });

    expect(await token.allowance(alice.address, crowdfundingAddr)).to.be.equal(
      fundingGoal / 2
    );

    // increase datetime to the next day
    await time.increase(ONE_DAY);
    console.log(`\t🕒 increased datetime to the next day`);

    // Bob pledges all tokens to Crowdfunding sc for the 'Development' campaign
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(0);
    await run("pledge", {
      from: bob.address,
      crowdfunding: crowdfundingAddr,
      campaignId: "0",
      amount: bobBalance.toString(),
    });

    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(bobBalance);

    // increase datetime to the half of a next day
    await time.increase(ONE_DAY / 2);
    console.log(
      `\t🕒 increased datetime to the half of a next day (1.5 days passed)`
    );

    // Alice pledges half of her tokens to Crowdfunding sc for the 'Development' campaign
    await run("pledge", {
      from: alice.address,
      crowdfunding: crowdfundingAddr,
      campaignId: "0",
      amount: (aliceBalance / 2).toString(),
    });

    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(
      bobBalance.add(aliceBalance / 2)
    );

    // increase datetime to the 3rd day
    await time.increase(ONE_DAY + ONE_DAY / 2);
    console.log(`\t🕒 increased datetime to the 3rd day`);

    // Alice pledges half of her tokens to Crowdfunding sc for the 'New' campaign
    await run("pledge", {
      from: alice.address,
      crowdfunding: crowdfundingAddr,
      campaignId: "1",
      amount: (aliceBalance / 2).toString(),
    });

    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(
      bobBalance.add(aliceBalance)
    );

    // increase datetime to the 6th day (all campaigns haven't raised funds)
    await time.increase(3 * ONE_DAY);
    console.log(
      `\t🕒 increased datetime to the 6th day (all campaigns aren't raised)`
    );

    // -------> Information block starts <---------
    // return user balances
    bobBalance = await token.balanceOf(bob.address);
    console.log(
      `\t\t 💰 Bob has\x1b[33m`,
      bobBalance.toString(),
      `\x1b[0mtokens`
    );

    aliceBalance = await token.balanceOf(alice.address);
    console.log(
      `\t\t 💰 Alice has\x1b[33m`,
      aliceBalance.toString(),
      `\x1b[0mtokens`
    );

    // return SC balances
    result = await crowdfunding.getInfo();
    let indexes = result[0];
    let infos = result[1];
    for (let i = 0; i < infos.length; ++i) {
      console.log(`\t\t 📜 Info campaign '${infos[i][5]}':`);
      console.log(
        "\t\t   🆔 campaignId\x1b[33m",
        indexes[i].toString(), // index of the campaign
        "\x1b[0m "
      );
      console.log(
        `\t\t   🎯\x1b[33m`,
        infos[i][1].toString(), // fundingGoal
        "\x1b[0m funding goal"
      );
      console.log(
        `\t\t   🌱\x1b[33m`,
        infos[i][2].toString(), // totalRaise
        `\x1b[0m raised`
      );
      expect(infos[i][0]).to.be.equal(false);
    }
    // -------> Information block ends <-------

    // Bob claims all tokens from Crowdfunding sc for the 'Development' campaign
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(1e10);
    await run("claim", {
      from: bob.address,
      crowdfunding: crowdfundingAddr,
      campaignId: "0",
    });
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(
      1e10 / 2 // 5e9
    );

    // Alice claims all tokens from Crowdfunding sc for the 'Development' campaign
    await run("claim", {
      from: alice.address,
      crowdfunding: crowdfundingAddr,
      campaignId: "0",
    });
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(
      1e10 / 2 / 2 // 25e8
    );

    // Alice claims all tokens from Crowdfunding sc for the 'New' campaign
    await run("claim", {
      from: alice.address,
      crowdfunding: crowdfundingAddr,
      campaignId: "1",
    });
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(0);

    // -------> Information block starts <---------
    // return user balances
    bobBalance = await token.balanceOf(bob.address);
    console.log(
      `\t\t 💰 Bob has\x1b[33m`,
      bobBalance.toString(),
      `\x1b[0mtokens`
    );

    aliceBalance = await token.balanceOf(alice.address);
    console.log(
      `\t\t 💰 Alice has\x1b[33m`,
      aliceBalance.toString(),
      `\x1b[0mtokens`
    );

    // check SC status
    result = await crowdfunding.getInfo();
    infos = result[1];
    for (let i = 0; i < infos.length; ++i) {
      expect(infos[i][0]).to.be.equal(false);
    }
    // -------> Information block ends <-------

    expect(bobBalance).to.be.equal(fundingGoal / 2);
    expect(aliceBalance).to.be.equal(fundingGoal / 2);
  });
});
