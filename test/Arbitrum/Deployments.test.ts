import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { chainIdToAddresses } from "../../scripts/networkVariables";
import {
  IERC20Upgradeable,
  IndexSwap,
  IndexSwap__factory,
  PriceOracleL2,
  IERC20Upgradeable__factory,
  IndexSwapLibrary,
  BaseHandler,
  Exchange,
  TokenRegistry,
  Rebalancing,
  AccessController,
  IndexFactory,
  VelvetSafeModule,
  OffChainRebalance__factory,
  AssetManagerConfig,
  FeeModule,
  SushiSwapLPHandler,
  WombatHandler,
  BeefyLPHandler,
  BeefyBridgeHandler,
  SlippageControl,
  RebalanceLibrary,
  CompoundV3Handler,
  ApeSwapLPHandler,
  AaveV3Handler,
  HopHandler
} from "../../typechain";

let tokenRegistry: TokenRegistry;
let indexSwapLibrary: IndexSwapLibrary;
let baseHandler: BaseHandler;
let sushiLpHandler: SushiSwapLPHandler;
let wombatHandler: WombatHandler;
let beefyLPHandler: BeefyLPHandler;
let beefyHandler: BeefyBridgeHandler;
let hopHandler : HopHandler;
let compoundHandlerv3: CompoundV3Handler;
let aaveHandlerv3: AaveV3Handler;
let accessController: AccessController;
let slippageController: SlippageControl;
let rebalanceLibrary: RebalanceLibrary;
let owner: SignerWithAddress;
let treasury: SignerWithAddress;
let wbnbAddress: string;
let busdAddress: string;
let daiAddress: string;
let dogeAddress: string;
let linkAddress: string;
let cakeAddress: string;
let usdtAddress: string;
let accounts;
let priceOracle: any;
let wethAddress: string;
let btcAddress: string;
let arbAddress: string;
let apeSwapLPHandler: ApeSwapLPHandler;
let velvetSafeModule: VelvetSafeModule;
const forkChainId: any = process.env.FORK_CHAINID;
const chainId: any = forkChainId ? forkChainId : 42161;
const addresses = chainIdToAddresses[chainId];

export type IAddresses = {
  daiAddress: string;
  dogeAddress: string;
  linkAddress: string;
  cakeAddress: string;
  usdtAddress: string;
  wethAddress: string;
  btcAddress: string;
  arbAddress: string;
};

