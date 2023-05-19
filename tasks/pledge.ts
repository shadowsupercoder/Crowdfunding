import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface PledgeTaskArguments {
  from: string;
  crowdfunding: string;
  id: string;
  amount: string;
}

task("pledge", "Transfer tokens from the sender to the crowdfunding SC")
  .addParam("from", "The sender address")
  .addParam("crowdfunding", "The crowdfunding address")
  .addParam(
    "id",
    "The campaign Id that was already created by the owner"
  )
  .addParam(
    "amount",
    "The amount of tokens that user want to transfer to the SC"
  )

  .setAction(
    async (args: PledgeTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const fromAddr = hre.ethers.utils.getAddress(args.from);
      const from = await hre.ethers.getSigner(fromAddr);
      const fromShort = fromAddr.substr(0, 10);
      const crowdfundingAddr = hre.ethers.utils.getAddress(args.crowdfunding);
      const crowdfunding = await hre.ethers.getContractAt(
        "Crowdfunding",
        crowdfundingAddr
      );

      await crowdfunding.connect(from).pledge(args.id, args.amount);
      console.log(
      `\t✔️  \x1b[33m${args.amount}\x1b[0m`,
      `Ice tokens were pledged to '${args.id}' campaignId by the`,
      `\x1b[32m${fromShort}..\x1b[0m address`
    );
    }
  );
