import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Crowdfunding } from "../typechain-types";

task("deploy", "Deploy Crowdfunding smart contract")
  .addParam(
    "mainToken",
    "The ERC-20 token is used as a mechanism to accomplish a fundraising"
  )
  .addParam("owner", "The owner address for the contract")
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
    const mainTokenAddress = hre.ethers.utils.getAddress(args.mainToken);
    const ownerAddress = hre.ethers.utils.getAddress(args.owner);

    const contract = await Crowdfunding.deploy(mainTokenAddress, ownerAddress);
    await contract.deployed();

    console.log(`Crowdfunding deployed at: ${contract.address}`);
  });