export async function tokenAddresses(priceOracle: PriceOracleL2, addFeed: boolean): Promise<IAddresses> {
  let Iaddress: IAddresses;

  const daiInstance = new ethers.Contract(addresses.DAI, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  daiAddress = daiInstance.address;

  const btcInstance = new ethers.Contract(addresses.WBTC, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  btcAddress = btcInstance.address;

  const dogeInstance = new ethers.Contract(
    addresses.ADoge,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  dogeAddress = dogeInstance.address;

  const linkInstance = new ethers.Contract(addresses.LINK, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  linkAddress = linkInstance.address;

  const cakeInstance = new ethers.Contract(addresses.CAKE, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  cakeAddress = cakeInstance.address;

  const usdtInstance = new ethers.Contract(addresses.USDT, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  usdtAddress = usdtInstance.address;

  const wethInstance = new ethers.Contract(addresses.WETH, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  wethAddress = wethInstance.address;

  const arbInstance = new ethers.Contract(addresses.ARB, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  arbAddress = arbInstance.address;

  Iaddress = {
    daiAddress,
    dogeAddress,
    linkAddress,
    cakeAddress,
    usdtAddress,
    wethAddress,
    btcAddress,
    arbAddress,
  };

  if (!addFeed) return Iaddress;

  return Iaddress;
}

before(async () => {
  accounts = await ethers.getSigners();
  [owner, treasury] = accounts;

  const PriceOracle = await ethers.getContractFactory("PriceOracleL2");
  priceOracle = await PriceOracle.deploy(addresses.WETH,addresses.SequencerUptimeFeed);
  await priceOracle.deployed();

  const IndexSwapLibrary = await ethers.getContractFactory("IndexSwapLibrary");
  indexSwapLibrary = await IndexSwapLibrary.deploy();
  await indexSwapLibrary.deployed();

  const AccessController = await ethers.getContractFactory("AccessController");
  accessController = await AccessController.deploy();
  await accessController.deployed();

  const BaseHandler = await ethers.getContractFactory("BaseHandler");
  baseHandler = await BaseHandler.deploy(priceOracle.address);
  await baseHandler.deployed();

  const HopHandler = await ethers.getContractFactory("HopHandler");
  hopHandler = await HopHandler.deploy(priceOracle.address);
  await hopHandler.deployed();

  const BeefyHandler = await ethers.getContractFactory("BeefyBridgeHandler");
  beefyHandler = await BeefyHandler.deploy(priceOracle.address,"0xf6a1284Dc2ce247Bca885ac4F36b37E91d3bD032",hopHandler.address);
  await beefyHandler.deployed();

  const CompoundHandlerV3 = await ethers.getContractFactory("CompoundV3Handler");
  compoundHandlerv3 = await CompoundHandlerV3.deploy(priceOracle.address,"0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae");
  await compoundHandlerv3.deployed();

  const AaveHandlerV3 = await ethers.getContractFactory("AaveV3Handler");
  aaveHandlerv3 = await AaveHandlerV3.deploy(priceOracle.address,"0x794a61358D6845594F94dc1DB02A252b5b4814aD","0xB5Ee21786D28c5Ba61661550879475976B707099","0x929EC64c34a17401F460460D4B9390518E5B473e");
  await aaveHandlerv3.deployed();

  const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler");
  apeSwapLPHandler = await ApeSwapLPHandler.deploy(priceOracle.address,"0x7d13268144adcdbEBDf94F654085CC15502849Ff");
  await apeSwapLPHandler.deployed();
  await apeSwapLPHandler.addOrUpdateProtocolSlippage("2500");

  const WombatHandler = await ethers.getContractFactory("WombatHandler");
  wombatHandler = await WombatHandler.deploy(priceOracle.address,"0x62A83C6791A3d7950D823BB71a38e47252b6b6F4","0xc4B2F992496376C6127e73F1211450322E580668");
  await wombatHandler.deployed();
  await wombatHandler.addOrUpdateProtocolSlippage("2500");

  const SushiLPHandler = await ethers.getContractFactory("SushiSwapLPHandler");
  sushiLpHandler = await SushiLPHandler.deploy(priceOracle.address,"0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506");
  await sushiLpHandler.deployed();
  await sushiLpHandler.addOrUpdateProtocolSlippage("2500");

  const BeefyLPHandlerdefault = await ethers.getContractFactory("BeefyLPHandler");
  beefyLPHandler = await BeefyLPHandlerdefault.deploy(sushiLpHandler.address, priceOracle.address);
  await beefyLPHandler.deployed();

  const aggregator = await deployLPAggregators();
  await priceOracle._addFeed(
    [
      addresses.WETH,
      addresses.WBTC,
      addresses.ARB,
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      addresses.USDT,
      addresses.DAI,
      addresses.USDCe,
      addresses.LINK,
      addresses.ADoge,
      addresses.USDC,
      addresses.compound_RewardToken,
      addresses.SushiSwap_WETH_WBTC,
      addresses.SushiSwap_WETH_LINK,
      addresses.SushiSwap_WETH_USDT,
      addresses.SushiSwap_ADoge_WETH,
      addresses.SushiSwap_WETH_ARB,
      addresses.SushiSwap_WETH_USDC,
      addresses.ApeSwap_WBTC_USDT,
      addresses.ApeSwap_WBTC_USDCe,
      addresses.ApeSwap_DAI_USDT,
      addresses.ApeSwap_WETH_USDT
    ],
    [
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
    ],
    [
      "0x639fe6ab55c921f74e7fac1ee960c0b6293ba612",
      "0x6ce185860a4963106506c203335a2910413708e9",
      "0xb2a824043730fe05f3da2efafa1cbbe83fa548d6",
      "0x639fe6ab55c921f74e7fac1ee960c0b6293ba612",
      "0x3f3f5df88dc9f13eac63df89ec16ef6e7e25dde7",
      "0xc5c8e77b397e531b8ec06bfb0048328b30e9ecfb",
      "0x50834f3163758fcc1df9973b6e91f0f0f0434ad3",
      "0x86e53cf1b870786351da77a57575e79cb55812cb",
      "0x9a7fb1b3950837a8d9b40517626e11d4127c098c",
      "0x50834f3163758fcc1df9973b6e91f0f0f0434ad3",
      "0xe7C53FFd03Eb6ceF7d208bC4C13446c76d1E5884",
      aggregator.weth_wbtc_aggregator.address,
      aggregator.weth_link_aggregator.address,
      aggregator.weth_usdt_aggregator.address,
      aggregator.adoge_weth_aggregator.address,
      aggregator.weth_arb_aggregator.address,
      aggregator.weth_usdc_aggregator.address,
      aggregator.apeswap_wbtc_usdt_aggregator.address,
      aggregator.apeswap_wbtc_usdce_aggregator.address,
      aggregator.apeswap_dai_usdt_aggregator.address,
      aggregator.apeswap_weth_usdt_aggregator.address
    ],
  );
});

export async function RebalancingDeploy(
  indexSwapAddress: string,
  indexSwapLibraryAddress: string,
  tokenRegistryAddress: string,
  exchangeAddress: string,
  accessController: AccessController,
  ownerAddress: string,
  priceOracle: PriceOracleL2,
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

export type Aggregators = {
  weth_usdt_aggregator: any;
  weth_wbtc_aggregator: any;
  weth_link_aggregator: any;
  adoge_weth_aggregator: any;
  weth_arb_aggregator: any;
  weth_usdc_aggregator: any;

  apeswap_wbtc_usdt_aggregator: any;
  apeswap_wbtc_usdce_aggregator: any;
  apeswap_dai_usdt_aggregator: any;
  apeswap_weth_usdt_aggregator: any;
};

async function deployLPAggregators(): Promise<Aggregators> {
  let aggregator: Aggregators;
  // Sushiswap LP POOL AGGREGATOR
  const WETH_USDT_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const weth_usdt_aggregator = await WETH_USDT_Aggregator.deploy(addresses.SushiSwap_WETH_USDT, priceOracle.address);
  await weth_usdt_aggregator.deployed();

  const WETH_WBTC_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const weth_wbtc_aggregator = await WETH_WBTC_Aggregator.deploy(addresses.SushiSwap_WETH_WBTC, priceOracle.address);
  await weth_wbtc_aggregator.deployed();

  const WETH_LINK_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const weth_link_aggregator = await WETH_LINK_Aggregator.deploy(addresses.SushiSwap_WETH_LINK, priceOracle.address);
  await weth_link_aggregator.deployed();

  const ADoge_WETH_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const adoge_weth_aggregator = await ADoge_WETH_Aggregator.deploy(addresses.SushiSwap_ADoge_WETH, priceOracle.address);
  await adoge_weth_aggregator.deployed();

  const WETH_ARB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const weth_arb_aggregator = await WETH_ARB_Aggregator.deploy(addresses.SushiSwap_WETH_ARB, priceOracle.address);
  await weth_arb_aggregator.deployed();

  const WETH_USDC_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const weth_usdc_aggregator = await WETH_USDC_Aggregator.deploy(addresses.SushiSwap_WETH_USDC, priceOracle.address);
  await weth_usdc_aggregator.deployed();

  // ApeSwap LP Aggregator
  const ApeSwap_WBTC_USDT_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const apeswap_wbtc_usdt_aggregator = await ApeSwap_WBTC_USDT_Aggregator.deploy(
    addresses.ApeSwap_WBTC_USDT,
    priceOracle.address,
  );
  await apeswap_wbtc_usdt_aggregator.deployed();

  const ApeSwap_WBTC_USDCe_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const apeswap_wbtc_usdce_aggregator = await ApeSwap_WBTC_USDCe_Aggregator.deploy(
    addresses.ApeSwap_WBTC_USDCe,
    priceOracle.address,
  );
  await apeswap_wbtc_usdce_aggregator.deployed();

  const ApeSwap_DAI_USDT_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const apeswap_dai_usdt_aggregator = await ApeSwap_DAI_USDT_Aggregator.deploy(
    addresses.ApeSwap_DAI_USDT,
    priceOracle.address,
  );
  await apeswap_dai_usdt_aggregator.deployed();

  const ApeSwap_WETH_USDT_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const apeswap_weth_usdt_aggregator = await ApeSwap_WETH_USDT_Aggregator.deploy(
    addresses.ApeSwap_WETH_USDT,
    priceOracle.address,
  );
  await apeswap_weth_usdt_aggregator.deployed();
  



  aggregator = {
    weth_usdt_aggregator,
    weth_wbtc_aggregator,
    weth_link_aggregator,
    adoge_weth_aggregator,
    weth_arb_aggregator,
    weth_usdc_aggregator,
    apeswap_wbtc_usdt_aggregator,
    apeswap_wbtc_usdce_aggregator,
    apeswap_dai_usdt_aggregator,
    apeswap_weth_usdt_aggregator
  };

  return aggregator;
}

export {
  tokenRegistry,
  indexSwapLibrary,
  accessController,
  baseHandler,
  sushiLpHandler,
  beefyLPHandler,
  beefyHandler,
  wombatHandler,
  compoundHandlerv3,
  aaveHandlerv3,
  slippageController,
  rebalanceLibrary,
  priceOracle,
  apeSwapLPHandler,
  hopHandler
};