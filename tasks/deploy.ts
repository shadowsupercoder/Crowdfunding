import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Crowdfunding } from "../typechain-types";

task("deploy", "Deploy Crowdfunding smart contract").setAction(
  async (args: any, hre: HardhatRuntimeEnvironment) => {
    const Crowdfunding =
      await hre.ethers.getContractFactory("Crowdfunding");
    const contract = await Crowdfunding.deploy();
    await contract.deployed();

    console.log(`Crowdfunding deployed at: ${contract.address}`);
  }
);
