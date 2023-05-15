import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface PledgeTaskArguments {
  campaignId: string;
  amount: string;
  crowdfunding: string;
}

task("pledge", "Fund a campaign by the user")
  .addParam(
    "campaignId",
    "The campaign Id that was already created by the owner"
  )
  .addParam(
    "amount",
    "The amount of `mainToken` that user want to transfer to the SC"
  )
  .addParam("crowdfunding", "The crowdfunding address")
  .setAction(
    async (args: PledgeTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const [, bob] = await hre.ethers.getSigners();
      const crowdfundingAddress = hre.ethers.utils.getAddress(
        args.crowdfunding
      );
      const crowdfunding = await hre.ethers.getContractAt(
        "Crowdfunding",
        crowdfundingAddress
      );

      await crowdfunding.connect(bob).pledge(args.campaignId, args.amount);

      console.log("✅ Tokens pledged");
    }
  );
