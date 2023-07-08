import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { chainIdToAddresses } from "../scripts/networkVariables";
import {
  IERC20Upgradeable,
  IndexSwap,
  IndexSwap__factory,
  PriceOracle,
  IERC20Upgradeable__factory,
  IndexSwapLibrary,
  BaseHandler,
  VenusHandler,
  Exchange,
  TokenRegistry,
  Rebalancing,
  AccessController,
  IndexFactory,
  VelvetSafeModule,
  OffChainRebalance__factory,
  AssetManagerConfig,
  FeeModule,
  PancakeSwapLPHandler,
  WombatHandler,
  BeefyLPHandler,
  ApeSwapLPHandler,
  BiSwapLPHandler,
  AlpacaHandler,
  ApeSwapLendingHandler,
  BeefyHandler,
  SlippageControl,
  RebalanceLibrary,
} from "../typechain";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";

import Safe, { SafeFactory, SafeAccountConfig, ContractNetworksConfig } from "@gnosis.pm/safe-core-sdk";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import { SafeTransactionDataPartial, GnosisSafeContract, SafeVersion } from "@gnosis.pm/safe-core-sdk-types";

import { getSafeContract } from "@gnosis.pm/safe-core-sdk/dist/src/contracts/safeDeploymentContracts";

let tokenRegistry: TokenRegistry;
let indexSwapLibrary: IndexSwapLibrary;
let baseHandler: BaseHandler;
let venusHandler: VenusHandler;
let pancakeLpHandler: PancakeSwapLPHandler;
let biSwapLPHandler: BiSwapLPHandler;
let apeSwapLPHandler: ApeSwapLPHandler;
let apeSwapLendingHandler: ApeSwapLendingHandler;
let alpacaHandler: AlpacaHandler;
let wombatHandler: WombatHandler;
let beefyLPHandler: BeefyLPHandler;
let beefyHandler: BeefyHandler;
let accessController: AccessController;
let slippageController: SlippageControl;
let rebalanceLibrary: RebalanceLibrary;
let owner: SignerWithAddress;
let treasury: SignerWithAddress;
let wbnbAddress: string;
let busdAddress: string;
let daiAddress: string;
let ethAddress: string;
let btcAddress: string;
let dogeAddress: string;
let linkAddress: string;
let cakeAddress: string;
let usdtAddress: string;
let accounts;
let priceOracle: any;
let velvetSafeModule: VelvetSafeModule;

const forkChainId: any = process.env.FORK_CHAINID;
const chainId: any = forkChainId ? forkChainId : 56;
const addresses = chainIdToAddresses[chainId];

export type IAddresses = {
  wbnbAddress: string;
  busdAddress: string;
  daiAddress: string;
  ethAddress: string;
  btcAddress: string;
  dogeAddress: string;
  linkAddress: string;
  cakeAddress: string;
  usdtAddress: string;
};

