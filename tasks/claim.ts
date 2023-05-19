import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface ClaimTaskArguments {
  from: string;
  id: string;
  crowdfunding: string;
}

task("claim", "Claim tokens from the crowdfunding SC")
  .addParam("from", "The sender address")
  .addParam(
    "id",
    "The campaign Id that was already exists in crowdfunding SC"
  )
  .addParam("crowdfunding", "The crowdfunding address")
  .setAction(
    async (args: ClaimTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const fromAddr = hre.ethers.utils.getAddress(args.from);
      const from = await hre.ethers.getSigner(fromAddr);
      const fromShort = fromAddr.substr(0, 10);
      const crowdfundingAddr = hre.ethers.utils.getAddress(args.crowdfunding);
      const crowdfunding = await hre.ethers.getContractAt(
        "Crowdfunding",
        crowdfundingAddr
      );

      const tx = await crowdfunding.connect(from).claim(args.id);
      // TODO: make negative condition if tx failed
      const receipt = await tx.wait();
      const event = receipt.events?.filter((x) => {return x.event == "Claimed"});
      const claimedAmount = event[0].args[2].toString();
      console.log(
      `\t✔️  \x1b[33m${claimedAmount}\x1b[0m`,
      `Ice tokens were claimed from '${args.id}' campaignId by the`,
      `\x1b[32m${fromShort}..\x1b[0m address`
    );
    }
  );
