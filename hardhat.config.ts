import * as dotenv from 'dotenv';

import { HardhatUserConfig } from "hardhat/config";
import './tasks/deploy';
import './tasks/create';
import './tasks/claim';
import './tasks/getTokens';
import './tasks/tokenActions';
import './tasks/pledge';

import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-chai-matchers';

dotenv.config();

const {
  REPORT_GAS,
  PRIVATE_KEY,
} = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  gasReporter: {
    enabled: (REPORT_GAS) ? true : false
  },
};

export default config;
