import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

interface CreateTaskArguments {
  cf: string;
  goal: string;
  start: string;
  end: string;
  name: string;
  description: string;
}

task("create", "Creates a new crowdfunding campaign")
  .addParam("cf", "The deployed crowdfunding address")
  .addParam(
    "goal",
    "The amount of `mainToken` to achieve the campaign goal"
  )
  .addParam(
    "start",
    "The datetime in seconds when the campaign will be started"
  )
  .addParam(
    "end",
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
      const ca = hre.ethers.utils.getAddress(args.cf);
      const crowdfunding = await hre.ethers.getContractAt("Crowdfunding", ca);
      await crowdfunding
        .connect(owner)
        .createCampaign(
          args.goal,
          args.start,
          args.end,
          args.name,
          args.description
        );
      console.log(`\t✔️  The '${args.name}' campaign has been created`);
    }
  );
