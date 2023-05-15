import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface ClaimTaskArguments {
  campaignId: number;
  crowdfunding: string;
}

task("claim", "Creates a new crowdfunding campaign")
  .addParam(
    "campaignId",
    "The campaign Id that was already created by the owner"
  )
  .addParam("crowdfunding", "The crowdfunding address")
  .setAction(
    async (args: ClaimTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const [, bob] = await hre.ethers.getSigners();
      const crowdfundingAddress = hre.ethers.utils.getAddress(
        args.crowdfunding
      );

      const crowdfunding = await hre.ethers.getContractAt(
        "Crowdfunding",
        crowdfundingAddress
      );

      await crowdfunding.connect(bob).claim(args.campaignId);

      console.log("✅ Tokens claimed");
    }
  );