export async function tokenAddresses(priceOracle: PriceOracle, addFeed: boolean): Promise<IAddresses> {
  let Iaddress: IAddresses;

  const wbnbInstance = new ethers.Contract(
    addresses.WETH_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  wbnbAddress = wbnbInstance.address;

  const busdInstance = new ethers.Contract(addresses.BUSD, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  busdAddress = busdInstance.address;

  const daiInstance = new ethers.Contract(
    addresses.DAI_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  daiAddress = daiInstance.address;

  const ethInstance = new ethers.Contract(
    addresses.ETH_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  ethAddress = ethInstance.address;

  const btcInstance = new ethers.Contract(
    addresses.BTC_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  btcAddress = btcInstance.address;

  const dogeInstance = new ethers.Contract(
    addresses.DOGE_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  dogeAddress = dogeInstance.address;

  const linkInstance = new ethers.Contract(
    addresses.LINK_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  linkAddress = linkInstance.address;

  const cakeInstance = new ethers.Contract(
    addresses.CAKE_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  cakeAddress = cakeInstance.address;

  const usdtInstance = new ethers.Contract(addresses.USDT, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  usdtAddress = usdtInstance.address;

  Iaddress = {
    wbnbAddress,
    busdAddress,
    daiAddress,
    ethAddress,
    btcAddress,
    dogeAddress,
    linkAddress,
    cakeAddress,
    usdtAddress,
  };

  if (!addFeed) return Iaddress;

  await priceOracle._addFeed(
    [
      wbnbInstance.address,
      busdInstance.address,
      daiInstance.address,
      ethInstance.address,
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      ethInstance.address,
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      busdInstance.address,
      dogeInstance.address,
      linkInstance.address,
      cakeInstance.address,
      usdtAddress,
      "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
    ],
    [
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      wbnbInstance.address,
      ethInstance.address,
      wbnbInstance.address,
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
    ],
    [
      "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
      "0xcBb98864Ef56E9042e7d2efef76141f15731B82f",
      "0x132d3C0B1D2cEa0BC552588063bdBb210FDeecfA",
      "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e",
      "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
      "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf",
      "0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726",
      "0xf1769eB4D1943AF02ab1096D7893759F6177D6B8",
      "0x87Ea38c9F24264Ec1Fff41B04ec94a97Caf99941",
      "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8",
      "0xca236E327F629f9Fc2c30A4E95775EbF0B89fac8",
      "0xB6064eD41d4f67e353768aA239cA86f4F73665a1",
      "0xB97Ad0E74fa7d920791E90258A6E2085088b4320",
      "0xBF63F430A79D4036A5900C19818aFf1fa710f206",
    ],
  );
  return Iaddress;
}

before(async () => {
  accounts = await ethers.getSigners();
  [owner, treasury] = accounts;

  const provider = ethers.getDefaultProvider();

  const IndexSwapLibrary = await ethers.getContractFactory("IndexSwapLibrary");
  indexSwapLibrary = await IndexSwapLibrary.deploy();
  await indexSwapLibrary.deployed();

  const AccessController = await ethers.getContractFactory("AccessController");
  accessController = await AccessController.deploy();
  await accessController.deployed();

  const BaseHandler = await ethers.getContractFactory("BaseHandler");
  baseHandler = await BaseHandler.deploy();
  await baseHandler.deployed();

  const VenusHandler = await ethers.getContractFactory("VenusHandler");
  venusHandler = await VenusHandler.deploy();
  await venusHandler.deployed();

  const AlpacaHandler = await ethers.getContractFactory("AlpacaHandler");
  alpacaHandler = await AlpacaHandler.deploy();
  await alpacaHandler.deployed();

  const BeefyHandler = await ethers.getContractFactory("BeefyHandler");
  beefyHandler = await BeefyHandler.deploy();
  await beefyHandler.deployed();

  const WombatHandler = await ethers.getContractFactory("WombatHandler");
  wombatHandler = await WombatHandler.deploy();
  await wombatHandler.deployed();
  await wombatHandler.addOrUpdateProtocolSlippage("2500");

  const ApeSwapLendingHandler = await ethers.getContractFactory("ApeSwapLendingHandler");
  apeSwapLendingHandler = await ApeSwapLendingHandler.deploy();
  await apeSwapLendingHandler.deployed();

  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  priceOracle = await PriceOracle.deploy();
  await priceOracle.deployed();
});

export async function RebalancingDeploy(
  indexSwapAddress: string,
  indexSwapLibraryAddress: string,
  tokenRegistryAddress: string,
  exchangeAddress: string,
  accessController: AccessController,
  ownerAddress: string,
  priceOracle: PriceOracle,
  assetManagerConfig: AssetManagerConfig,
  feeModule: FeeModule,
): Promise<Rebalancing> {
  let rebalancing: Rebalancing;

  const res = await accessController.hasRole(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    ownerAddress,
  );
  // Grant IndexSwap index manager role
  await accessController
    .connect(owner)
    .grantRole("0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16", indexSwapAddress);

  const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary", {
    libraries: {
      IndexSwapLibrary: indexSwapLibraryAddress,
    },
  });
  rebalanceLibrary = await RebalanceLibrary.deploy();
  await rebalanceLibrary.deployed();

  const Rebalancing = await ethers.getContractFactory("Rebalancing", {
    libraries: {
      IndexSwapLibrary: indexSwapLibraryAddress,
      RebalanceLibrary: rebalanceLibrary.address,
    },
  });
  rebalancing = await Rebalancing.deploy();
  await rebalancing.deployed();
  rebalancing.init(indexSwapAddress, accessController.address);

  // Grant owner asset manager admin role
  await accessController.grantRole("0x15900ee5215ef76a9f5d2b8a5ec2fe469c362cbf4d7bef6646ab417b6d169e88", owner.address);

  // Grant owner asset manager role
  await accessController.grantRole("0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819", owner.address);

  // Grant rebalancing index manager role
  await accessController.grantRole(
    "0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16",
    rebalancing.address,
  );

  // Grant owner super admin
  await accessController.grantRole("0xd980155b32cf66e6af51e0972d64b9d5efe0e6f237dfaa4bdc83f990dd79e9c8", owner.address);

  // Granting owner index manager role to swap eth to token
  await accessController.grantRole("0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16", owner.address);

  await accessController.grantRole(
    "0x516339d85ab12e7c2454a5a806ee27e82ad851d244092d49dc944d35f3f89061",
    exchangeAddress,
  );

  //Grant rebalancing rebalancer contract role
  await accessController.grantRole(
    "0x8e73530dd444215065cdf478f826e993aeb5e2798587f0bbf5a978bd97df63ea",
    rebalancing.address,
  );

  // grant fee module role for minting
  await accessController.grantRole(
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
    feeModule.address,
  );

  return rebalancing;
}

export {
  tokenRegistry,
  indexSwapLibrary,
  accessController,
  baseHandler,
  pancakeLpHandler,
  venusHandler,
  biSwapLPHandler,
  apeSwapLPHandler,
  apeSwapLendingHandler,
  alpacaHandler,
  beefyLPHandler,
  beefyHandler,
  wombatHandler,
  slippageController,
  rebalanceLibrary,
};
