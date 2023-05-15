import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface TaskArguments {
  token: string;
  amount: string;
}

interface ApproveTaskArguments {
  token: string;
  crowdfunding: string;
  amount: string;
}

task("mint", "Mint an IceToken to the owner")
  .addParam("token", "The IceToken address")
  .addParam("amount", "Amount of tokens in wei that should be minted")
  .setAction(async (args: TaskArguments, hre: HardhatRuntimeEnvironment) => {
    const IceToken = await hre.ethers.getContractFactory("IceToken");
    const tokenAddress = hre.ethers.utils.getAddress(args.token);
    const [owner] = await hre.ethers.getSigners();

    await IceToken.connect(owner).mint(args.amount);

    console.log(
      `✅ ${args.amount} of Ice token were minted to the ${owner.address}`
    );
  });

// simple example of token trasferring. Attention! Can not be used with custom parameters!
// create another extendet task for that
task("transfer", "Transfer tokens from owner to bob address")
  .addParam("token", "The IceToken address")
  .addParam("amount", "Amount of tokens in wei that should be minted")
  .setAction(async (args: TaskArguments, hre: HardhatRuntimeEnvironment) => {
    const IceToken = await hre.ethers.getContractFactory("IceToken");
    const tokenAddress = hre.ethers.utils.getAddress(args.token);
    const token = await hre.ethers.getContractAt("IceToken", tokenAddress);
    const [owner, bob] = await hre.ethers.getSigners();

    await token.connect(owner).transfer(bob.address, args.amount);

    console.log(
      `✅ ${args.amount} IceTokens were transfered from owner to bob account`
    );
  });

task("approve", "Approve Ice tokens from bob for crowdfunding smart contract")
  .addParam("token", "The IceToken address")
  .addParam("crowdfunding", "The crowdfunding address")
  .addParam("amount", "Amount of tokens in wei that should be approved")
  .setAction(
    async (args: ApproveTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const IceToken = await hre.ethers.getContractFactory("IceToken");
      const tokenAddress = hre.ethers.utils.getAddress(args.token);
      const crowdfundingAddress = hre.ethers.utils.getAddress(
        args.crowdfunding
      );
      const token = await hre.ethers.getContractAt("IceToken", tokenAddress);
      const [, bob] = await hre.ethers.getSigners();

      await token
        .connect(bob)
        .approve(crowdfundingAddress.address, args.amount);

      console.log(
        `✅ ${args.amount} IceTokens were approved for the crowdfunding SC`
      );
    }
  );
