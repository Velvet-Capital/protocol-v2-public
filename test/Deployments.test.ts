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
  ApeSwapLendingHandler,
  BeefyHandler,
  SlippageControl,
  RebalanceLibrary,
} from "../typechain";

let tokenRegistry: TokenRegistry;
let indexSwapLibrary: IndexSwapLibrary;
let baseHandler: BaseHandler;
let venusHandler: VenusHandler;
let pancakeLpHandler: PancakeSwapLPHandler;
let biSwapLPHandler: BiSwapLPHandler;
let apeSwapLPHandler: ApeSwapLPHandler;
let apeSwapLendingHandler: ApeSwapLendingHandler;
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
let usdcAddress: string;
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
  usdcAddress: string;
};

export async function tokenAddresses(): Promise<IAddresses> {
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

  const usdcInstance = new ethers.Contract(
    addresses.USDC_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  usdcAddress = usdcInstance.address;

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
    usdcAddress,
  };

  return Iaddress;
}

before(async () => {
  accounts = await ethers.getSigners();
  [owner, treasury] = accounts;

  const provider = ethers.getDefaultProvider();

  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  priceOracle = await PriceOracle.deploy("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
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

  const VenusHandler = await ethers.getContractFactory("VenusHandler");
  venusHandler = await VenusHandler.deploy(priceOracle.address);
  await venusHandler.deployed();

  const BeefyHandler = await ethers.getContractFactory("BeefyHandler");
  beefyHandler = await BeefyHandler.deploy(priceOracle.address);
  await beefyHandler.deployed();

  const WombatHandler = await ethers.getContractFactory("WombatHandler");
  wombatHandler = await WombatHandler.deploy(priceOracle.address);
  await wombatHandler.deployed();
  await wombatHandler.addOrUpdateProtocolSlippage("2500");

  const ApeSwapLendingHandler = await ethers.getContractFactory("ApeSwapLendingHandler");
  apeSwapLendingHandler = await ApeSwapLendingHandler.deploy(priceOracle.address);
  await apeSwapLendingHandler.deployed();

  const PancakeLPHandler = await ethers.getContractFactory("PancakeSwapLPHandler");
  pancakeLpHandler = await PancakeLPHandler.deploy(priceOracle.address);
  await pancakeLpHandler.deployed();
  await pancakeLpHandler.addOrUpdateProtocolSlippage("2500");

  const BiSwapLPHandler = await ethers.getContractFactory("BiSwapLPHandler");
  biSwapLPHandler = await BiSwapLPHandler.deploy(priceOracle.address);
  await biSwapLPHandler.deployed();
  await biSwapLPHandler.addOrUpdateProtocolSlippage("2500");

  const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler");
  apeSwapLPHandler = await ApeSwapLPHandler.deploy(priceOracle.address);
  await apeSwapLPHandler.deployed();
  await apeSwapLPHandler.addOrUpdateProtocolSlippage("2500");

  const BeefyLPHandlerdefault = await ethers.getContractFactory("BeefyLPHandler");
  beefyLPHandler = await BeefyLPHandlerdefault.deploy(pancakeLpHandler.address, priceOracle.address);
  await beefyLPHandler.deployed();

  const aggregator = await deployLPAggregators();

  await priceOracle._addFeed(
    [
      addresses.WBNB,
      addresses.BUSD,
      addresses.DAI_Address,
      addresses.ETH_Address,
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      addresses.ETH_Address,
      "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      addresses.BUSD,
      addresses.DOGE_Address,
      addresses.LINK_Address,
      addresses.CAKE_Address,
      addresses.USDT,
      "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
      addresses.USDC_Address,
      addresses.ADA,
      addresses.BAND,
      addresses.DOT,
      addresses.WBNB_BUSDLP_Address,
      addresses.Cake_BUSDLP_Address,
      addresses.Cake_WBNBLP_Address,
      addresses.ADA_WBNBLP_Address,
      addresses.BAND_WBNBLP_Address,
      addresses.DOT_WBNBLP_Address,
      addresses.DOGE_WBNBLP_Address,
      addresses.BUSD_BTCLP_Address,
      addresses.BTC_WBNBLP_Address,
      addresses.BSwap_WBNB_BUSDLP_Address,
      addresses.BSwap_BUSDT_BUSDLP_Address,
      addresses.BSwap_BUSDT_WBNBLP_Address,
      addresses.BSwap_ETH_BTCLP_Address,
      addresses.BSwap_BTC_WBNBLP_Address,
      addresses.BSwap_DOGE_WBNBLPAddress,
      addresses.ApeSwap_WBNB_BUSD_Address,
      addresses.ApeSwap_ETH_BTCB_Address,
      addresses.ApeSwap_ETH_WBNB_Address,
      addresses.ApeSwap_USDT_WBNB_Address,
      addresses.ApeSwap_DOGE_WBNB_Address,
      addresses.BSwap_WBNB_XVSLP_Address,
      addresses.BSwap_WBNB_LINKLP_Address,
    ],
    [
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      "0x0000000000000000000000000000000000000348",
      addresses.WBNB,
      addresses.ETH_Address,
      addresses.WBNB,
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
      "0x51597f405303C4377E36123cBc172b13269EA163",
      "0xa767f745331D267c7751297D982b050c93985627",
      "0xC78b99Ae87fF43535b0C782128DB3cB49c74A4d3",
      "0xC333eb0086309a16aa7c8308DfD32c8BBA0a2592",
      aggregator.wbnb_busd_aggregator.address,
      aggregator.cake_busd_aggregator.address,
      aggregator.cake_wbnb_aggregator.address,
      aggregator.ada_wbnb_aggregator.address,
      aggregator.band_wbnb_aggregator.address,
      aggregator.dot_wbnb_aggregator.address,
      aggregator.doge_wbnb_aggregator.address,
      aggregator.busd_btc_aggregator.address,
      aggregator.btc_wbnb_aggregator.address,
      aggregator.bswap_wbnb_busd_aggregator.address,
      aggregator.bswap_busdt_busd_aggregator.address,
      aggregator.bswap_busdt_wbnb_aggregator.address,
      aggregator.bswap_eth_btc_aggregator.address,
      aggregator.bswap_btc_wbnb_aggregator.address,
      aggregator.bswap_doge_wbnb_aggregator.address,
      aggregator.apeswap_wbnb_busd_aggregator.address,
      aggregator.apeswap_eth_btcb_aggregator.address,
      aggregator.apeswap_eth_wbnb_aggregator.address,
      aggregator.apeswap_usdt_wbnb_aggregator.address,
      aggregator.apeswap_doge_wbnb_aggregator.address,
      aggregator.bswap_wbnb_xvs_aggregator.address,
      aggregator.bswap_wbnb_link_aggregator.address,
    ],
  );
});

export type Aggregators = {
  wbnb_busd_aggregator: any;
  cake_busd_aggregator: any;
  cake_wbnb_aggregator: any;
  ada_wbnb_aggregator: any;
  band_wbnb_aggregator: any;
  dot_wbnb_aggregator: any;
  doge_wbnb_aggregator: any;
  busd_btc_aggregator: any;
  btc_wbnb_aggregator: any;
  bswap_wbnb_busd_aggregator: any;
  bswap_busdt_busd_aggregator: any;
  bswap_busdt_wbnb_aggregator: any;
  bswap_eth_btc_aggregator: any;
  bswap_btc_wbnb_aggregator: any;
  bswap_doge_wbnb_aggregator: any;
  bswap_wbnb_xvs_aggregator: any;
  apeswap_wbnb_busd_aggregator: any;
  apeswap_eth_btcb_aggregator: any;
  apeswap_eth_wbnb_aggregator: any;
  apeswap_usdt_wbnb_aggregator: any;
  apeswap_doge_wbnb_aggregator: any;
  bswap_wbnb_link_aggregator: any;
};

async function deployLPAggregators(): Promise<Aggregators> {
  let aggregator: Aggregators;
  // PANCAKE LP POOL AGGREGATOR
  const WBNB_BUSD_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const wbnb_busd_aggregator = await WBNB_BUSD_Aggregator.deploy(addresses.WBNB_BUSDLP_Address, priceOracle.address);
  await wbnb_busd_aggregator.deployed();

  const Cake_BUSD_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const cake_busd_aggregator = await Cake_BUSD_Aggregator.deploy(addresses.Cake_BUSDLP_Address, priceOracle.address);
  await cake_busd_aggregator.deployed();

  const Cake_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const cake_wbnb_aggregator = await Cake_WBNB_Aggregator.deploy(addresses.Cake_WBNBLP_Address, priceOracle.address);
  await cake_wbnb_aggregator.deployed();

  const ADA_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const ada_wbnb_aggregator = await ADA_WBNB_Aggregator.deploy(addresses.ADA_WBNBLP_Address, priceOracle.address);
  await ada_wbnb_aggregator.deployed();

  const BAND_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const band_wbnb_aggregator = await BAND_WBNB_Aggregator.deploy(addresses.BAND_WBNBLP_Address, priceOracle.address);
  await band_wbnb_aggregator.deployed();

  const DOT_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const dot_wbnb_aggregator = await DOT_WBNB_Aggregator.deploy(addresses.DOT_WBNBLP_Address, priceOracle.address);
  await dot_wbnb_aggregator.deployed();

  const DOGE_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const doge_wbnb_aggregator = await DOGE_WBNB_Aggregator.deploy(addresses.DOGE_WBNBLP_Address, priceOracle.address);
  await doge_wbnb_aggregator.deployed();

  const BUSD_BTC_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const busd_btc_aggregator = await BUSD_BTC_Aggregator.deploy(addresses.BUSD_BTCLP_Address, priceOracle.address);
  await busd_btc_aggregator.deployed();

  const BTC_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const btc_wbnb_aggregator = await BTC_WBNB_Aggregator.deploy(addresses.BTC_WBNBLP_Address, priceOracle.address);
  await btc_wbnb_aggregator.deployed();

  //BISWAP LP POOL

  const BSwap_WBNB_BUSDAggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const bswap_wbnb_busd_aggregator = await BSwap_WBNB_BUSDAggregator.deploy(
    addresses.BSwap_WBNB_BUSDLP_Address,
    priceOracle.address,
  );
  await bswap_wbnb_busd_aggregator.deployed();

  const BSwap_BUSDT_BUSD_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const bswap_busdt_busd_aggregator = await BSwap_BUSDT_BUSD_Aggregator.deploy(
    addresses.BSwap_BUSDT_BUSDLP_Address,
    priceOracle.address,
  );
  await bswap_busdt_busd_aggregator.deployed();

  const BSwap_BUSDT_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const bswap_busdt_wbnb_aggregator = await BSwap_BUSDT_WBNB_Aggregator.deploy(
    addresses.BSwap_BUSDT_WBNBLP_Address,
    priceOracle.address,
  );
  await bswap_busdt_wbnb_aggregator.deployed();

  const BSwap_ETH_BTC_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const bswap_eth_btc_aggregator = await BSwap_ETH_BTC_Aggregator.deploy(
    addresses.BSwap_ETH_BTCLP_Address,
    priceOracle.address,
  );
  await bswap_eth_btc_aggregator.deployed();

  const BSwap_BTC_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const bswap_btc_wbnb_aggregator = await BSwap_BTC_WBNB_Aggregator.deploy(
    addresses.BSwap_BTC_WBNBLP_Address,
    priceOracle.address,
  );
  await bswap_btc_wbnb_aggregator.deployed();

  const BSwap_DOGE_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const bswap_doge_wbnb_aggregator = await BSwap_DOGE_WBNB_Aggregator.deploy(
    addresses.BSwap_DOGE_WBNBLPAddress,
    priceOracle.address,
  );
  await bswap_doge_wbnb_aggregator.deployed();

  const BSwap_WBNB_XVSLP_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const bswap_wbnb_xvs_aggregator = await BSwap_WBNB_XVSLP_Aggregator.deploy(
    addresses.BSwap_WBNB_XVSLP_Address,
    priceOracle.address,
  );
  await bswap_wbnb_xvs_aggregator.deployed();

  const BSwap_WBNB_LINK_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const bswap_wbnb_link_aggregator = await BSwap_WBNB_LINK_Aggregator.deploy(
    addresses.BSwap_WBNB_LINKLP_Address,
    priceOracle.address,
  );
  await bswap_wbnb_link_aggregator.deployed();

  //APESWAP LP POOL AGGREGATOR

  const ApeSwap_WBNB_BUSD_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const apeswap_wbnb_busd_aggregator = await ApeSwap_WBNB_BUSD_Aggregator.deploy(
    addresses.ApeSwap_WBNB_BUSD_Address,
    priceOracle.address,
  );
  await apeswap_wbnb_busd_aggregator.deployed();

  const ApeSwap_ETH_BTCB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const apeswap_eth_btcb_aggregator = await ApeSwap_ETH_BTCB_Aggregator.deploy(
    addresses.ApeSwap_ETH_BTCB_Address,
    priceOracle.address,
  );
  await apeswap_eth_btcb_aggregator.deployed();

  const ApeSwap_ETH_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const apeswap_eth_wbnb_aggregator = await ApeSwap_ETH_WBNB_Aggregator.deploy(
    addresses.ApeSwap_ETH_WBNB_Address,
    priceOracle.address,
  );
  await apeswap_eth_wbnb_aggregator.deployed();

  const ApeSwap_USDT_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const apeswap_usdt_wbnb_aggregator = await ApeSwap_USDT_WBNB_Aggregator.deploy(
    addresses.ApeSwap_USDT_WBNB_Address,
    priceOracle.address,
  );
  await apeswap_usdt_wbnb_aggregator.deployed();

  const ApeSwap_DOGE_WBNB_Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
  const apeswap_doge_wbnb_aggregator = await ApeSwap_DOGE_WBNB_Aggregator.deploy(
    addresses.ApeSwap_DOGE_WBNB_Address,
    priceOracle.address,
  );
  await apeswap_doge_wbnb_aggregator.deployed();

  aggregator = {
    wbnb_busd_aggregator,
    cake_busd_aggregator,
    cake_wbnb_aggregator,
    ada_wbnb_aggregator,
    band_wbnb_aggregator,
    dot_wbnb_aggregator,
    doge_wbnb_aggregator,
    busd_btc_aggregator,
    btc_wbnb_aggregator,
    bswap_wbnb_busd_aggregator,
    bswap_busdt_busd_aggregator,
    bswap_busdt_wbnb_aggregator,
    bswap_eth_btc_aggregator,
    bswap_btc_wbnb_aggregator,
    bswap_doge_wbnb_aggregator,
    bswap_wbnb_xvs_aggregator,
    apeswap_wbnb_busd_aggregator,
    apeswap_eth_btcb_aggregator,
    apeswap_eth_wbnb_aggregator,
    apeswap_usdt_wbnb_aggregator,
    apeswap_doge_wbnb_aggregator,
    bswap_wbnb_link_aggregator,
  };

  return aggregator;
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
  beefyLPHandler,
  beefyHandler,
  wombatHandler,
  slippageController,
  rebalanceLibrary,
  priceOracle,
};