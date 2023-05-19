import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface GetTokensTaskArguments {
  from: string;
  campaignId: string;
  crowdfunding: string;
}

task(
  "getTokens",
  "Transfers all tokens from the certaing campaing to the owner"
)
  .addParam("from", "The sender address")
  .addParam("campaignId", "The campaign Id that was already raised funds")
  .addParam("crowdfunding", "The crowdfunding address")
  .setAction(
    async (args: GetTokensTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const fromAddr = hre.ethers.utils.getAddress(args.from);
      const from = await hre.ethers.getSigner(fromAddr);
      const fromShort = fromAddr.substr(0, 10);
      const crowdfundingAddr = hre.ethers.utils.getAddress(args.crowdfunding);
      const crowdfunding = await hre.ethers.getContractAt(
        "Crowdfunding",
        crowdfundingAddr
      );

      const tx = await crowdfunding.connect(from).getTokens(args.campaignId);
      // TODO: make negative condition if tx failed
      const receipt = await tx.wait();
      const event = receipt.events?.filter((x) => {return x.event == "ClaimedByOwner"});
      const claimedAmount = event[0].args[2].toString();
      console.log(
      `\t✔️  \x1b[33m${claimedAmount}\x1b[0m`,
      `Ice tokens were claimed by owner from '${args.campaignId}' campaignId by the`,
      `\x1b[32m${fromShort}..\x1b[0m address`
    );}
  );
