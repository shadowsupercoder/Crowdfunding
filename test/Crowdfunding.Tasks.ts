import {
  time,
  takeSnapshot,
  SnapshotRestorer,
} from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";

import * as hre from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Crowdfunding, IceToken } from "../typechain-types";
import { logBalanceMsg } from "../scripts/utils/balances";

const { ethers, run } = hre;

/*
  These tests were developed only to quick check of the main logic
  using prepared tasks
*/
describe("Crowdfunding DEMOs tests using tasks \n", () => {
  const ONE_DAY: number = 24 * 60 * 60;
  const fundingGoal = 1e10;
  let tokenAddr: string;
  let crowdfundingAddr: string;

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let snapshot: SnapshotRestorer;
  let token: IceToken;
  let crowdfunding: Crowdfunding;

  console.log(`
      Table 1:
      Example of a Demo timeline for May, 13 - May, 19 period for two campaigns
      
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

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    // deploy IceToken and return use it address to deploy Crowdfunding
    tokenAddr = await run("deploy-token");
    token = await hre.ethers.getContractAt("IceToken", tokenAddr);

    // deploy Crowdfunding
    crowdfundingAddr = await run("deploy", {
      token: tokenAddr,
      owner: owner.address,
    });
    crowdfunding = await hre.ethers.getContractAt(
      "Crowdfunding",
      crowdfundingAddr
    );

    // prepared data for a "Development" and "New" campaign
    const currentTime = await time.latest();
    let startDate = currentTime + ONE_DAY; // next day
    let endDate = currentTime + 2 * ONE_DAY; // current datetime + 2 days

    // create the "Development" campaign
    // TODO: check why the type in tasks requires string instead of numbers.
    await run("create", {
      cf: crowdfundingAddr,
      goal: fundingGoal.toString(),
      start: startDate.toString(),
      end: endDate.toString(),
      name: "Development",
      description: "Funds to create demo v1",
    });

    // create the "New" campaign
    startDate = currentTime + ONE_DAY; // next day
    endDate = currentTime + 5 * ONE_DAY; // current datetime + 5 days
    await run("create", {
      cf: crowdfundingAddr,
      goal: fundingGoal.toString(),
      start: startDate.toString(),
      end: endDate.toString(),
      name: "New",
      description: "2 months of investigation",
    });
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  it("📄 DEMO 1: user can claim his funds back if funds goal isn't met\n", async () => {
    let result = await crowdfunding.campaigns(0);
    expect(result[1]).to.be.equal(fundingGoal); // goal
    expect(result[2]).to.be.equal(0); // totalRaise

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

    console.log(`\t\t 📜 Bob's full address is \x1b[32m${bob.address}\x1b[0m`);
    console.log(
      `\t\t 📜 Alice's full address is \x1b[32m${alice.address}\x1b[0m`
    );
    ownerBalBefore = await token.balanceOf(owner.address);
    const bobBalanceBefore = await token.balanceOf(bob.address);

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
    logBalanceMsg("Bob", bobBalance.toString());

    const aliceBalanceBefore = await token.balanceOf(alice.address);

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

    logBalanceMsg("Alice", aliceBalance.toString());

    // Bob approves Crowdfunding sc to transfer his tokens
    expect(await token.allowance(bob.address, crowdfundingAddr)).to.be.equal(0);
    await run("approve", {
      token: tokenAddr,
      from: bob.address,
      to: crowdfundingAddr,
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
      to: crowdfundingAddr,
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
      id: "0",
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
      id: "0",
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
      id: "1",
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
    logBalanceMsg("Bob", bobBalance.toString());

    aliceBalance = await token.balanceOf(alice.address);
    logBalanceMsg("Alice", aliceBalance.toString());

    // return SC balances
    result = await crowdfunding.getInfo();
    const indexes = result[0];
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
      id: "0",
    });
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(
      1e10 / 2 // 5e9
    );

    // Alice claims all tokens from Crowdfunding sc for the 'Development' campaign
    await run("claim", {
      from: alice.address,
      crowdfunding: crowdfundingAddr,
      id: "0",
    });
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(
      1e10 / 2 / 2 // 25e8
    );

    // Alice claims all tokens from Crowdfunding sc for the 'New' campaign
    await run("claim", {
      from: alice.address,
      crowdfunding: crowdfundingAddr,
      id: "1",
    });
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(0);

    // -------> Information block starts <---------
    // return user balances
    bobBalance = await token.balanceOf(bob.address);
    logBalanceMsg("Bob", bobBalance.toString());

    aliceBalance = await token.balanceOf(alice.address);
    logBalanceMsg("Alice", aliceBalance.toString());

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

  it("📄 DEMO 2: owner can get tokens from SC if funds goal is met\n", async () => {
    const amountToDevBob = 25e9;
    const amountToDevAlice = 75e8;
    const amountToNewAlice = 75e8;
    const totalAmount = amountToDevBob + amountToDevAlice + amountToNewAlice;

    let result = await crowdfunding.campaigns(0);
    expect(result[1]).to.be.equal(fundingGoal); // goal
    expect(result[2]).to.be.equal(0); // totalRaise

    result = await crowdfunding.campaigns(1);
    expect(result[1]).to.be.equal(fundingGoal); // goal
    expect(result[2]).to.be.equal(0); // totalRaise

    let ownerBalBefore = await token.balanceOf(owner.address);
    // mint 4 times `fundingGoal` tokens to the owner
    await run("mint", {
      token: tokenAddr,
      amount: totalAmount.toString(),
    });

    let ownerBalAfter = await token.balanceOf(owner.address);

    expect(ownerBalAfter).to.be.equal(totalAmount);
    expect(fundingGoal * 4).to.be.equal(ownerBalAfter - ownerBalBefore);

    console.log(`\t\t 📜 Bob's full address is \x1b[32m${bob.address}\x1b[0m`);
    console.log(
      `\t\t 📜 Alice's full address is \x1b[32m${alice.address}\x1b[0m`
    );
    ownerBalBefore = await token.balanceOf(owner.address);
    const bobBalanceBefore = await token.balanceOf(bob.address);

    // transfer 2.5 times `fundingGoal` tokens to Bob acc
    await run("transferFrom", {
      token: tokenAddr,
      from: owner.address,
      to: bob.address,
      amount: amountToDevBob.toString(),
    });
    ownerBalAfter = await token.balanceOf(owner.address);
    let bobBalance = await token.balanceOf(bob.address);

    expect(ownerBalAfter).to.be.equal(totalAmount - amountToDevBob);
    expect(bobBalance).to.be.equal(bobBalanceBefore + amountToDevBob);
    logBalanceMsg("Bob", bobBalance.toString());

    const aliceBalanceBefore = await token.balanceOf(alice.address);

    // transfer `fundingGoal` tokens to Alice acc
    await run("transferFrom", {
      token: tokenAddr,
      from: owner.address,
      to: alice.address,
      amount: (amountToDevAlice + amountToNewAlice).toString(),
    });

    ownerBalAfter = await token.balanceOf(owner.address);
    let aliceBalance = await token.balanceOf(alice.address);

    expect(ownerBalAfter).to.be.equal(0);
    expect(aliceBalance).to.be.equal(
      aliceBalanceBefore.add(amountToDevAlice + amountToNewAlice)
    );

    logBalanceMsg("Alice", aliceBalance.toString());
    logBalanceMsg("Owner", ownerBalAfter.toString());

    // Bob approves Crowdfunding sc to transfer his tokens
    expect(await token.allowance(bob.address, crowdfundingAddr)).to.be.equal(0);
    await run("approve", {
      token: tokenAddr,
      from: bob.address,
      to: crowdfundingAddr,
      amount: amountToDevBob.toString(),
    });
    expect(await token.allowance(bob.address, crowdfundingAddr)).to.be.equal(
      amountToDevBob
    );

    // Alice approves Crowdfunding sc to transfer her
    expect(await token.allowance(alice.address, crowdfundingAddr)).to.be.equal(
      0
    );
    await run("approve", {
      token: tokenAddr,
      from: alice.address,
      to: crowdfundingAddr,
      amount: (amountToDevAlice + amountToNewAlice).toString(),
    });
    expect(await token.allowance(alice.address, crowdfundingAddr)).to.be.equal(
      amountToDevAlice + amountToNewAlice
    );

    // increase datetime to the next day
    await time.increase(ONE_DAY);
    console.log(`\t🕒 increased datetime to the next day`);

    // Bob pledges all tokens to Crowdfunding sc for the 'Development' campaign
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(0);
    await run("pledge", {
      from: bob.address,
      crowdfunding: crowdfundingAddr,
      id: "0",
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
      id: "0",
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
      id: "1",
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
    logBalanceMsg("Bob", bobBalance.toString());

    aliceBalance = await token.balanceOf(alice.address);
    logBalanceMsg("Alice", aliceBalance.toString());

    // return SC balances
    result = await crowdfunding.getInfo();
    const indexes = result[0];
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

    // Owner claims all tokens from Crowdfunding sc for the 'Development' campaign
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(totalAmount);
    await run("getTokens", {
      from: owner.address,
      crowdfunding: crowdfundingAddr,
      id: "0",
    });
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(
      totalAmount - (amountToDevBob + amountToDevAlice) // 75e8
    );

    // Owner can not claim tokens from Crowdfunding sc for the 'New' campaign
    await expect(
      run("getTokens", {
        from: owner.address,
        crowdfunding: crowdfundingAddr,
        id: "1",
      })
    ).revertedWith("The funding goal has not reached yet");

    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(
      totalAmount - (amountToDevBob + amountToDevAlice) // 75e8
    );
    expect(await token.balanceOf(owner.address)).to.be.equal(
      amountToDevBob + amountToDevAlice
    );

    // Alice claims all tokens from Crowdfunding sc for the 'Development' campaign
    await run("claim", {
      from: alice.address,
      crowdfunding: crowdfundingAddr,
      id: "1",
    });

    const ownerBal = await token.balanceOf(owner.address);
    expect(await token.balanceOf(crowdfundingAddr)).to.be.equal(0);
    expect(await token.balanceOf(owner.address)).to.be.equal(
      amountToDevBob + amountToDevAlice
    );
    expect(await token.balanceOf(alice.address)).to.be.equal(amountToNewAlice);

    // -------> Information block starts <---------
    // return user balances
    bobBalance = await token.balanceOf(bob.address);
    logBalanceMsg("Bob", bobBalance.toString());

    aliceBalance = await token.balanceOf(alice.address);
    logBalanceMsg("Alice", aliceBalance.toString());
    logBalanceMsg("Owner", ownerBal.toString());

    // check SC status (is finished)
    result = await crowdfunding.getInfo();
    infos = result[1];
    expect(infos[1][0]).to.be.equal(false);
    expect(infos[0][0]).to.be.equal(true);
    // -------> Information block ends <-------
  });
});
