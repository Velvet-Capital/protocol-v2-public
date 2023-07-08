import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "hardhat-tracer";
import "./tasks/accounts";
import "./tasks/balance";
import "./tasks/block-number";
import "./tasks/deployIndexSwap";
import "./tasks/setTokenIndexSwap";
import "./tasks/createIndex";

import "hardhat-gas-reporter";
import "hardhat-abi-exporter";

import { HardhatUserConfig } from "hardhat/types";
import { chainIdToAddresses } from "./scripts/networkVariables";

import * as tdly from "@tenderly/hardhat-tenderly";

tdly.setup({ automaticVerifications: false });

const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}

const infuraApiKey = process.env.INFURA_API_KEY;
const privateKey = process.env.PRIVATE_KEY;
const forkChainId: any = process.env.FORK_CHAINID;

if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}
const chainIds = {
  ganache: 5777,
  goerli: 5,
  hardhat: 7545,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  bscTestnet: 97,
  bscMainnet: 56,
  MaticTestnet: 80001,
  MaticMainnet: 137,
  ropsten: 3,
};

const config: HardhatUserConfig = {
  gasReporter: {
    enabled: true,
    currency: "ETH",
    showTimeSpent: true,
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      forking: {
        // eslint-disable-next-line
        enabled: true,
        url: process.env.BSC_RPC ? process.env.BSC_RPC : "https://bsc-dataseed.binance.org/",
      },
      chainId: 56,
      // allowUnlimitedContractSize: true
    },
    ganache: {
      chainId: 5777,
      url: "http://127.0.0.1:7545/",
    },

    mainnet: {
      accounts: {
        count: 10,
        initialIndex: 0,
        mnemonic,
        path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["mainnet"],
      url: "https://mainnet.infura.io/v3/" + infuraApiKey + "",
    },
    rinkeby: {
      accounts: {
        initialIndex: 0,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["rinkeby"],
      url: "https://rinkeby.infura.io/v3/" + infuraApiKey + "",
    },
    bscTestnet: {
      accounts: {
        initialIndex: 0,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["bscTestnet"],
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
    },
    bscMainnet: {
      accounts: {
        initialIndex: 0,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["bscMainnet"],
      url: "https://bsc-dataseed.binance.org/",
    },
    MaticTestnet: {
      accounts: {
        initialIndex: 0,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      // chainId: chainIds["MaticTestnet"],
      chainId: 80001,
      allowUnlimitedContractSize: true,
      url: "https://speedy-nodes-nyc.moralis.io/" + infuraApiKey + "/polygon/mumbai",
    },
    MaticMainnet: {
      accounts: {
        initialIndex: 0,
        mnemonic,
        // path: "m/44'/60'/0'/0",
      },
      chainId: chainIds["MaticMainnet"],
      allowUnlimitedContractSize: true,
      url: "https://rpc-mainnet.maticvigil.com/",
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 400000,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  abiExporter: {
    path: "./abi",
    clear: true,
    flat: true,
    only: [
      "IndexSwap",
      "IndexFactory",
      "Exchange",
      "OffChainIndexSwap",
      "PriceOracle",
      "RebalanceAggregator",
      "OffChainRebalance",
      "Rebalancing",
      "AssetManagerConfig",
      "TokenRegistry",
    ],
    spacing: 2,
  },
  tenderly: {
    project: "latestdev",
    username: "velvet-capital",
    privateVerification: true,
  },
};

module.exports = config;
