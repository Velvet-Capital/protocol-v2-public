// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { run, ethers, upgrades } from "hardhat";
import { TokenMetadata } from "../typechain";
import { chainIdToAddresses } from "./networkVariables";
// let fs = require("fs");
const ETHERSCAN_TX_URL = "https://testnet.bscscan.io/tx/";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  await run("compile");
  const delay = (ms: number | undefined) => new Promise((res) => setTimeout(res, ms));

  // get current chainId
  const { chainId } = await ethers.provider.getNetwork();
  const forkChainId: any = process.env.FORK_CHAINID;

  const addresses = chainIdToAddresses[forkChainId];
  const accounts = await ethers.getSigners();

  //console.log("accounts",accounts);

  console.log("------------------------------ Initial Setup Ended ------------------------------");

  /*console.log("--------------- Contract Deployment Started ---------------");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.deployed();*/

  console.log("--------------- Contract Deployment Started ---------------");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.attach("0xA812C7aCB1e6f41e7B4dE2d7CaF9F2fc176c6Bc7");

  await delay(15000);
  console.log("Waited 5s");

  // Token Metadata
  const TokenMetadata = await ethers.getContractFactory("TokenMetadata");
  const tokenMetadata = await TokenMetadata.deploy();
  console.log("Contract tokenMetadata deployed to: ", tokenMetadata.address);

  await delay(5000);
  console.log("Waited 5s");

  /*const TokenMetadata = await ethers.getContractFactory("TokenMetadata");
  const tokenMetadata = await TokenMetadata.attach(
    "0xd2948cD59234eB61d46b20a55222de9D4020FA48"
  );*/

  // Index Library
  const IndexSwapLibrary = await ethers.getContractFactory("IndexSwapLibrary");
  const indexSwapLibrary = await IndexSwapLibrary.deploy(
    priceOracle.address,
    addresses.WETH_Address,
    tokenMetadata.address,
  );
  console.log(`Contract indexSwapLibrary deployed to: ${indexSwapLibrary.address}`);

  await delay(15000);
  console.log("Waited 5s");

  /*const IndexSwapLibrary = await ethers.getContractFactory("IndexSwapLibrary");
  const indexSwapLibrary = await IndexSwapLibrary.attach(
    "0x00aF83C3F96EC1612a410a3A5402341187241327"
  );*/

  // Access Controller
  /*const AccessController = await ethers.getContractFactory("AccessController");
  const accessController = await AccessController.deploy();
  await accessController.deployed();
  console.log(
    `Contract accessController deployed to: ${accessController.address}`
  );
  await delay(8000);
  console.log("Waited 5s");*/

  const AccessController = await ethers.getContractFactory("AccessController");
  const accessController = await AccessController.attach("0xfaFcD7c86855e93AF9f7Cf216a792De64c413526");

  // Adapterd
  /*const Adapter = await ethers.getContractFactory("Adapter");
  const adapter = await Adapter.deploy();
  await adapter.deployed();

  console.log(`Contract Adapter deployed to: ${adapter.address}`);
  await delay(5000);
  console.log("Waited 5s");*/

  const Adapter = await ethers.getContractFactory("Adapter");
  const adapter = await Adapter.attach("0x15cf19b4648e7a2c4f8B61Ef14286D2A8d0bdEe4");

  const Rebalancing = await ethers.getContractFactory("Rebalancing");
  const rebalancing = await Rebalancing.deploy();
  await rebalancing.deployed();

  console.log("Contract rebalancing deployed to: ", rebalancing.address);

  await delay(15000);
  console.log("Waited 15s");

  const IndexFactory = await ethers.getContractFactory("IndexFactory");
  const indexFactory = await IndexFactory.deploy(
    addresses.PancakeSwapRouterAddress,
    addresses.WETH_Address,
    accounts[1].address,
    indexSwapLibrary.address,
    tokenMetadata.address,
    adapter.address,
    rebalancing.address,
  );

  await indexFactory.deployed();

  await delay(5000);
  console.log("Waited 5s");

  // await indexFactory.createIndex(
  //  "DefiIndex",
  //   "DIDX",
  //   "",
  //   "",
  //   "500000000000000000000",
  //   taskArgs.fee,
  // );

  console.log("Contract indexFactory deployed to: ", indexFactory.address);

  console.log("------------------------------ Contract Deployment Ended ------------------------------");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
