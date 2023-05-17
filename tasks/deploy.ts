import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface DeployTaskArguments {
  token: string;
  owner: string;
}

task("deploy", "Deploy Crowdfunding smart contract")
  .addParam(
    "token",
    "The ERC-20 token is used as a mechanism to accomplish a fundraising"
  )
  .addParam("owner", "The owner address for the contract")
  .setAction(
    async (args: DeployTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");
      const mainTokenAddress = hre.ethers.utils.getAddress(args.token);
      const ownerAddress = hre.ethers.utils.getAddress(args.owner);

      const contract = await Crowdfunding.deploy(
        mainTokenAddress,
        ownerAddress
      );
      await contract.deployed();

      console.log(`\t✔️  Crowdfunding deployed at: \x1b[32m${contract.address}\x1b[0m`);
      return contract.address;
    }
  );

task("deploy-token", "Deploy IceToken smart contract").setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const IceToken = await hre.ethers.getContractFactory("IceToken");
    const contract = await IceToken.deploy();
    await contract.deployed();

    console.log(`\t✔️  IceToken deployed at: \x1b[32m${contract.address}\x1b[0m`);
    return contract.address;
  }
);
