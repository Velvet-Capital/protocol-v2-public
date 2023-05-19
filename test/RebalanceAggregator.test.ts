import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import hre from "hardhat";
import { ethers, upgrades, waffle } from "hardhat";
import { BigNumber, Contract } from "ethers";

import {
  tokenAddresses,
  IAddresses,
  indexSwapLibrary,
  venusHandler,
  pancakeLpHandler,
  biSwapLPHandler,
  liqeeHandler,
  apeSwapLPHandler,
  apeSwapLendingHandler,
  alpacaHandler,
  wombatHandler,
  accessController,
  baseHandler,
  rebalanceLibrary
} from "./Deployments.test";

import {
  IndexSwap,
  IndexSwap__factory,
  Exchange,
  Rebalancing__factory,
  Rebalancing,
  OffChainRebalance,
  AccessController,
  IndexFactory,
  PancakeSwapHandler,
  VelvetSafeModule,
  ZeroExHandler,
  OneInchHandler,
  OpenOceanHandler,
  ParaswapHandler,
  OffChainRebalance__factory,
  RebalanceAggregator__factory,
  Vault,
  PriceOracle,
  AssetManagerConfig,
  TokenRegistry,
  ERC20Upgradeable,
  OffChainIndexSwap,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";

var chai = require("chai");

const axios = require("axios");
const qs = require("qs");

const ps = require("prompt-sync");

//use default BigNumber
chai.use(require("chai-bignumber")());

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe.only("Tests for MetaAggregator", () => {
  let accounts;
  let iaddress: IAddresses;
  let vaultAddress: string;
  let swapHandler: PancakeSwapHandler;
  let assetManagerConfig: AssetManagerConfig;
  let exchange: Exchange;
  let priceOracle: PriceOracle;
  let indexSwap: any;
  let indexSwap1: any;
  let indexSwap2: any;
  let indexSwap3: any;
  let indexSwap4: any;
  let indexSwap5: any;
  let indexSwapContract: IndexSwap;
  let indexFactory: IndexFactory;
  let swapHandler1: PancakeSwapHandler;
  let velvetSafeModule: VelvetSafeModule;
  //let lendingHandler: LendingHandler;
  let oneInchHandler: OneInchHandler;
  let openOceanHandler: OpenOceanHandler;
  let paraswapHandler: ParaswapHandler;
  let rebalancing: any;
  let rebalancing1: any;
  let rebalancing2: any;
  let rebalancing3: any;
  let rebalancing4: any;
  let rebalancing5: any;
  let offChainRebalance: any;
  let offChainRebalance1: any;
  let offChainRebalance2: any;
  let offChainRebalance3: any;
  let offChainRebalance4: any;
  let offChainRebalance5: any;
  let metaAggregator: any;
  let metaAggregator1: any;
  let metaAggregator2: any;
  let metaAggregator3: any;
  let metaAggregator4: any;
  let metaAggregator5: any;
  let tokenRegistry: TokenRegistry;
  let offChainIndexSwap: OffChainIndexSwap;
  let accessController1: AccessController;
  let accessController2: AccessController;
  let accessController3: AccessController;
  let txObject;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let assetManagerAdmin: SignerWithAddress;
  let assetManager: SignerWithAddress;
  let velvetManager: SignerWithAddress;
  let whitelistManagerAdmin: SignerWithAddress;
  let whitelistManager: SignerWithAddress;
  let assetManagerTreasury: SignerWithAddress;
  let zeroExHandler: ZeroExHandler;
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  let velvetTreasuryBalance = 0;
  let assetManagerTreasuryBalance = 0;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe.only("Tests for ExternalSwapHandler contract", () => {
    before(async () => {
      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      priceOracle = await PriceOracle.deploy();
      await priceOracle.deployed();

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();

      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, treasury, assetManagerTreasury, addr1, addr2, ...addrs] = accounts;

      iaddress = await tokenAddresses(priceOracle, true);

      const ZeroExHandler = await ethers.getContractFactory("ZeroExHandler");
      zeroExHandler = await ZeroExHandler.deploy();
      await zeroExHandler.deployed();

      zeroExHandler.init(iaddress.wbnbAddress, "0xdef1c0ded9bec7f1a1670819833240f027b25eff");

      const IndexOperations = await ethers.getContractFactory("IndexOperations", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const indexOperations = await IndexOperations.deploy();
      await indexOperations.deployed();

      await tokenRegistry.initialize(
        "100",
        "1000",
        "1000",
        "10000000000000000",
        "500000000000000000000",
        treasury.address,
        addresses.WETH_Address,
        indexOperations.address,
        "1",
      );

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      exchange = await Exchange.deploy();
      await exchange.deployed();

      const PancakeSwapHandler = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      const provider = ethers.getDefaultProvider();

      const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const rebalanceLibrary = await RebalanceLibrary.deploy();
      await rebalanceLibrary.deployed();

      const OffChainRebalance = await ethers.getContractFactory("OffChainRebalance", {
        libraries: {
          RebalanceLibrary: rebalanceLibrary.address,
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const offChainRebalanceDefault = await OffChainRebalance.deploy();
      await offChainRebalanceDefault.deployed();

      const RebalanceAggregator = await ethers.getContractFactory("RebalanceAggregator", {
        libraries: {
          RebalanceLibrary: rebalanceLibrary.address,
        },
      });
      const rebalanceAggregatorDefault = await RebalanceAggregator.deploy();
      await rebalanceAggregatorDefault.deployed();

      const Rebalancing = await ethers.getContractFactory("Rebalancing", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
          RebalanceLibrary: rebalanceLibrary.address,
        },
      });
      const rebalancingDefult = await Rebalancing.deploy();
      await rebalancingDefult.deployed();

      const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
      const assetManagerConfig = await AssetManagerConfig.deploy();
      await assetManagerConfig.deployed();
      await assetManagerConfig.init({
        _managementFee: "100",
        _performanceFee: "10",
        _minInvestmentAmount: "10000000000000000",
        _maxInvestmentAmount: "500000000000000000000",
        _tokenRegistry: tokenRegistry.address,
        _accessController: accessController.address,
        _assetManagerTreasury: treasury.address,
        _whitelistedTokens: [],
        _publicPortfolio: true,
        _transferable: true,
        _transferableToPublic: true,
        _whitelistTokens: false,
      });

      const IndexSwap = await ethers.getContractFactory("IndexSwap", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      indexSwapContract = await IndexSwap.deploy();
      await indexSwapContract.deployed();

      const offChainIndex = await ethers.getContractFactory("OffChainIndexSwap", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const offChainIndexSwap = await offChainIndex.deploy();
      await offChainIndexSwap.deployed();

      const PancakeSwapHandler1 = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler1 = await PancakeSwapHandler1.deploy();
      await swapHandler1.deployed();

      swapHandler1.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      zeroExHandler.init(iaddress.wbnbAddress, "0xdef1c0ded9bec7f1a1670819833240f027b25eff");

      const OneInchSwapHandler = await ethers.getContractFactory("OneInchHandler");
      oneInchHandler = await OneInchSwapHandler.deploy();
      await oneInchHandler.deployed();

      oneInchHandler.init(iaddress.wbnbAddress, "0x1111111254EEB25477B68fb85Ed929f73A960582");

      const OpenOceanHandler = await ethers.getContractFactory("OpenOceanHandler");
      openOceanHandler = await OpenOceanHandler.deploy();
      await openOceanHandler.deployed();

      openOceanHandler.init(iaddress.wbnbAddress, "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64");

      const ParaswapHandler = await ethers.getContractFactory("ParaswapHandler");
      paraswapHandler = await ParaswapHandler.deploy();
      await paraswapHandler.deployed();

      paraswapHandler.init(
        iaddress.wbnbAddress,
        "0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57",
        "0x216B4B4Ba9F3e719726886d34a177484278Bfcae",
      );

      await tokenRegistry.addRewardToken(addresses.venus_RewardToken);
      let registry = await tokenRegistry.enableToken(
        [
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
        ],
        [
          iaddress.busdAddress,
          iaddress.btcAddress,
          iaddress.ethAddress,
          iaddress.wbnbAddress,
          iaddress.dogeAddress,
          iaddress.daiAddress,
          addresses.vBNB_Address,
          addresses.WBNB_BUSDLP_Address,
          addresses.Cake_WBNBLP_Address,
          addresses.qBNB,
          addresses.qETH,
          addresses.BSwap_BTC_WBNBLP_Address,
          addresses.ApeSwap_ETH_BTCB_Address,
          addresses.ibBUSD_Address,
          addresses.MAIN_LP_BUSD,
          addresses.oBNB,
        ],
        [
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          venusHandler.address,
          pancakeLpHandler.address,
          pancakeLpHandler.address,
          liqeeHandler.address,
          liqeeHandler.address,
          biSwapLPHandler.address,
          apeSwapLPHandler.address,
          alpacaHandler.address,
          wombatHandler.address,
          apeSwapLendingHandler.address,
        ],
        [
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.liqee_RewardToken],
          [addresses.liqee_RewardToken],
          [addresses.biswap_RewardToken],
          [addresses.apeSwap_RewardToken],
          [addresses.base_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.apeSwap_RewardToken],
        ],
        [true, true, true, true, true, true, false, false, false, false, false, false, false, false, false, false],
      );
      registry.wait();

      tokenRegistry.enableExternalSwapHandler(zeroExHandler.address);
      tokenRegistry.enableExternalSwapHandler(oneInchHandler.address);
      tokenRegistry.enableExternalSwapHandler(openOceanHandler.address);
      tokenRegistry.enableExternalSwapHandler(paraswapHandler.address);
      tokenRegistry.enableSwapHandlers([swapHandler.address]);

      tokenRegistry.addNonDerivative(wombatHandler.address);

      let whitelistedTokens = [
        iaddress.wbnbAddress,
        iaddress.busdAddress,
        iaddress.daiAddress,
        iaddress.ethAddress,
        iaddress.btcAddress,
        iaddress.dogeAddress,
        addresses.vETH_Address,
        addresses.vBTC_Address,
        addresses.vBNB_Address,
        addresses.vDAI_Address,
        addresses.vDOGE_Address,
        addresses.vLINK_Address,
        addresses.qBNB,
        addresses.qETH,
        addresses.qUSX,
        addresses.qFIL,
        addresses.Cake_BUSDLP_Address,
        addresses.Cake_WBNBLP_Address,
        addresses.WBNB_BUSDLP_Address,
        addresses.ADA_WBNBLP_Address,
        addresses.BAND_WBNBLP_Address,
        addresses.DOT_WBNBLP_Address,
        addresses.BSwap_BUSDT_BUSDLP_Address,
        addresses.BSwap_BUSDT_WBNBLP_Address,
        addresses.BSwap_WBNB_BUSDLP_Address,
        addresses.BSwap_BTC_WBNBLP_Address,
        addresses.BSwap_ETH_BTCLP_Address,
        addresses.ibBNB_Address,
        addresses.ibBUSD_Address,
        addresses.ibBTCB_Address,
        addresses.MAIN_LP_BUSD,
        addresses.oBNB,
      ];

      let whitelist = [owner.address];

      const FeeLibrary = await ethers.getContractFactory("FeeLibrary");
      const feeLibrary = await FeeLibrary.deploy();
      await feeLibrary.deployed();

      const FeeModule = await ethers.getContractFactory("FeeModule", {
        libraries: {
          FeeLibrary: feeLibrary.address,
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const feeModule = await FeeModule.deploy();
      await feeModule.deployed();

      const VelvetSafeModule = await ethers.getContractFactory("VelvetSafeModule");
      velvetSafeModule = await VelvetSafeModule.deploy();
      await velvetSafeModule.deployed();

      const IndexFactory = await ethers.getContractFactory("IndexFactory");
      const indexFactoryInstance = await upgrades.deployProxy(
        IndexFactory,
        [
          {
            _indexSwapLibrary: indexSwapLibrary.address,
            _baseIndexSwapAddress: indexSwapContract.address,
            _baseRebalancingAddres: rebalancingDefult.address,
            _baseOffChainRebalancingAddress: offChainRebalanceDefault.address,
            _baseRebalanceAggregatorAddress: rebalanceAggregatorDefault.address,
            _baseExchangeHandlerAddress: exchange.address,
            _baseAssetManagerConfigAddress: assetManagerConfig.address,
            _baseOffChainIndexSwapAddress: offChainIndexSwap.address,
            _feeModuleImplementationAddress: feeModule.address,
            _baseVelvetGnosisSafeModuleAddress: velvetSafeModule.address,
            _gnosisSingleton: addresses.gnosisSingleton,
            _gnosisFallbackLibrary : addresses.gnosisFallbackLibrary,
            _gnosisMultisendLibrary : addresses.gnosisMultisendLibrary,
            _gnosisSafeProxyFactory : addresses.gnosisSafeProxyFactory,
            _priceOracle: priceOracle.address,
            _tokenRegistry: tokenRegistry.address,
            _velvetProtocolFee: "100",
            _maxInvestmentAmount: "500000000000000000000",
            _minInvestmentAmount: "10000000000000000",
          },
        ],
        { kind: "uups" },
      );

      indexFactory = IndexFactory.attach(indexFactoryInstance.address);
      console.log("indexFactory address:", indexFactory.address);
      const indexFactoryCreate = await indexFactory.createIndexCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "500000000000000000000",
        minIndexInvestmentAmount: "10000000000000000",
        _managementFee: "100",
        _performanceFee: "10",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: false,
        _transferableToPublic: false,
        _whitelistTokens: true,
      },[owner.address],1);
      
      const indexFactoryCreate2 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "500000000000000000000",
        minIndexInvestmentAmount: "10000000000000000",
        _managementFee: "100",
        _performanceFee: "10",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: false,
        _transferableToPublic: false,
        _whitelistTokens: true,
      });
      const indexFactoryCreate3 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "500000000000000000000",
        minIndexInvestmentAmount: "10000000000000000",
        _managementFee: "100",
        _performanceFee: "10",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: false,
        _transferableToPublic: false,
        _whitelistTokens: true,
      });
      const indexFactoryCreate4 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "500000000000000000000",
        minIndexInvestmentAmount: "10000000000000000",
        _managementFee: "100",
        _performanceFee: "10",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: false,
        _transferableToPublic: false,
        _whitelistTokens: true,
      });

      const indexFactoryCreate5 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "500000000000000000000",
        minIndexInvestmentAmount: "10000000000000000",
        _managementFee: "100",
        _performanceFee: "10",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: false,
        _transferableToPublic: false,
        _whitelistTokens: true,
      });

      const indexFactoryCreate6 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "500000000000000000000",
        minIndexInvestmentAmount: "10000000000000000",
        _managementFee: "100",
        _performanceFee: "10",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: false,
        _transferableToPublic: false,
        _whitelistTokens: true,
      });

      const indexAddress = await indexFactory.getIndexList(0);
      const indexInfo = await indexFactory.IndexSwapInfolList(0);

      const indexAddress1 = await indexFactory.getIndexList(1);
      const indexInfo1 = await indexFactory.IndexSwapInfolList(1);

      const indexAddress2 = await indexFactory.getIndexList(2);
      const indexInfo2 = await indexFactory.IndexSwapInfolList(2);

      const indexAddress3 = await indexFactory.getIndexList(3);
      const indexInfo3 = await indexFactory.IndexSwapInfolList(3);

      const indexAddress4 = await indexFactory.getIndexList(4);
      const indexInfo4 = await indexFactory.IndexSwapInfolList(4);

      const indexAddress5 = await indexFactory.getIndexList(5);
      const indexInfo5 = await indexFactory.IndexSwapInfolList(5);

      indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

      indexSwap1 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress1);

      indexSwap2 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress2);

      indexSwap3 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress3);

      indexSwap4 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress4);

      indexSwap5 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress5);

      console.log("indexSwapAddress1:", indexAddress1);

      rebalancing = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo.rebalancing);

      rebalancing1 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo1.rebalancing);

      rebalancing2 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo2.rebalancing);

      rebalancing3 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo3.rebalancing);

      rebalancing4 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo4.rebalancing);

      rebalancing5 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo5.rebalancing);

      offChainRebalance = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo.offChainRebalancing);

      offChainRebalance1 = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo1.offChainRebalancing);

      offChainRebalance2 = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo2.offChainRebalancing);

      offChainRebalance3 = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo3.offChainRebalancing);

      offChainRebalance4 = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo4.offChainRebalancing);

      offChainRebalance5 = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo5.offChainRebalancing);

      metaAggregator = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo.metaAggregator);
      metaAggregator1 = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo1.metaAggregator);
      metaAggregator2 = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo2.metaAggregator);
      metaAggregator3 = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo3.metaAggregator);
      metaAggregator4 = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo4.metaAggregator);
      metaAggregator5 = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo5.metaAggregator);

      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("ExternalSwapHandler Contract", function () {
      it("Initialize 1st IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        // index.initToken([dogeInstance.address, iaddress.ethAddress],[5000, 5000])
        await index.initToken(
          [iaddress.wbnbAddress, addresses.vBNB_Address],
          [5000, 5000]
        );
      });

      it("Initialize 2nd IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.vBNB_Address, iaddress.btcAddress], [5000, 5000]);
      });

      it("Initialize 3rd IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(2);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([iaddress.ethAddress, addresses.ibBUSD_Address], [5000, 5000]);
      });

      it("Initialize 4th IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(3);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([iaddress.ethAddress, iaddress.busdAddress], [5000, 5000]);
      });

      it("Initialize 5th IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(4);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([iaddress.ethAddress, iaddress.busdAddress], [5000, 5000]);
      });

      it("Initialize 6th IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(5);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([iaddress.wbnbAddress, iaddress.btcAddress], [5000, 5000]);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );

        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.1BNB into 5th fund", async () => {

        const indexSupplyBefore = await indexSwap4.totalSupply();
        await indexSwap4.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap4.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.1BNB into 6th fund", async () => {

        const indexSupplyBefore = await indexSwap5.totalSupply();
        await indexSwap5.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap5.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into index fund", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );

        const indexSupplyBefore = await indexSwap2.totalSupply();
        await indexSwap2.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap2.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into index fund", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );

        const indexSupplyBefore = await indexSwap2.totalSupply();
        await indexSwap2.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap2.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into index fund", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );
        const indexSupplyBefore = await indexSwap3.totalSupply();

        await indexSwap3.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap3.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));

        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );
      });

      it("Invest 1BNB into Top10 2nd Index fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        await indexSwap1.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("redeem should revert back if index not paused", async () => {
        const tokens = await indexSwap.getTokens();
        const sToken = tokens[1];
        const sAmount = ethers.utils.parseEther("100");
        await expect(metaAggregator.redeem(sAmount, "200", sToken)).to.be.reverted;
      });

      it("should pause", async () => {
        await rebalancing.setPause(true);
      });

      it("redeem should revert back if token getting redeem is not valid", async () => {
        const tokens = await indexSwap.getTokens();
        const sToken = addresses.vBNB_Address;
        const sAmount = ethers.utils.parseEther("100");
        await expect(metaAggregator.redeem(sAmount, "200", sToken)).to.be.reverted;
      });

      it("should revert back if the buy token is not registered", async () => {
        const tokens = await indexSwap.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[1];
        const bToken = addresses.vDAI_Address;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap.vault());

        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);

        var exchangeData = {};
        const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator.address);
        exchangeData = {
          sellTokenAddress: [getUnderlyingTokens1[0].toString()],
          buyTokenAddress: [bToken],
          swapHandler: zeroExHandler.address,
          portfolioToken: bToken,
          sellAmount: [bal.toBigInt().toString()],
          protocolFee: [0],
          _lpSlippage: "200",
          callData: ["0x"],
        };
        await expect(metaAggregator.metaAggregatorSwap(exchangeData)).to.be.revertedWithCustomError(
          metaAggregator,
          "BuyTokenAddressNotValid",
        );
      });

      it("should revert back if not redeemed", async () => {
        const tokens = await indexSwap.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[1];
        const bToken = addresses.vBNB_Address;

        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);
       
        var exchangeData = {};
        const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator1.address);
        exchangeData = {
          sellTokenAddress: [getUnderlyingTokens1[0].toString()],
          buyTokenAddress: [getUnderlyingTokens0[0].toString()],
          swapHandler: zeroExHandler.address,
          portfolioToken: bToken,
          sellAmount: [0],
          protocolFee: [0],
          _lpSlippage: "200",
          callData: ["0x"],
        };
        await expect(metaAggregator1.metaAggregatorSwap(exchangeData)).to.be.revertedWithCustomError(
          metaAggregator1,
          "NotRedeemed",
        );
      });

      it("should revert back if redeem is called by non asset manager", async () => {
        const tokens = await indexSwap.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[1];
        const sAmount = ethers.utils.parseEther("100");
        await expect(metaAggregator1.connect(nonOwner).redeem(sAmount, "200", sToken)).to.be.revertedWithCustomError(
          metaAggregator1,
          "CallerNotAssetManager",
        );
      });

      it("should revert back if metaAggregatorSwap is called by non asset manager", async () => {
        const tokens = await indexSwap.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[1];
        const bToken = addresses.vBNB_Address;

        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);

        var exchangeData = {};
        const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator1.address);

        exchangeData = {
          sellTokenAddress: [getUnderlyingTokens1[0].toString()],
          buyTokenAddress: [getUnderlyingTokens0[0].toString()],
          swapHandler: zeroExHandler.address,
          portfolioToken: bToken,
          sellAmount: [0],
          protocolFee: [0],
          _lpSlippage: "200",
          callData: ["0x"],
        };
        await expect(metaAggregator1.connect(nonOwner).metaAggregatorSwap(exchangeData)).to.be.revertedWithCustomError(
          metaAggregator1,
          "CallerNotAssetManager",
        );
      });

      it("should claim tokens", async () => {
        await ethers.provider.send("evm_increaseTime", [31536000]);

        let tokens = [addresses.vBNB_Address];
        await indexSwap1.claimTokens(tokens);

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        let balance = await ERC20.attach(addresses.venus_RewardToken).balanceOf(await indexSwap1.vault());
        console.log("claim", balance);
      });

      it("swaps reward token using 0x Protocol", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = addresses.venus_RewardToken;
        const bToken = iaddress.btcAddress;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        const tx = await metaAggregator1.redeemRewardToken(sToken, sAmount);

        const getUnderlyingTokens1: string[] = [addresses.venus_RewardToken];
        const getUnderlyingTokens0: string[] = [iaddress.btcAddress];

        var zeroExparams = {};
        var exchangeData = {};
        var _sellTokenAddress = [];
        var _buyTokenAddress = [];
        var _sellAmount = [];
        var _protocolFee = [];
        var _callData = [];

        const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator1.address);
        if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
          _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
          _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
          _sellAmount.push(bal.toString());
          _protocolFee.push("0");
          _callData.push("0x");
        } else {
          zeroExparams = {
            sellToken: sToken,
            buyToken: bToken,
            sellAmount: bal.toString(),
            slippagePercentage: 0.06,
          };
          const zeroExResponse = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(zeroExparams)}`,{ '0x-api-key': process.env.ZEROX_KEY});

          var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

          _sellTokenAddress.push(sToken);
          _buyTokenAddress.push(bToken);
          _sellAmount.push(bal.toString());
          _protocolFee.push(fee.toString());
          _callData.push(zeroExResponse.data.data);
        }

        exchangeData = {
          sellTokenAddress: [sToken],
          buyTokenAddress: [bToken],
          swapHandler: zeroExHandler.address,
          portfolioToken: bToken,
          sellAmount: _sellAmount,
          protocolFee: _protocolFee,
          _lpSlippage: "500",
          callData: _callData,
        };

        const balBefore = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap1.vault());

        const tx2 = await metaAggregator1.metaAggregatorSwap(exchangeData);

        const balAfter = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap1.vault());
        const oldTokenBal = await ERC20.attach(sToken.toString()).balanceOf(await indexSwap1.vault());

        const newTokenList = await indexSwap1.getTokens();

        const balAfterSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        expect(Number(balAfter)).to.be.greaterThan(Number(balBefore));
        expect(Number(oldTokenBal)).to.equal(0);
        expect(newTokenList.includes(sToken)).to.be.equal(false);
        expect(newTokenList.includes(bToken)).to.be.equal(true);
        expect(Number(balBeforeSellToken)).to.be.greaterThan(Number(balAfterSellToken));
      });

      it("Invest 1BNB into Top10 fund", async () => {
        await rebalancing.setPause(false);
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("swaps using Paraswap Protocol", async () => {
        const tokens = await indexSwap.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const bToken = iaddress.busdAddress;
        const sAmount = await ERC20.attach(sToken).balanceOf(
          await indexSwap.vault()
        );
        const tx = await metaAggregator.redeem(sAmount, "200", sToken);

        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);

        var exchangeData = {};
        var _sellTokenAddress = [];
        var _buyTokenAddress = [];
        var _sellAmount = [];
        var _protocolFee = [];
        var _callData = [];

        if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 1) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator.address);
          if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _protocolFee.push("0");
            _callData.push("0x");
          } else {
            const paraswapParams = {
              srcToken: getUnderlyingTokens1[0].toString().toLowerCase(),
              destToken: getUnderlyingTokens0[0].toString().toLowerCase(),
              amount: bal.toString(),
              slippage: 600,
              side: "SELL",
              network: 56,
            };

            const paraswapPriceRouteResponse = await axios.get(
              `https://apiv5.paraswap.io/prices?${qs.stringify(paraswapParams)}`,
            );

            const paraswapQuery = {
              ignoreChecks: true,
            };

            await delay(1000);

            const paraswapBuildTxResponse = await axios.post(
              `https://apiv5.paraswap.io/transactions/56?${qs.stringify(paraswapQuery)}`,
              {
                srcToken: paraswapPriceRouteResponse.data.priceRoute.srcToken,
                destToken: paraswapPriceRouteResponse.data.priceRoute.destToken,
                userAddress: paraswapHandler.address.toString().toLowerCase(),
                priceRoute: paraswapPriceRouteResponse.data.priceRoute,
                srcAmount: paraswapPriceRouteResponse.data.priceRoute.srcAmount,
                destAmount: paraswapPriceRouteResponse.data.priceRoute.destAmount,
              },
            );

            await delay(1000);
            var fee = paraswapBuildTxResponse.data.protocolFee ? paraswapBuildTxResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _protocolFee.push(fee.toString());
            _callData.push(paraswapBuildTxResponse.data.data);
          }
        } else if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 2) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator.address);
          var bal1 = bal.div(2);
          var bal2 = bal1;
          var balAmount = [bal1, bal2];

          for (let i = 0; i < getUnderlyingTokens0.length; i++) {
            if (getUnderlyingTokens1[0] == getUnderlyingTokens0[i]) {
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              const paraswapParams = {
                srcToken: getUnderlyingTokens1[0].toString().toLowerCase(),
                destToken: getUnderlyingTokens0[i].toString().toLowerCase(),
                amount: balAmount[i].toString(),
                slippage: 600,
                side: "SELL",
                network: 56,
              };

              const paraswapPriceRouteResponse = await axios.get(
                `https://apiv5.paraswap.io/prices?${qs.stringify(paraswapParams)}`,
              );

              const paraswapQuery = {
                ignoreChecks: true,
              };

              await delay(1000);

              const paraswapBuildTxResponse = await axios.post(
                `https://apiv5.paraswap.io/transactions/56?${qs.stringify(paraswapQuery)}`,
                {
                  srcToken: paraswapPriceRouteResponse.data.priceRoute.srcToken,
                  destToken: paraswapPriceRouteResponse.data.priceRoute.destToken,
                  userAddress: paraswapHandler.address.toString().toLowerCase(),
                  priceRoute: paraswapPriceRouteResponse.data.priceRoute,
                  srcAmount: paraswapPriceRouteResponse.data.priceRoute.srcAmount,
                  destAmount: paraswapPriceRouteResponse.data.priceRoute.destAmount,
                },
              );

              await delay(1000);
              var fee = paraswapBuildTxResponse.data.protocolFee ? paraswapBuildTxResponse.data.protocolFee : 0;

              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _protocolFee.push(fee.toString());
              _callData.push(paraswapBuildTxResponse.data.data);
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 1) {
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            const bal = await ERC20.attach(getUnderlyingTokens1[i]).balanceOf(metaAggregator.address);
            if (getUnderlyingTokens1[i] == getUnderlyingTokens0[0]) {
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              const paraswapParams = {
                srcToken: getUnderlyingTokens1[i].toString().toLowerCase(),
                destToken: getUnderlyingTokens0[0].toString().toLowerCase(),
                amount: bal.toString(),
                slippage: 600,
                side: "SELL",
                network: 56,
              };

              const paraswapPriceRouteResponse = await axios.get(
                `https://apiv5.paraswap.io/prices?${qs.stringify(paraswapParams)}`,
              );

              const paraswapQuery = {
                ignoreChecks: true,
              };

              await delay(1000);

              const paraswapBuildTxResponse = await axios.post(
                `https://apiv5.paraswap.io/transactions/56?${qs.stringify(paraswapQuery)}`,
                {
                  srcToken: paraswapPriceRouteResponse.data.priceRoute.srcToken,
                  destToken: paraswapPriceRouteResponse.data.priceRoute.destToken,
                  userAddress: paraswapHandler.address.toString().toLowerCase(),
                  priceRoute: paraswapPriceRouteResponse.data.priceRoute,
                  srcAmount: paraswapPriceRouteResponse.data.priceRoute.srcAmount,
                  destAmount: paraswapPriceRouteResponse.data.priceRoute.destAmount,
                },
              );

              await delay(1000);
              var fee = paraswapBuildTxResponse.data.protocolFee ? paraswapBuildTxResponse.data.protocolFee : 0;

              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(paraswapBuildTxResponse.data.data);
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 2) {
          var common = [];
          var tempUnder0 = [];
          var tempUnder1 = [];
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            if (getUnderlyingTokens0.includes(getUnderlyingTokens1[i])) {
              common.push(getUnderlyingTokens1[i]);
            } else {
              tempUnder1.push(getUnderlyingTokens1[i]);
            }
          }

          for (let i = 0; i < getUnderlyingTokens0.length; i++) {
            if (!common.includes(getUnderlyingTokens0[i])) {
              tempUnder0.push(getUnderlyingTokens0[i]);
            }
          }

          var newUnderlying0 = tempUnder0.concat(common);
          var newUnderlying1 = tempUnder1.concat(common);

          for (let i = 0; i < newUnderlying1.length; i++) {
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator1.address);
            if (newUnderlying1[i] == newUnderlying0[i]) {
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              const paraswapParams = {
                srcToken: getUnderlyingTokens1[i].toString().toLowerCase(),
                destToken: getUnderlyingTokens0[i].toString().toLowerCase(),
                amount: bal.toString(),
                slippage: 600,
                side: "SELL",
                network: 56,
              };

              const paraswapPriceRouteResponse = await axios.get(
                `https://apiv5.paraswap.io/prices?${qs.stringify(paraswapParams)}`,
              );

              const paraswapQuery = {
                ignoreChecks: true,
              };

              await delay(1000);

              const paraswapBuildTxResponse = await axios.post(
                `https://apiv5.paraswap.io/transactions/56?${qs.stringify(paraswapQuery)}`,
                {
                  srcToken: paraswapPriceRouteResponse.data.priceRoute.srcToken,
                  destToken: paraswapPriceRouteResponse.data.priceRoute.destToken,
                  userAddress: paraswapHandler.address.toString().toLowerCase(),
                  priceRoute: paraswapPriceRouteResponse.data.priceRoute,
                  srcAmount: paraswapPriceRouteResponse.data.priceRoute.srcAmount,
                  destAmount: paraswapPriceRouteResponse.data.priceRoute.destAmount,
                },
              );

              await delay(1000);
              var fee = paraswapBuildTxResponse.data.protocolFee ? paraswapBuildTxResponse.data.protocolFee : 0;

              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(paraswapBuildTxResponse.data.data);
            }
          }
        }

        exchangeData = {
          sellTokenAddress: _sellTokenAddress,
          buyTokenAddress: _buyTokenAddress,
          swapHandler: paraswapHandler.address,
          portfolioToken: bToken,
          sellAmount: _sellAmount,
          protocolFee: _protocolFee,
          _lpSlippage: "200",
          callData: _callData,
        };

        const balBeforeBuyToken = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap.vault());

        const tx2 = await metaAggregator.metaAggregatorSwap(exchangeData);

        const oldTokenBal = await ERC20.attach(sToken.toString()).balanceOf(await indexSwap.vault());


        const balAfterBuyToken = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap.vault());


        expect(Number(balAfterBuyToken)).to.be.greaterThan(Number(balBeforeBuyToken));
        expect(Number(oldTokenBal)).to.equal(0);
      });

      it("swaps using 0x Protocol", async () => {
        const tokens = await indexSwap1.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[1];
        const bToken = addresses.BSwap_BTC_WBNBLP_Address;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        const tx = await metaAggregator1.redeem(sAmount, "200", sToken);

        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);

        var zeroExparams = {};

        var exchangeData = {};
        var _sellTokenAddress = [];
        var _buyTokenAddress = [];
        var _sellAmount = [];
        var _protocolFee = [];
        var _callData = [];

        if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 1) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator1.address);
          if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _protocolFee.push("0");
            _callData.push("0x");
          } else {
            zeroExparams = {
              sellToken: getUnderlyingTokens1[0].toString(),
              buyToken: getUnderlyingTokens0[0].toString(),
              sellAmount: bal.toString(),
              slippagePercentage: 0.06,
            };
            const zeroExResponse = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(zeroExparams)}`,{ '0x-api-key': process.env.ZEROX_KEY});

            var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _protocolFee.push(fee.toString());
            _callData.push(zeroExResponse.data.data);
          }
        } else if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 2) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator1.address);
          var bal1 = bal.div(2);
          var bal2 = bal.sub(bal1);
          var balAmount = [bal1, bal2];

          for (let i = 0; i < getUnderlyingTokens0.length; i++) {
            if (getUnderlyingTokens1[0] == getUnderlyingTokens0[i]) {
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: getUnderlyingTokens1[0].toString(),
                buyToken: getUnderlyingTokens0[i].toString(),
                sellAmount: balAmount[i].toString(),
                slippagePercentage: 0.06,
              };
              const zeroExResponse = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(zeroExparams)}`,{ '0x-api-key': process.env.ZEROX_KEY});

              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _protocolFee.push(fee.toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 1) {
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            const bal = await ERC20.attach(getUnderlyingTokens1[i]).balanceOf(metaAggregator1.address);
            if (getUnderlyingTokens1[i] == getUnderlyingTokens0[0]) {
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: getUnderlyingTokens1[i].toString(),
                buyToken: getUnderlyingTokens0[0].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
              };
              const zeroExResponse = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(zeroExparams)}`,{ '0x-api-key': process.env.ZEROX_KEY});

              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 2) {
          var common = [];
          var tempUnder0 = [];
          var tempUnder1 = [];
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            if (getUnderlyingTokens0.includes(getUnderlyingTokens1[i])) {
              common.push(getUnderlyingTokens1[i]);
            } else {
              tempUnder1.push(getUnderlyingTokens1[i]);
            }
          }

          for (let i = 0; i < getUnderlyingTokens0.length; i++) {
            if (!common.includes(getUnderlyingTokens0[i])) {
              tempUnder0.push(getUnderlyingTokens0[i]);
            }
          }

          var newUnderlying0 = tempUnder0.concat(common);
          var newUnderlying1 = tempUnder1.concat(common);

          for (let i = 0; i < newUnderlying1.length; i++) {
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator1.address);
            if (newUnderlying1[i] == newUnderlying0[i]) {
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: newUnderlying1[i].toString(),
                buyToken: newUnderlying0[i].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
              };
              const zeroExResponse = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(zeroExparams)}`,{ '0x-api-key': process.env.ZEROX_KEY});
              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        }
        exchangeData = {
          sellTokenAddress: _sellTokenAddress,
          buyTokenAddress: _buyTokenAddress,
          swapHandler: zeroExHandler.address,
          portfolioToken: bToken,
          sellAmount: _sellAmount,
          protocolFee: _protocolFee,
          _lpSlippage: "200",
          callData: _callData,
        };

        const balBefore = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap1.vault());

        const tx2 = await metaAggregator1.metaAggregatorSwap(exchangeData);

        const balAfter = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap1.vault());
        const oldTokenBal = await ERC20.attach(sToken.toString()).balanceOf(await indexSwap1.vault());

        const buyTokenRecordAfter = await indexSwap1.getRecord(bToken);
        const newTokenList = await indexSwap1.getTokens();

        const balAfterSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        expect(Number(balAfter)).to.be.greaterThan(Number(balBefore));
        expect(Number(oldTokenBal)).to.equal(0);
        expect(newTokenList.includes(sToken)).to.be.equal(false);
        expect(newTokenList.includes(bToken)).to.be.equal(true);
        expect(Number(balBeforeSellToken)).to.be.greaterThan(Number(balAfterSellToken));
      });

      it("swaps using 1Inch Protocol", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[1];
        const bToken = tokens[0];
        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);

        const sAmount = await handler1.getTokenBalance(indexSwap3.vault(), sToken);

        const tx = await metaAggregator3.redeem(sAmount, "200", sToken);

        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);

        var exchangeData = {};
        var _sellTokenAddress = [];
        var _buyTokenAddress = [];
        var _sellAmount = [];
        var _protocolFee = [];
        var _callData = [];

        if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 1) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
          if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _protocolFee.push("0");
            _callData.push("0x");
          } else {
            const oneInchParams = {
              fromTokenAddress: getUnderlyingTokens1[0].toString().toLowerCase(),
              toTokenAddress: getUnderlyingTokens0[0].toString().toLowerCase(),
              amount: bal.toBigInt().toString(),
              fromAddress: oneInchHandler.address.toString(),
              slippage: 6,
              disableEstimate: true,
              compatibilityMode: true,
            };

            const oneInchResponse = await axios.get(`https://api.1inch.io/v5.0/56/swap?${qs.stringify(oneInchParams)}`);

            var fee = oneInchResponse.data.protocolFee ? oneInchResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0]);
            _buyTokenAddress.push(getUnderlyingTokens0[0]);
            _sellAmount.push(bal.toString());
            _protocolFee.push(fee.toString());
            _callData.push(oneInchResponse.data.tx.data);
          }
        } else if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 2) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
          var bal1 = bal.div(2);
          var bal2 = bal.sub(bal1);
          var balAmount = [bal1, bal2];

          for (let i = 0; i < getUnderlyingTokens0.length; i++) {
            if (getUnderlyingTokens1[0] == getUnderlyingTokens0[i]) {
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              const oneInchParams = {
                fromTokenAddress: getUnderlyingTokens1[0].toString().toLowerCase(),
                toTokenAddress: getUnderlyingTokens0[i].toString().toLowerCase(),
                amount: balAmount[i].toBigInt().toString(),
                fromAddress: oneInchHandler.address.toString(),
                slippage: 6,
                disableEstimate: true,
                compatibilityMode: true,
              };

              const oneInchResponse = await axios.get(
                `https://api.1inch.io/v5.0/56/swap?${qs.stringify(oneInchParams)}`,
              );

              var fee = oneInchResponse.data.protocolFee ? oneInchResponse.data.protocolFee : 0;
              // var fee = 0;
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _protocolFee.push(fee.toString());
              _callData.push(oneInchResponse.data.tx.data);
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 1) {
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            const bal = await ERC20.attach(getUnderlyingTokens1[i]).balanceOf(metaAggregator3.address);
            if (getUnderlyingTokens1[i] == getUnderlyingTokens0[0]) {
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              const oneInchParams = {
                fromTokenAddress: getUnderlyingTokens1[i].toString().toLowerCase(),
                toTokenAddress: getUnderlyingTokens0[0].toString().toLowerCase(),
                amount: bal.toBigInt().toString(),
                fromAddress: oneInchHandler.address.toString(),
                slippage: 6,
                disableEstimate: true,
                compatibilityMode: true,
              };

              const oneInchResponse = await axios.get(
                `https://api.1inch.io/v5.0/56/swap?${qs.stringify(oneInchParams)}`,
              );

              var fee = oneInchResponse.data.protocolFee ? oneInchResponse.data.protocolFee : 0;
              // var fee = 0;
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(oneInchResponse.data.tx.data);
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 2) {
          var common = [];
          var tempUnder0 = [];
          var tempUnder1 = [];
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            if (getUnderlyingTokens0.includes(getUnderlyingTokens1[i])) {
              common.push(getUnderlyingTokens1[i]);
            } else {
              tempUnder1.push(getUnderlyingTokens1[i]);
            }
          }

          for (let i = 0; i < getUnderlyingTokens0.length; i++) {
            if (!common.includes(getUnderlyingTokens0[i])) {
              tempUnder0.push(getUnderlyingTokens0[i]);
            }
          }

          var newUnderlying0 = tempUnder0.concat(common);
          var newUnderlying1 = tempUnder1.concat(common);

          for (let i = 0; i < newUnderlying1.length; i++) {
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator3.address);
            if (newUnderlying1[i] == newUnderlying0[i]) {
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              const oneInchParams = {
                fromTokenAddress: getUnderlyingTokens1[i].toString().toLowerCase(),
                toTokenAddress: getUnderlyingTokens0[i].toString().toLowerCase(),
                amount: bal.toBigInt().toString(),
                fromAddress: oneInchHandler.address.toString(),
                slippage: 6,
                disableEstimate: true,
                compatibilityMode: true,
              };

              const oneInchResponse = await axios.get(
                `https://api.1inch.io/v5.0/56/swap?${qs.stringify(oneInchParams)}`,
              );

              var fee = oneInchResponse.data.protocolFee ? oneInchResponse.data.protocolFee : 0;
              // var fee = 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(oneInchResponse.data.tx.data);
            }
          }
        }
        exchangeData = {
          sellTokenAddress: _sellTokenAddress,
          buyTokenAddress: _buyTokenAddress,
          swapHandler: oneInchHandler.address,
          portfolioToken: bToken,
          sellAmount: _sellAmount,
          protocolFee: _protocolFee,
          _lpSlippage: "200",
          callData: _callData,
        };
        await delay(2000);

        const balBefore = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap3.vault());

        const tx2 = await metaAggregator3.metaAggregatorSwap(exchangeData);

        const balAfter = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap3.vault());

        const newTokenList = await indexSwap3.getTokens();

        expect(Number(balAfter)).to.be.greaterThan(Number(balBefore));
        expect(newTokenList.includes(bToken)).to.equal(true);
      });

      it("swaps token using ZeroEx Protocol for base",async () => {
        const tokens = await indexSwap4.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        var sToken = tokens[1];
        var bToken = iaddress.wbnbAddress;
        var sAmount = await ERC20.attach(sToken).balanceOf(
          await indexSwap4.vault()
        );        
        var zeroExparams = {};
        var MetaSwapData = {};
        var tokenBalanceBefore = await ERC20.attach(bToken).balanceOf(await indexSwap4.vault());
        zeroExparams = {
          sellToken: sToken.toString(),
          buyToken: bToken.toString(),
          sellAmount: (BigNumber.from(sAmount)).toString(),
          slippagePercentage: 0.06,
        };
        const zeroExResponse = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(zeroExparams)}`,{ '0x-api-key': process.env.ZEROX_KEY});

        var fee = zeroExResponse.data.protocolFee
          ? zeroExResponse.data.protocolFee
          : 0;
        
        MetaSwapData = {
          sellTokenAddress : sToken.toString(),
          buyTokenAddress : bToken.toString(),
          swapHandler : zeroExHandler.address,
          sellAmount : (BigNumber.from(sAmount)).toString(),
          protocolFee : fee.toString(),
          callData : zeroExResponse.data.data
        }
        await metaAggregator4.swapPrimaryToken(MetaSwapData);
        var tokenBalanceAfter = await ERC20.attach(bToken).balanceOf(await indexSwap4.vault());
        var amountAfterSwap = await ERC20.attach(sToken).balanceOf(
          await indexSwap4.vault()
        ); 
        expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        expect(Number(amountAfterSwap)).to.be.equal(0);
      })

      it("swaps token1 to token0 using ZeroEx Protocol for base",async () => {
        var tokens = await indexSwap5.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        
        var sToken = tokens[0];
        var bToken = tokens[1];
        var sAmount = await ERC20.attach(sToken).balanceOf(
          await indexSwap5.vault()
        );        
        var zeroExparams = {};
        var MetaSwapData = {};

        var tokenBalanceBefore = await ERC20.attach(bToken).balanceOf(await indexSwap5.vault());
        zeroExparams = {
          sellToken: sToken.toString(),
          buyToken: bToken.toString(),
          sellAmount: sAmount.toString(),
          slippagePercentage: 0.06,
        };
        const zeroExResponse = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(zeroExparams)}`,{ '0x-api-key': process.env.ZEROX_KEY});
        var fee = zeroExResponse.data.protocolFee
          ? zeroExResponse.data.protocolFee
          : 0;
        
        MetaSwapData = {
          sellTokenAddress : sToken.toString(),
          buyTokenAddress : bToken.toString(),
          swapHandler : zeroExHandler.address,
          sellAmount : sAmount.toString(),
          protocolFee : fee.toString(),
          callData : zeroExResponse.data.data
        }
        await metaAggregator5.swapPrimaryToken(MetaSwapData);
        var tokenBalanceAfter = await ERC20.attach(bToken).balanceOf(await indexSwap5.vault());
        var amountAfterSwap = await ERC20.attach(sToken).balanceOf(
          await indexSwap5.vault()
        ); 
        expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        expect(Number(amountAfterSwap)).to.be.equal(0);
      })

      it("swaps token1 to token0 using ZeroEx Protocol for base",async () => {
        var tokens = await indexSwap5.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        
        var sToken = tokens[0];
        var bToken = iaddress.busdAddress;
        var sAmount = await ERC20.attach(sToken).balanceOf(
          await indexSwap5.vault()
        );        
        var zeroExparams = {};
        var MetaSwapData = {};

        var tokenBalanceBefore = await ERC20.attach(bToken).balanceOf(await indexSwap5.vault());
        zeroExparams = {
          sellToken: sToken.toString(),
          buyToken: bToken.toString(),
          sellAmount: sAmount.toString(),
          slippagePercentage: 0.06,
        };
        const zeroExResponse = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(zeroExparams)}`,{ '0x-api-key': process.env.ZEROX_KEY});
        var fee = zeroExResponse.data.protocolFee
          ? zeroExResponse.data.protocolFee
          : 0;
        
        MetaSwapData = {
          sellTokenAddress : sToken.toString(),
          buyTokenAddress : bToken.toString(),
          swapHandler : zeroExHandler.address,
          sellAmount : sAmount.toString(),
          protocolFee : fee.toString(),
          callData : zeroExResponse.data.data
        }
        await metaAggregator5.swapPrimaryToken(MetaSwapData);
        var tokenBalanceAfter = await ERC20.attach(bToken).balanceOf(await indexSwap5.vault());
        var amountAfterSwap = await ERC20.attach(sToken).balanceOf(
          await indexSwap5.vault()
        ); 
        expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        expect(Number(amountAfterSwap)).to.be.equal(0);
      })
    });
  });
});
