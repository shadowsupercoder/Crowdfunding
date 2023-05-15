import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface GetTokensTaskArguments {
  campaignId: number;
  crowdfunding: string;
}

task(
  "getTokens",
  "Transfers all tokens from the certaing campaing to the owner"
)
  .addParam("campaignId", "The campaign Id that was already raised funds")
  .addParam("crowdfunding", "The crowdfunding address")
  .setAction(
    async (args: GetTokensTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const [owner] = await hre.ethers.getSigners();
      const crowdfundingAddress = hre.ethers.utils.getAddress(
        args.crowdfunding
      );

      const crowdfunding = await hre.ethers.getContractAt(
        "Crowdfunding",
        crowdfundingAddress
      );

      await crowdfunding.connect(owner).getTokens(args.campaignId);

      console.log("✅ Tokens claimed");
    }
  );
