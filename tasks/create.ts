import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";


interface CreateTaskArguments {
  crowdfunding: string;
  fundingGoal: number;
  startDate: number;
  endDate: number;
  name: string;
  description: string;
}

task("create", "Creates a new crowdfunding campaign")
  .addParam("crowdfunding", "The deployed crowdfunding address")
  .addParam(
    "fundingGoal",
    "The amount of `mainToken` to achieve the campaign goal"
  )
  .addParam(
    "startDate",
    "The datetime in seconds when the campaign will be started"
  )
  .addParam(
    "endDate",
    "The datetime in seconds when the campaign will be finished"
  )
  .addParam("name", "The short name of the crowdfunding campaign")
  .addParam(
    "description",
    "The extended description of the crowdfunding campaign"
  )
  .setAction(
    async (args: CreateTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const [owner] = await hre.ethers.getSigners();
      const crowdfundingAddress = hre.ethers.utils.getAddress(
        args.crowdfunding
      );

      const crowdfunding = await hre.ethers.getContractAt(
        "Crowdfunding",
        crowdfundingAddress
      );

      await crowdfunding.connect(owner).createCampaign(
        args.fundingGoal,
        args.startDate,
        args.endDate,
        args.name,
        args.description
      );

      console.log("✅ Campaign Created");
    }
  );
