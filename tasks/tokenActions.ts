import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// TODO: move interfaces to the separate directory
interface MintArguments {
  token: string;
  amount: string;
}

interface TransferFromArguments {
  token: string;
  from: string;
  to: string;
  amount: string;
}

interface ApproveTaskArguments {
  token: string;
  from: string;
  crowdfunding: string;
  amount: string;
}

task("mint", "Mint an IceToken to the owner")
  .addParam("token", "The IceToken address")
  .addParam("amount", "Amount of tokens in wei that should be minted")
  .setAction(async (args: MintArguments, hre: HardhatRuntimeEnvironment) => {
    const IceToken = await hre.ethers.getContractFactory("IceToken");
    const tokenAddress = hre.ethers.utils.getAddress(args.token);
    const token = await hre.ethers.getContractAt("IceToken", tokenAddress);
    const [owner] = await hre.ethers.getSigners();

    await token.connect(owner).mint(args.amount);
    const ownerShort = owner.address.substr(0, 10);
    console.log(
      `\t✔️  \x1b[33m${args.amount}\x1b[0m`,
      'Ice tokens were minted to the owner address:',
      `\x1b[32m${ownerShort}..\x1b[0m`
    );
  });

task("transferFrom", "Transfer tokens from one addres to another")
  .addParam("token", "The IceToken address")
  .addParam("from", "The sender address")
  .addParam("to", "The receiver address")
  .addParam("amount", "Amount of tokens in wei that should be minted")
  .setAction(async (args: TransferFromArguments, hre: HardhatRuntimeEnvironment) => {
    const IceToken = await hre.ethers.getContractFactory("IceToken");
    const tokenAddr = hre.ethers.utils.getAddress(args.token);
    const fromAddr = hre.ethers.utils.getAddress(args.from);
    const toAddr = hre.ethers.utils.getAddress(args.to);
    const token = await hre.ethers.getContractAt("IceToken", tokenAddr);
    const from = await hre.ethers.getSigner(fromAddr);
    const to = await hre.ethers.getSigner(toAddr);

    await token.connect(from).transfer(to.address, args.amount);

    const fromShort = fromAddr.substr(0, 10);
    const toShort = toAddr.substr(0, 10);
    console.log(
      `\t✔️  \x1b[33m${args.amount}\x1b[0m Ice tokens were transfered from`,
      `\x1b[32m${fromShort}..\x1b[0m to \x1b[32m${toShort}..\x1b[0m account`
    );
  });

task("approve", "Approve Ice tokens from sender for crowdfunding smart contract")
  .addParam("token", "The IceToken address")
  .addParam("from", "The sender address")
  .addParam("crowdfunding", "The crowdfunding address")
  .addParam("amount", "Amount of tokens in wei that should be approved")
  .setAction(
    async (args: ApproveTaskArguments, hre: HardhatRuntimeEnvironment) => {
      const IceToken = await hre.ethers.getContractFactory("IceToken");
      const tokenAddr = hre.ethers.utils.getAddress(args.token);
      const fromAddr = hre.ethers.utils.getAddress(args.from);
      const crowdfundingAddress = hre.ethers.utils.getAddress(
        args.crowdfunding
      );
      const token = await hre.ethers.getContractAt("IceToken", tokenAddr);
      const from = await hre.ethers.getSigner(fromAddr);

      await token
        .connect(from)
        .approve(crowdfundingAddress, args.amount);

      const fromShort = fromAddr.substr(0, 10);
      console.log(
        `\t✔️  \x1b[33m${args.amount}\x1b[0m Ice tokens were approved by`,
        `\x1b[32m${fromShort}..\x1b[0m`,
         'for the crowdfunding SC'
      );
    }
  );
