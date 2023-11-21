import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";

import {
  tokenAddresses,
  IAddresses,
  indexSwapLibrary,
  wombatHandler,
  baseHandler,
  sushiLpHandler,
  priceOracle,
  apeSwapLPHandler,
  compoundHandlerv3,
  aaveHandlerv3,
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
  CompoundV3Handler,
  UniswapV2Handler,
  VelvetSafeModule,
  ZeroExHandler,
  OneInchHandler,
  KyberSwapHandler,
  ParaswapHandler,
  BebopHandler,
  OffChainRebalance__factory,
  RebalanceAggregator__factory,
  PriceOracle,
  AssetManagerConfig,
  TokenRegistry,
  ERC20Upgradeable,
  OffChainIndexSwap,
} from "../../typechain";

import { chainIdToAddresses } from "../../scripts/networkVariables";

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
  let swapHandler: UniswapV2Handler;
  let assetManagerConfig: AssetManagerConfig;
  let exchange: Exchange;
  let indexSwap: any;
  let indexSwap1: any;
  let indexSwap2: any;
  let indexSwap3: any;
  let indexSwap4: any;
  let indexSwap5: any;
  let indexSwap6: any;
  let indexSwap7: any;
  let indexSwapContract: IndexSwap;
  let indexFactory: IndexFactory;
  let swapHandler1: UniswapV2Handler;
  let velvetSafeModule: VelvetSafeModule;
  //let lendingHandler: LendingHandler;
  let oneInchHandler: OneInchHandler;
  let paraswapHandler: ParaswapHandler;
  let kyberswapHandler: KyberSwapHandler;
  let rebalanceLibrary: any;
  let rebalancing: any;
  let rebalancing1: any;
  let rebalancing2: any;
  let rebalancing3: any;
  let rebalancing4: any;
  let rebalancing5: any;
  let rebalancing6: any;
  let rebalancing7: any;
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
  let metaAggregator6: any;
  let metaAggregator7: any;
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
  let bebopHandler: BebopHandler;
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  let velvetTreasuryBalance = 0;
  let assetManagerTreasuryBalance = 0;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 42161;
  const addresses = chainIdToAddresses[chainId];

  describe.only("Tests for ExternalSwapHandler contract", () => {
    before(async () => {
      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();

      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, treasury, assetManagerTreasury, addr1, addr2, ...addrs] = accounts;

      iaddress = await tokenAddresses(priceOracle.address, true);

      const ZeroExHandler = await ethers.getContractFactory("ZeroExHandler");
      zeroExHandler = await ZeroExHandler.deploy();
      await zeroExHandler.deployed();

      zeroExHandler.init("0xdef1c0ded9bec7f1a1670819833240f027b25eff", priceOracle.address);
      await zeroExHandler.addOrUpdateProtocolSlippage("500");

      const BebopHandler = await ethers.getContractFactory("BebopHandler");
      bebopHandler = await BebopHandler.deploy();
      await bebopHandler.deployed();

      // bebopHandler = BebopHandler.attach("0x2069b31Cfd7145224Da7f6198C31d2a09e5Cba9b");
      bebopHandler.init("0xBeB09000fa59627dc02Bb55448AC1893EAa501A5", priceOracle.address);
      await bebopHandler.addOrUpdateProtocolSlippage("500");

      const latestBlock = await hre.ethers.provider.getBlock("latest");
      await tokenRegistry.initialize(
        "3000000000000000000",
        "120000000000000000000000",
        treasury.address,
        addresses.WETH,
      );

      await tokenRegistry.setCoolDownPeriod("1");

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      exchange = await Exchange.deploy();
      await exchange.deployed();

      const PancakeSwapHandler = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.SushiSwapRouterAddress, priceOracle.address);

      const provider = ethers.getDefaultProvider();

      const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      rebalanceLibrary = await RebalanceLibrary.deploy();
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

      const PancakeSwapHandler1 = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler1 = await PancakeSwapHandler1.deploy();
      await swapHandler1.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      const KyberSwaphSwapHandler = await ethers.getContractFactory("KyberSwapHandler");
      kyberswapHandler = await KyberSwaphSwapHandler.deploy();
      await kyberswapHandler.deployed();

      kyberswapHandler.init("0x6131B5fae19EA4f9D964eAc0408E4408b66337b5", priceOracle.address);

      const OneInchSwapHandler = await ethers.getContractFactory("OneInchHandler");
      oneInchHandler = await OneInchSwapHandler.deploy();
      await oneInchHandler.deployed();

      oneInchHandler.init("0x1111111254EEB25477B68fb85Ed929f73A960582", priceOracle.address);

      await oneInchHandler.addOrUpdateProtocolSlippage("100");

      await tokenRegistry.addRewardToken([addresses.ARB, addresses.wombat_RewardToken,addresses.compound_RewardToken], baseHandler.address);

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
          priceOracle.address,

          priceOracle.address,

          priceOracle.address
        ],
        [
          addresses.ARB,
          addresses.WBTC,
          addresses.WETH,
          addresses.DAI,
          addresses.ADoge,
          addresses.USDCe,

          addresses.USDT,
          addresses.USDC,
          addresses.MAIN_LP_USDT,
          addresses.MAIN_LP_USDCe,
          addresses.MAIN_LP_DAI,
          addresses.ApeSwap_WBTC_USDT,

          addresses.SushiSwap_WETH_WBTC,
          addresses.SushiSwap_WETH_LINK,
          addresses.SushiSwap_WETH_USDT,
          addresses.SushiSwap_ADoge_WETH,
          addresses.SushiSwap_WETH_ARB,

          addresses.cUSDCv3,

          addresses.aArbWBTC
        ],
        [
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,

          baseHandler.address,
          baseHandler.address,
          wombatHandler.address,
          wombatHandler.address,
          wombatHandler.address,
          apeSwapLPHandler.address,

          sushiLpHandler.address,
          sushiLpHandler.address,
          sushiLpHandler.address,
          sushiLpHandler.address,
          sushiLpHandler.address,

          compoundHandlerv3.address,

          aaveHandlerv3.address
        ],
        [
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.apeSwap_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],

          [addresses.compound_RewardToken],

          [addresses.base_RewardToken]
        ],
        [
          true,
          true,
          true,
          //true,
          true,
          true,
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false
        ],
      );
      registry.wait();

      tokenRegistry.enableExternalSwapHandler(zeroExHandler.address);
      tokenRegistry.enableExternalSwapHandler(oneInchHandler.address);
      tokenRegistry.enableExternalSwapHandler(kyberswapHandler.address);
      tokenRegistry.enableExternalSwapHandler(bebopHandler.address);
      tokenRegistry.enableSwapHandlers([swapHandler.address]);

      tokenRegistry.addNonDerivative(wombatHandler.address);

      let whitelistedTokens = [
        addresses.ARB,
        addresses.WBTC,
        addresses.WETH,
        addresses.DAI,
        addresses.ADoge,
        addresses.USDCe,
        addresses.USDT,
        addresses.USDC,
        addresses.MAIN_LP_USDT,
        addresses.MAIN_LP_USDCe,
        addresses.MAIN_LP_DAI,
        addresses.ApeSwap_WBTC_USDT,
        addresses.SushiSwap_WETH_WBTC,
        addresses.SushiSwap_WETH_LINK,
        addresses.SushiSwap_WETH_USDT,
        addresses.SushiSwap_ADoge_WETH,
        addresses.SushiSwap_WETH_ARB,
        addresses.cUSDCv3,
        addresses.aArbWBTC
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
            _gnosisFallbackLibrary: addresses.gnosisFallbackLibrary,
            _gnosisMultisendLibrary: addresses.gnosisMultisendLibrary,
            _gnosisSafeProxyFactory: addresses.gnosisSafeProxyFactory,
            _priceOracle: priceOracle.address,
            _tokenRegistry: tokenRegistry.address,
          },
        ],
        { kind: "uups" },
      );

      indexFactory = IndexFactory.attach(indexFactoryInstance.address);
      console.log("indexFactory address:", indexFactory.address);
      const indexFactoryCreate = await indexFactory.createIndexCustodial(
        {
          name: "INDEXLY",
          symbol: "IDX",
          maxIndexInvestmentAmount: "120000000000000000000000",
          minIndexInvestmentAmount: "3000000000000000000",
          _managementFee: "200",
          _performanceFee: "2500",
          _entryFee: "0",
          _exitFee: "0",
          _assetManagerTreasury: assetManagerTreasury.address,
          _whitelistedTokens: whitelistedTokens,
          _public: true,
          _transferable: false,
          _transferableToPublic: false,
          _whitelistTokens: true,
        },
        [owner.address],
        1,
      );

      const indexFactoryCreate2 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "120000000000000000000000",
        minIndexInvestmentAmount: "3000000000000000000",
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "0",
        _exitFee: "0",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: false,
        _transferableToPublic: false,
        _whitelistTokens: false,
      });
      const indexFactoryCreate3 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "120000000000000000000000",
        minIndexInvestmentAmount: "3000000000000000000",
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "0",
        _exitFee: "0",
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
        maxIndexInvestmentAmount: "120000000000000000000000",
        minIndexInvestmentAmount: "3000000000000000000",
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "0",
        _exitFee: "0",
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
        maxIndexInvestmentAmount: "120000000000000000000000",
        minIndexInvestmentAmount: "3000000000000000000",
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "0",
        _exitFee: "0",
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
        maxIndexInvestmentAmount: "120000000000000000000000",
        minIndexInvestmentAmount: "3000000000000000000",
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "0",
        _exitFee: "0",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: false,
        _transferableToPublic: false,
        _whitelistTokens: true,
      });

      const indexFactoryCreate7 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "120000000000000000000000",
        minIndexInvestmentAmount: "3000000000000000000",
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "0",
        _exitFee: "0",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: false,
        _transferableToPublic: false,
        _whitelistTokens: true,
      });

      const indexFactoryCreate8 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "120000000000000000000000",
        minIndexInvestmentAmount: "3000000000000000000",
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "0",
        _exitFee: "0",
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

      const indexAddress6 = await indexFactory.getIndexList(6);
      const indexInfo6 = await indexFactory.IndexSwapInfolList(6);

      const indexAddress7 = await indexFactory.getIndexList(7);
      const indexInfo7 = await indexFactory.IndexSwapInfolList(7);

      indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

      indexSwap1 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress1);

      indexSwap2 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress2);

      indexSwap3 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress3);

      indexSwap4 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress4);

      indexSwap5 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress5);
      indexSwap6 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress6);
      indexSwap7 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress7);

      console.log("indexSwapAddress1:", indexAddress1);

      rebalancing = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo.rebalancing);

      rebalancing1 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo1.rebalancing);

      rebalancing2 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo2.rebalancing);

      rebalancing3 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo3.rebalancing);

      rebalancing4 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo4.rebalancing);

      rebalancing5 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo5.rebalancing);

      rebalancing6 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo6.rebalancing);

      rebalancing7 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo7.rebalancing);

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
      metaAggregator6 = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo6.metaAggregator);
      metaAggregator7 = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo7.metaAggregator);

      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("ExternalSwapHandler Contract", function () {
      it("Initialize 1st IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.MAIN_LP_USDT, addresses.MAIN_LP_USDCe], [5000, 5000]);
      });

      it("Initialize 2nd IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.USDCe, addresses.WBTC], [5000, 5000]);
      });

      it("Initialize 3rd IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(2);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.MAIN_LP_USDCe, addresses.cUSDCv3], [5000, 5000]);
      });

      it("Initialize 4th IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(3);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.WETH, addresses.USDCe], [5000, 5000]);
      });

      it("Initialize 5th IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(4);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.WETH, addresses.ARB], [5000, 5000]);
      });

      it("Initialize 6th IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(5);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.WETH, addresses.WBTC], [5000, 5000]);
      });

      it("Initialize 7th IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(6);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.WETH, addresses.WBTC], [5000, 5000]);
      });

      it("Initialize 8th IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(7);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.WETH, addresses.WBTC], [5000, 5000]);
      });

      it("Invest 0.1ETH into Top10 fund", async () => {
        const IaToken = await ethers.getContractAt("IaToken", addresses.WETH);

        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["700", "700"],
            _lpSlippage: ["700", "700"],
            _to: owner.address,
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.01ETH into 5th fund", async () => {
        const indexSupplyBefore = await indexSwap4.totalSupply();
        await indexSwap4.investInFund(
          {
            _slippage: ["700", "700"],
            _lpSlippage: ["700", "700"],
            _to: owner.address,
            _tokenAmount: "10000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "10000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap4.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.1ETH into 6th fund", async () => {
        const indexSupplyBefore = await indexSwap5.totalSupply();
        await indexSwap5.investInFund(
          {
            _slippage: ["700", "700"],
            _lpSlippage: ["700", "700"],
            _to: owner.address,
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap5.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.2 ETH into index fund", async () => {
        const indexSupplyBefore = await indexSwap2.totalSupply();
        await indexSwap2.investInFund(
          {
            _slippage: ["700", "700"],
            _lpSlippage: ["700", "700"],
            _to: owner.address,
            _tokenAmount: "200000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "200000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap2.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.2ETH into index fund", async () => {
        const IaToken = await ethers.getContractAt("IaToken", addresses.WETH);

        const indexSupplyBefore = await indexSwap3.totalSupply();

        await indexSwap3.investInFund(
          {
            _slippage: ["700", "700"],
            _lpSlippage: ["700", "700"],
            _to: owner.address,
            _tokenAmount: "200000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "200000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap3.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 1ETH into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["700", "700"],
            _lpSlippage: ["700", "700"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));

        const IaToken = await ethers.getContractAt("IaToken", addresses.cETH);
      });

      it("Invest 0.1ETH into Top10 2nd Index fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        await indexSwap1.investInFund(
          {
            _slippage: ["600", "600"],
            _lpSlippage: ["700", "700"],
            _to: owner.address,
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.1ETH into 7th Index fund", async () => {
        const indexSupplyBefore = await indexSwap6.totalSupply();
        await indexSwap6.investInFund(
          {
            _slippage: ["600", "600"],
            _lpSlippage: ["700", "700"],
            _to: owner.address,
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap6.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.1ETH into 8th index fund", async () => {
        const IaToken = await ethers.getContractAt("IaToken", addresses.WETH);

        const indexSupplyBefore = await indexSwap7.totalSupply();
        await indexSwap7.investInFund(
          {
            _slippage: ["600", "600"],
            _lpSlippage: ["600", "600"],
            _to: owner.address,
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap7.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("swaps using Kyber Protocol", async () => {
        const tokens = await indexSwap2.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const bToken = addresses.WETH;
        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);
        const vaultAddress = await indexSwap2.vault();

        const sAmount = await handler1.getTokenBalance(vaultAddress, sToken);
        const balBefore = await ERC20.attach(bToken).balanceOf(vaultAddress);
        const tx = await metaAggregator2.redeem(sAmount, "200", sToken);

        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);

        var exchangeData = {};
        var _sellTokenAddress = [];
        var _buyTokenAddress = [];
        var _sellAmount = [];
        var _callData = [];

        if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 1) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator2.address);
          if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _callData.push("0x");
          } else {
            const params = {
              tokenIn: getUnderlyingTokens1[0].toString(),
              tokenOut: getUnderlyingTokens0[0].toString(),
              amountIn: bal.toString(),
            };

            const getResponse = await axios.get(addresses.kyberSwapUrl + `${qs.stringify(params)}`, {
              headers: {
                "x-client-id": "velvet_capital",
              },
            });

            const postResponse = await axios.post(addresses.kyberSwapPostUrl, {
              routeSummary: getResponse.data.data.routeSummary,
              sender: kyberswapHandler.address,
              recipient: kyberswapHandler.address,
              slippageTolerance: 300,
            });

            _sellTokenAddress.push(getUnderlyingTokens1[0]);
            _buyTokenAddress.push(getUnderlyingTokens0[0]);
            _sellAmount.push(bal.toString());
            _callData.push(postResponse.data.data.data.toString());
          }
        } else if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 2) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator2.address);
          var bal1 = bal.div(2);
          var bal2 = bal.sub(bal1);
          var balAmount = [bal1, bal2];

          for (let i = 0; i < getUnderlyingTokens0.length; i++) {
            if (getUnderlyingTokens1[0] == getUnderlyingTokens0[i]) {
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _callData.push("0x");
            } else {
              const params = {
                tokenIn: getUnderlyingTokens1[0].toString(),
                tokenOut: getUnderlyingTokens0[i].toString(),
                amountIn: balAmount[i].toString(),
              };

              const getResponse = await axios.get(addresses.kyberSwapUrl + `${qs.stringify(params)}`, {
                headers: {
                  "x-client-id": "velvet_capital",
                },
              });

              const postResponse = await axios.post(addresses.kyberSwapPostUrl, {
                routeSummary: getResponse.data.data.routeSummary,
                sender: kyberswapHandler.address,
                recipient: kyberswapHandler.address,
                slippageTolerance: 300,
              });

              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _callData.push(postResponse.data.data.data.toString());
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 1) {
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            const bal = await ERC20.attach(getUnderlyingTokens1[i]).balanceOf(metaAggregator2.address);
            if (getUnderlyingTokens1[i] == getUnderlyingTokens0[0]) {
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _callData.push("0x");
            } else {
              const params = {
                tokenIn: getUnderlyingTokens1[i].toString(),
                tokenOut: getUnderlyingTokens0[0].toString(),
                amountIn: bal.toString(),
              };

              const getResponse = await axios.get(addresses.kyberSwapUrl + `${qs.stringify(params)}`, {
                headers: {
                  "x-client-id": "velvet_capital",
                },
              });

              const postResponse = await axios.post(addresses.kyberSwapPostUrl, {
                routeSummary: getResponse.data.data.routeSummary,
                sender: kyberswapHandler.address,
                recipient: kyberswapHandler.address,
                slippageTolerance: 300,
              });

              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _callData.push(postResponse.data.data.data.toString());
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
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator2.address);
            if (newUnderlying1[i] == newUnderlying0[i]) {
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _callData.push("0x");
            } else {
              const params = {
                tokenIn: getUnderlyingTokens1[i].toString(),
                tokenOut: getUnderlyingTokens0[i].toString(),
                amountIn: bal.toString(),
              };

              const getResponse = await axios.get(addresses.kyberSwapUrl + `${qs.stringify(params)}`, {
                headers: {
                  "x-client-id": "velvet_capital",
                },
              });

              const postResponse = await axios.post(addresses.kyberSwapPostUrl, {
                routeSummary: getResponse.data.data.routeSummary,
                sender: kyberswapHandler.address,
                recipient: kyberswapHandler.address,
                slippageTolerance: 300,
              });

              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _callData.push(postResponse.data.data.data.toString());
            }
          }
        }
        exchangeData = {
          sellTokenAddress: _sellTokenAddress,
          buyTokenAddress: _buyTokenAddress,
          swapHandler: kyberswapHandler.address,
          portfolioToken: bToken,
          sellAmount: _sellAmount,
          _lpSlippage: "200",
          callData: _callData,
        };

        const tx2 = await metaAggregator2.metaAggregatorSwap(exchangeData);

        const balAfter = await ERC20.attach(bToken).balanceOf(vaultAddress);

        const newTokenList = await indexSwap2.getTokens();
        expect(Number(balAfter)).to.be.greaterThan(Number(balBefore));
        expect(newTokenList.includes(bToken)).to.equal(true);
      });

      it("should revert back if swapHandler is not enabled", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const aToken = addresses.ARB;
        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);

        const sAmount = await handler1.getTokenBalance(indexSwap3.vault(), sToken);

        const tx = await metaAggregator3.redeem(sAmount, "200", sToken);

        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(aToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(aToken);

        var exchangeData = {};
        var _sellTokenAddress: any = [];
        var _buyTokenAddress: any = [];
        var _sellAmount: any = [];
        var _callData: any = [];
        exchangeData = {
          sellTokenAddress: _sellTokenAddress,
          buyTokenAddress: _buyTokenAddress,
          swapHandler: addresses.WETH,
          portfolioToken: aToken,
          sellAmount: _sellAmount,
          _lpSlippage: "200",
          callData: _callData,
        };

        await expect(metaAggregator3.metaAggregatorSwap(exchangeData)).to.be.revertedWithCustomError(
          metaAggregator3,
          "SwapHandlerNotEnabled",
        );
      });

      it("swaps using 1Inch Protocol", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const bToken = addresses.WETH;
        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);

        const sAmount = await handler1.getTokenBalance(indexSwap3.vault(), sToken);

        // const tx = await metaAggregator3.redeem(sAmount, "200", sToken);

        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);

        var exchangeData = {};
        var _sellTokenAddress = [];
        var _buyTokenAddress = [];
        var _sellAmount = [];
        var _callData = [];

        if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 1) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
          if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
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

            const oneInchResponse = await axios.get(addresses.oneInchUrl + `${qs.stringify(oneInchParams)}`);

            var fee = oneInchResponse.data.protocolFee ? oneInchResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0]);
            _buyTokenAddress.push(getUnderlyingTokens0[0]);
            _sellAmount.push(bal.toString());
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

              const oneInchResponse = await axios.get(addresses.oneInchUrl + `${qs.stringify(oneInchParams)}`);

              var fee = oneInchResponse.data.protocolFee ? oneInchResponse.data.protocolFee : 0;
              // var fee = 0;
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
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
                referrerAddress: addr1.address,
                fee: 3,
              };

              const oneInchResponse = await axios.get(addresses.oneInchUrl + `${qs.stringify(oneInchParams)}`);

              var fee = oneInchResponse.data.protocolFee ? oneInchResponse.data.protocolFee : 0;
              // var fee = 0;
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
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
                referrerAddress: addr1.address,
                fee: 3,
              };

              const oneInchResponse = await axios.get(addresses.oneInchUrl + `${qs.stringify(oneInchParams)}`);

              var fee = oneInchResponse.data.protocolFee ? oneInchResponse.data.protocolFee : 0;
              // var fee = 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
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
          _lpSlippage: "200",
          callData: _callData,
        };

        const balBefore = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap3.vault());

        const tx2 = await metaAggregator3.metaAggregatorSwap(exchangeData);

        const balAfter = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap3.vault());

        const newTokenList = await indexSwap3.getTokens();

        expect(Number(balAfter)).to.be.greaterThan(Number(balBefore));
        expect(newTokenList.includes(bToken)).to.equal(true);
      });

      it("revert redeem", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.WETH;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        const balBeforeSToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());
        const balBeforeBToken = await ERC20.attach(bToken).balanceOf(await indexSwap3.vault());
        const tx = await metaAggregator3.redeem(sAmount, "800", sToken);

        await metaAggregator3.revertRedeem("800");

        const balAfterSToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());
        const balAfterBToken = await ERC20.attach(bToken).balanceOf(await indexSwap3.vault());
        expect(Number(balBeforeSToken)).to.be.greaterThanOrEqual(Number(balAfterSToken));
        expect(Number(balBeforeBToken)).to.be.equals(Number(balAfterBToken));
      });

      it("non assetManager should not revert if 15 minutes is not passed", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());
        const tx = await metaAggregator3.redeem(sAmount, "800", sToken);

        await expect(metaAggregator3.connect(addr2).revertSellByUser("800")).to.be.revertedWithCustomError(
          metaAggregator3,
          "FifteenMinutesNotExcedeed",
        );
        await metaAggregator3.revertRedeem("800");
      });

      it("non assetManager should revert if 15 minutes is passed", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.USDT;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        const balBeforeSToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());
        const balBeforeBToken = await ERC20.attach(bToken).balanceOf(await indexSwap3.vault());
        const tx = await metaAggregator3.redeem(sAmount, "800", sToken);

        await ethers.provider.send("evm_increaseTime", [1900]);
        await metaAggregator3.connect(addr2).revertSellByUser("800");

        const balAfterSToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());
        const balAfterBToken = await ERC20.attach(bToken).balanceOf(await indexSwap3.vault());
        expect(Number(balBeforeSToken)).to.be.greaterThanOrEqual(Number(balAfterSToken));
        expect(Number(balBeforeBToken)).to.be.equals(Number(balAfterBToken));
      });

      it("redeems token for 0x", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());
        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());
        const tx = await metaAggregator3.redeem(sAmount, "800", sToken);
      });

      it("swaps reverts if token address is wrong", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.ARB;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        // const tx = await metaAggregator3.redeem(sAmount, "800", sToken);

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
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
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
            const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });

            var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _protocolFee.push(fee.toString());
            _callData.push(zeroExResponse.data.data);
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
              if (i == 1) {
                zeroExparams = {
                  sellToken: getUnderlyingTokens1[0].toString(),
                  buyToken: getUnderlyingTokens0[i].toString(),
                  sellAmount: BigNumber.from(balAmount[i]).sub("1000000000").toString(),
                  slippagePercentage: 0.06,
                  feeRecipient: addr1.address,
                  buyTokenPercentageFee: 0,
                };
                const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });

                var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
                _sellTokenAddress.push(getUnderlyingTokens1[0]);
                _buyTokenAddress.push(getUnderlyingTokens0[i]);
                _sellAmount.push(balAmount[i].toString());
                _protocolFee.push(fee.toString());
                _callData.push(zeroExResponse.data.data);
              } else {
                zeroExparams = {
                  sellToken: getUnderlyingTokens1[0].toString(),
                  buyToken: getUnderlyingTokens0[i].toString(),
                  sellAmount: balAmount[i].toString(),
                  slippagePercentage: 0.06,
                  feeRecipient: addr1.address,
                  buyTokenPercentageFee: 0,
                };
                const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });

                var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
                _sellTokenAddress.push(getUnderlyingTokens1[0]);
                _buyTokenAddress.push(getUnderlyingTokens0[i]);
                _sellAmount.push(balAmount[i].toString());
                _protocolFee.push(fee.toString());
                _callData.push(zeroExResponse.data.data);
              }
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
              zeroExparams = {
                sellToken: getUnderlyingTokens1[i].toString(),
                buyToken: getUnderlyingTokens0[0].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

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
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator3.address);
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
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        }
        _sellTokenAddress[0] = addresses.WBTC;

        // _sellAmount[1] = BigNumber.from(_sellAmount[1]).sub("1000000000").toString();
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

        await expect(metaAggregator3.metaAggregatorSwap(exchangeData)).to.be.reverted;
      });

      it("swaps reverts if sellAmount is wrong", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.SushiSwap_WETH_WBTC;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        // const tx = await metaAggregator3.redeem(sAmount, "800", sToken);

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
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
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
            const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });

            var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _protocolFee.push(fee.toString());
            _callData.push(zeroExResponse.data.data);
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
              if (i == 1) {
                zeroExparams = {
                  sellToken: getUnderlyingTokens1[0].toString(),
                  buyToken: getUnderlyingTokens0[i].toString(),
                  sellAmount: BigNumber.from(balAmount[i]).sub("1000000000").toString(),
                  slippagePercentage: 0.06,
                  feeRecipient: addr1.address,
                  buyTokenPercentageFee: 0,
                };
                const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });

                var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
                _sellTokenAddress.push(getUnderlyingTokens1[0]);
                _buyTokenAddress.push(getUnderlyingTokens0[i]);
                _sellAmount.push(balAmount[i].toString());
                _protocolFee.push(fee.toString());
                _callData.push(zeroExResponse.data.data);
              } else {
                zeroExparams = {
                  sellToken: getUnderlyingTokens1[0].toString(),
                  buyToken: getUnderlyingTokens0[i].toString(),
                  sellAmount: balAmount[i].toString(),
                  slippagePercentage: 0.06,
                  feeRecipient: addr1.address,
                  buyTokenPercentageFee: 0,
                };
                const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });

                var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
                _sellTokenAddress.push(getUnderlyingTokens1[0]);
                _buyTokenAddress.push(getUnderlyingTokens0[i]);
                _sellAmount.push(balAmount[i].toString());
                _protocolFee.push(fee.toString());
                _callData.push(zeroExResponse.data.data);
              }
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
              zeroExparams = {
                sellToken: getUnderlyingTokens1[i].toString(),
                buyToken: getUnderlyingTokens0[0].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

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
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator3.address);
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
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        }
        // _sellTokenAddress[1] = addresses.vBTC_Address;
        console.log(_sellAmount[1]);
        _sellAmount[0] = BigNumber.from(_sellAmount[0]).sub("1000000000").toString();
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

        await expect(metaAggregator3.metaAggregatorSwap(exchangeData)).to.be.revertedWithCustomError(
          metaAggregator3,
          "InvalidSellAmount",
        );
      });

      it("swaps reverts if sellAmount is wrong in calldata", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.SushiSwap_WETH_WBTC;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        // const tx = await metaAggregator3.redeem(sAmount, "800", sToken);

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
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
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
              sellAmount: bal.div(2).toString(),
              slippagePercentage: 0.06,
            };
            const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });

            var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _protocolFee.push(fee.toString());
            _callData.push(zeroExResponse.data.data);
          }
        } else if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 2) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
          var bal1 = bal.div(2);
          var bal2 = bal.sub(bal1);
          var balAmount = [bal1, bal2];
          for (let i = 0; i < getUnderlyingTokens0.length; i++) {
            if (getUnderlyingTokens1[0] == getUnderlyingTokens0[i]) {
              console.log(balAmount[i].toString());
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              if (i == 1) {
                zeroExparams = {
                  sellToken: getUnderlyingTokens1[0].toString(),
                  buyToken: getUnderlyingTokens0[i].toString(),
                  sellAmount: balAmount[i].div(2).toString(),
                  slippagePercentage: 0.06,
                  feeRecipient: addr1.address,
                  buyTokenPercentageFee: 0,
                };
                const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });

                var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
                _sellTokenAddress.push(getUnderlyingTokens1[0]);
                _buyTokenAddress.push(getUnderlyingTokens0[i]);
                _sellAmount.push(balAmount[i].toString());
                _protocolFee.push(fee.toString());
                _callData.push(zeroExResponse.data.data);
              } else {
                zeroExparams = {
                  sellToken: getUnderlyingTokens1[0].toString(),
                  buyToken: getUnderlyingTokens0[i].toString(),
                  sellAmount: balAmount[i].div(2).toString(),
                  slippagePercentage: 0.06,
                  feeRecipient: addr1.address,
                  buyTokenPercentageFee: 0,
                };
                const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });

                var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
                _sellTokenAddress.push(getUnderlyingTokens1[0]);
                _buyTokenAddress.push(getUnderlyingTokens0[i]);
                _sellAmount.push(balAmount[i].toString());
                _protocolFee.push(fee.toString());
                _callData.push(zeroExResponse.data.data);
              }
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 1) {
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            const bal = await ERC20.attach(getUnderlyingTokens1[i]).balanceOf(metaAggregator3.address);
            if (getUnderlyingTokens1[i] == getUnderlyingTokens0[0]) {
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.div(2).toString());
              _protocolFee.push("0");
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: getUnderlyingTokens1[i].toString(),
                buyToken: getUnderlyingTokens0[0].toString(),
                sellAmount: bal.div(2).toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

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
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator3.address);
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
                sellAmount: bal.div(2).toString(),
                slippagePercentage: 0.06,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        }
        // _sellTokenAddress[1] = addresses.WBTC;
        // _sellAmount[1] = BigNumber.from(_sellAmount[1]).sub("1000000000").toString();
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

        await expect(metaAggregator3.metaAggregatorSwap(exchangeData)).to.be.revertedWithCustomError(
          zeroExHandler,
          "InvalidAmount",
        );
      });

      it("swaps reverts if sellAddress is wrong in calldata", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.SushiSwap_WETH_WBTC;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        // const tx = await metaAggregator3.redeem(sAmount, "800", sToken);

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
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
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
            const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });

            var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _protocolFee.push(fee.toString());
            _callData.push(zeroExResponse.data.data);
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
              if (i == 1) {
                zeroExparams = {
                  sellToken: addresses.aArbWBTC,
                  buyToken: addresses.USDC,
                  sellAmount: balAmount[i].toString(),
                  slippagePercentage: 0.06,
                  feeRecipient: addr1.address,
                  buyTokenPercentageFee: 0,
                };

                const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });

                var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
                _sellTokenAddress.push(getUnderlyingTokens1[0]);
                _buyTokenAddress.push(getUnderlyingTokens0[i]);
                _sellAmount.push(balAmount[i].toString());
                _protocolFee.push(fee.toString());
                _callData.push(zeroExResponse.data.data);
              } else {
                zeroExparams = {
                  sellToken: addresses.aArbWETH,
                  buyToken: getUnderlyingTokens0[i].toString(),
                  sellAmount: balAmount[i].toString(),
                  slippagePercentage: 0.06,
                  feeRecipient: addr1.address,
                  buyTokenPercentageFee: 0,
                };
                const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });

                var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
                _sellTokenAddress.push(getUnderlyingTokens1[0]);
                _buyTokenAddress.push(getUnderlyingTokens0[i]);
                _sellAmount.push(balAmount[i].toString());
                _protocolFee.push(fee.toString());
                _callData.push(zeroExResponse.data.data);
              }
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
              zeroExparams = {
                sellToken: getUnderlyingTokens1[i].toString(),
                buyToken: getUnderlyingTokens0[0].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

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
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator3.address);
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
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _protocolFee.push(fee.toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        }
        // _sellTokenAddress[1] = addresses.vBTC_Address;
        // _sellAmount[1] = BigNumber.from(_sellAmount[1]).sub("1000000000").toString();
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

        await expect(metaAggregator3.metaAggregatorSwap(exchangeData)).to.be.revertedWithCustomError(
          zeroExHandler,
          "SwapFailed",
        );
      });

      it("swaps using 0x Protocol", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.SushiSwap_WETH_ARB;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        // const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        // const tx = await metaAggregator3.redeem(sAmount, "800", sToken);

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
        var _callData = [];

        if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 1) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
          if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _callData.push("0x");
          } else {
            zeroExparams = {
              sellToken: getUnderlyingTokens1[0].toString(),
              buyToken: getUnderlyingTokens0[0].toString(),
              sellAmount: bal.toString(),
              slippagePercentage: 0.06,
            };
            const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });

            var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _callData.push(zeroExResponse.data.data);
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
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: getUnderlyingTokens1[0].toString(),
                buyToken: getUnderlyingTokens0[i].toString(),
                sellAmount: balAmount[i].toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 1) {
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            const bal = await ERC20.attach(getUnderlyingTokens1[i]).balanceOf(metaAggregator3.address);
            if (getUnderlyingTokens1[i] == getUnderlyingTokens0[0]) {
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: getUnderlyingTokens1[i].toString(),
                buyToken: getUnderlyingTokens0[0].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
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
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator3.address);
            if (newUnderlying1[i] == newUnderlying0[i]) {
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: newUnderlying1[i].toString(),
                buyToken: newUnderlying0[i].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
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
          _lpSlippage: "200",
          callData: _callData,
        };

        const balBefore = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap3.vault());

        const tx2 = await metaAggregator3.metaAggregatorSwap(exchangeData);

        const balAfter = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap3.vault());
        const oldTokenBal = await ERC20.attach(sToken.toString()).balanceOf(await indexSwap3.vault());

        const buyTokenRecordAfter = await indexSwap3.getRecord(bToken);
        const newTokenList = await indexSwap3.getTokens();

        const balAfterSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        expect(Number(balAfter)).to.be.greaterThan(Number(balBefore));
        expect(Number(oldTokenBal)).to.equal(0);
        expect(newTokenList.includes(sToken)).to.be.equal(false);
        expect(newTokenList.includes(bToken)).to.be.equal(true);
        // expect(Number(balBeforeSellToken)).to.be.greaterThan(Number(balAfterSellToken));
      });

      it("should revert back if the calldata includes fee and the overall slippage is more than 1% 0xHandler", async () => {
        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.WETH;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        const tx = await metaAggregator3.redeem(sAmount, "800", sToken);

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
        var _callData = [];

        if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 1) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
          if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _callData.push("0x");
          } else {
            zeroExparams = {
              sellToken: getUnderlyingTokens1[0].toString(),
              buyToken: getUnderlyingTokens0[0].toString(),
              sellAmount: bal.toString(),
              slippagePercentage: 0.06,
              feeRecipient: addr1.address,
              buyTokenPercentageFee: 0.5,
            };
            const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });

            var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _callData.push(zeroExResponse.data.data);
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
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: getUnderlyingTokens1[0].toString(),
                buyToken: getUnderlyingTokens0[i].toString(),
                sellAmount: balAmount[i].toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0.5,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 1) {
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            const bal = await ERC20.attach(getUnderlyingTokens1[i]).balanceOf(metaAggregator3.address);
            if (getUnderlyingTokens1[i] == getUnderlyingTokens0[0]) {
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: getUnderlyingTokens1[i].toString(),
                buyToken: getUnderlyingTokens0[0].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0.5,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
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
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator3.address);
            if (newUnderlying1[i] == newUnderlying0[i]) {
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: newUnderlying1[i].toString(),
                buyToken: newUnderlying0[i].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0.5,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
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
          _lpSlippage: "200",
          callData: _callData,
        };

        const balBefore = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap3.vault());

        await expect(metaAggregator3.metaAggregatorSwap(exchangeData)).to.be.reverted;
      });

      it("update external handler slippage should fail if value is greater than MAX_SLIPPAGE", async () => {
        await expect(zeroExHandler.addOrUpdateProtocolSlippage("2000")).to.be.revertedWithCustomError(
          zeroExHandler,
          "IncorrectSlippageRange",
        );
      });

      it("should update external handler slippage ", async () => {
        await zeroExHandler.addOrUpdateProtocolSlippage("600");
      });

      it("should set max slippage as 0 and disabling slippage checks", async () => {
        await zeroExHandler.addOrUpdateProtocolSlippage("0");

        const tokens = await indexSwap3.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.SushiSwap_WETH_ARB;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

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
        var _callData = [];

        if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 1) {
          const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator3.address);
          if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _callData.push("0x");
          } else {
            zeroExparams = {
              sellToken: getUnderlyingTokens1[0].toString(),
              buyToken: getUnderlyingTokens0[0].toString(),
              sellAmount: bal.toString(),
              slippagePercentage: 0.06,
              feeRecipient: addr1.address,
              buyTokenPercentageFee: 0.5,
            };
            const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });

            var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

            _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
            _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
            _sellAmount.push(bal.toString());
            _callData.push(zeroExResponse.data.data);
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
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: getUnderlyingTokens1[0].toString(),
                buyToken: getUnderlyingTokens0[i].toString(),
                sellAmount: balAmount[i].toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0.5,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(getUnderlyingTokens1[0]);
              _buyTokenAddress.push(getUnderlyingTokens0[i]);
              _sellAmount.push(balAmount[i].toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
        } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 1) {
          for (let i = 0; i < getUnderlyingTokens1.length; i++) {
            const bal = await ERC20.attach(getUnderlyingTokens1[i]).balanceOf(metaAggregator3.address);
            if (getUnderlyingTokens1[i] == getUnderlyingTokens0[0]) {
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: getUnderlyingTokens1[i].toString(),
                buyToken: getUnderlyingTokens0[0].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0.5,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });

              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(getUnderlyingTokens1[i]);
              _buyTokenAddress.push(getUnderlyingTokens0[0]);
              _sellAmount.push(bal.toString());
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
            const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator3.address);
            if (newUnderlying1[i] == newUnderlying0[i]) {
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: newUnderlying1[i].toString(),
                buyToken: newUnderlying0[i].toString(),
                sellAmount: bal.toString(),
                slippagePercentage: 0.06,
                feeRecipient: addr1.address,
                buyTokenPercentageFee: 0.5,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(newUnderlying1[i]);
              _buyTokenAddress.push(newUnderlying0[i]);
              _sellAmount.push(bal.toString());
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
          _lpSlippage: "200",
          callData: _callData,
        };

        const balBefore = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap3.vault());

        const tx2 = await metaAggregator3.metaAggregatorSwap(exchangeData);

        const balAfter = await ERC20.attach(bToken.toString()).balanceOf(await indexSwap3.vault());
        const oldTokenBal = await ERC20.attach(sToken.toString()).balanceOf(await indexSwap3.vault());

        const buyTokenRecordAfter = await indexSwap3.getRecord(bToken);
        const newTokenList = await indexSwap3.getTokens();

        const balAfterSellToken = await ERC20.attach(sToken).balanceOf(await indexSwap3.vault());

        expect(Number(balAfter)).to.be.greaterThan(Number(balBefore));
        expect(Number(oldTokenBal)).to.equal(0);
        expect(newTokenList.includes(sToken)).to.be.equal(false);
        expect(newTokenList.includes(bToken)).to.be.equal(true);
      });

      it("Swaps directly to protocol token DAI and USDCe", async () => {
        const tokens = await indexSwap.getTokens();
        console.log(tokens);
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = [tokens[0], tokens[1]];

        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[0]);
        const handlerAddress1 = tokenInfo1[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);

        const tokenInfo2: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[1]);
        const handlerAddress2 = tokenInfo2[2];
        const handler2 = await ethers.getContractAt("IHandler", handlerAddress2);

        const bToken = [addresses.USDT, addresses.USDCe];
        const sAmount1 = await handler1.getTokenBalance(await indexSwap.vault(), sToken[0]);
        const sAmount2 = await handler2.getTokenBalance(await indexSwap.vault(), sToken[1]);
        const oldToken = tokens.map((el: any) => {
          return el.toLowerCase();
        });

        const balBeforeSellToken = await ERC20.attach(sToken[0]).balanceOf(indexSwap.vault());
        const balBeforeBuyToken1 = await ERC20.attach(bToken[0]).balanceOf(indexSwap.vault());
        const balBeforeBuyToken2 = await ERC20.attach(bToken[1]).balanceOf(indexSwap.vault());

        const tx = await metaAggregator.directSwap(sToken, bToken, [sAmount1, sAmount2], ["200", "200"]);

        const balAfterSellToken1 = await ERC20.attach(sToken[0]).balanceOf(indexSwap.vault());
        const balAfterBuyToken1 = await ERC20.attach(bToken[0]).balanceOf(indexSwap.vault());
        const balAfterSellToken2 = await ERC20.attach(sToken[0]).balanceOf(indexSwap.vault());
        const balAfterBuyToken2 = await ERC20.attach(bToken[0]).balanceOf(indexSwap.vault());

        const newTokens = await indexSwap.getTokens();
        const newToken = newTokens.map((el: any) => {
          return el.toLowerCase();
        });
        expect(Number(balAfterSellToken1)).to.be.equal(0);
        expect(Number(balAfterBuyToken1)).to.be.greaterThan(Number(balBeforeBuyToken1));
        expect(Number(balAfterSellToken2)).to.be.equal(0);
        expect(Number(balAfterBuyToken2)).to.be.greaterThan(Number(balBeforeBuyToken2));
        expect(newToken.includes(bToken[0].toLowerCase())).to.be.equal(true);
        expect(newToken.includes(sToken[0].toLowerCase())).to.be.equal(false);
        expect(newToken.includes(bToken[1].toLowerCase())).to.be.equal(true);
        expect(newToken.includes(sToken[1].toLowerCase())).to.be.equal(false);
      });

      it("Swaps directly to protocol token ERC20", async () => {
        const tokens = await indexSwap1.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const bToken = addresses.MAIN_LP_USDCe;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        const balBeforeSellToken = await ERC20.attach(sToken).balanceOf(indexSwap1.vault());
        const balBeforeBuyToken = await ERC20.attach(bToken).balanceOf(indexSwap1.vault());

        const tx = await metaAggregator1.directSwap([sToken], [bToken], [sAmount.toString()], ["200"]);

        const balAfterSellToken = await ERC20.attach(sToken).balanceOf(indexSwap1.vault());
        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);
        const balAfterBuyToken = await handler0.getTokenBalance(await indexSwap1.vault(), bToken);
        const newTokens = await indexSwap1.getTokens();
        const newToken = newTokens.map((el: any) => {
          return el.toLowerCase();
        });
        expect(Number(balAfterSellToken)).to.be.equal(0);
        expect(Number(balAfterBuyToken)).to.be.greaterThan(Number(balBeforeBuyToken));
        expect(newToken.includes(bToken.toLowerCase())).to.be.equal(true);
        expect(newToken.includes(sToken.toLowerCase())).to.be.equal(false);
      });

      it("Invest 0.1ETH into Top10 fund", async () => {
        const IaToken = await ethers.getContractAt("IaToken", addresses.cETH);

        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["600", "600"],
            _lpSlippage: ["600", "600"],
            _to: owner.address,
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      // it("swaps using bebop protocol", async () => {
      //   const tokens = await indexSwap5.getTokens();
      //   const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
      //   const sToken = tokens[0];
      //   const bToken = addresses.DAI;
      //   console.log("sellToken",sToken);
      //   const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
      //   const handlerAddress1 = tokenInfo1[2];
      //   const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);
      //   const vaultAddress = await indexSwap5.vault();

      //   const sAmount = await handler1.getTokenBalance(vaultAddress, sToken);
      //   console.log("sAmount",sAmount);

      //   const tx = await metaAggregator5.redeem(sAmount, "200", sToken);

      //   const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
      //   const handlerAddress0 = tokenInfo0[2];
      //   const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
      //   const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
      //   const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);

      //   var exchangeData = {};
      //   var _sellTokenAddress = [];
      //   var _buyTokenAddress = [];
      //   var _sellAmount = [];
      //   var _callData = [];
      //   console.log("handler address",bebopHandler.address);

      //   if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 1) {
      //     const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator5.address);
      //     if (getUnderlyingTokens0[0] == getUnderlyingTokens1[0]) {
      //       _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
      //       _buyTokenAddress.push(getUnderlyingTokens0[0].toString());
      //       _sellAmount.push(bal.toString());
      //       _callData.push("0x");
      //     } else {
      //       const params = {
      //         sell_tokens: getUnderlyingTokens1[0].toString(),
      //         buy_tokens: getUnderlyingTokens0[0].toString(),
      //         sell_amounts: bal.toString(),
      //         taker_address : bebopHandler.address,
      //         skip_validation : true,
      //         gasless : false
      //       };

      //       const getResponse = await axios.get(addresses.bebopUrl + `${qs.stringify(params)}`, {
      //         headers: {
      //           "accept": "application/json",
      //         },
      //       });

      //       console.log("urll",addresses.bebopUrl + `${qs.stringify(params)}`);

      //       _sellTokenAddress.push(getUnderlyingTokens1[0]);
      //       _buyTokenAddress.push(getUnderlyingTokens0[0]);
      //       _sellAmount.push(bal.toString());
      //       console.log("BEFORE DATA");
      //       // console.log("DATA",getResponse);
      //       _callData.push(getResponse.data.tx.data.toString());
      //     }
      //   } else if (getUnderlyingTokens1.length == 1 && getUnderlyingTokens0.length == 2) {
      //     const bal = await ERC20.attach(getUnderlyingTokens1[0]).balanceOf(metaAggregator5.address);
      //     var bal1 = bal.div(2);
      //     var bal2 = bal.sub(bal1);
      //     var balAmount = [bal1, bal2];

      //     for (let i = 0; i < getUnderlyingTokens0.length; i++) {
      //       if (getUnderlyingTokens1[0] == getUnderlyingTokens0[i]) {
      //         _sellTokenAddress.push(getUnderlyingTokens1[0]);
      //         _buyTokenAddress.push(getUnderlyingTokens0[i]);
      //         _sellAmount.push(balAmount[i].toString());
      //         _callData.push("0x");
      //       } else {
      //         const params = {
      //           sell_tokens: getUnderlyingTokens1[0].toString(),
      //           buy_tokens: getUnderlyingTokens0[i].toString(),
      //           sell_amounts: balAmount[i].toString(),
      //           taker_address : owner.address,
      //           skip_validation : true,
      //           gasless : false
      //         };

      //         const getResponse = await axios.get(addresses.bebopUrl + `${qs.stringify(params)}`, {
      //           headers: {
      //             "accept": "application/json",
      //           },
      //         });

      //         _sellTokenAddress.push(getUnderlyingTokens1[0]);
      //         _buyTokenAddress.push(getUnderlyingTokens0[i]);
      //         _sellAmount.push(balAmount[i].toString());
      //         _callData.push(getResponse.tx.data.toString());
      //       }
      //     }
      //   } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 1) {
      //     for (let i = 0; i < getUnderlyingTokens1.length; i++) {
      //       const bal = await ERC20.attach(getUnderlyingTokens1[i]).balanceOf(metaAggregator5.address);
      //       if (getUnderlyingTokens1[i] == getUnderlyingTokens0[0]) {
      //         _sellTokenAddress.push(getUnderlyingTokens1[i]);
      //         _buyTokenAddress.push(getUnderlyingTokens0[0]);
      //         _sellAmount.push(bal.toString());
      //         _callData.push("0x");
      //       } else {
      //         const params = {
      //           sell_tokens: getUnderlyingTokens1[i].toString(),
      //           buy_tokens: getUnderlyingTokens0[0].toString(),
      //           sell_amounts: bal.toString(),
      //           taker_address : owner.address,
      //           skip_validation : true,
      //           gasless : false
      //         };

      //         const getResponse = await axios.get(addresses.bebopUrl + `${qs.stringify(params)}`, {
      //           headers: {
      //             "accept": "application/json",
      //           },
      //         });

      //         _sellTokenAddress.push(getUnderlyingTokens1[i]);
      //         _buyTokenAddress.push(getUnderlyingTokens0[0]);
      //         _sellAmount.push(bal.toString());
      //         _callData.push(getResponse.tx.data.toString());
      //       }
      //     }
      //   } else if (getUnderlyingTokens1.length == 2 && getUnderlyingTokens0.length == 2) {
      //     var common = [];
      //     var tempUnder0 = [];
      //     var tempUnder1 = [];
      //     for (let i = 0; i < getUnderlyingTokens1.length; i++) {
      //       if (getUnderlyingTokens0.includes(getUnderlyingTokens1[i])) {
      //         common.push(getUnderlyingTokens1[i]);
      //       } else {
      //         tempUnder1.push(getUnderlyingTokens1[i]);
      //       }
      //     }

      //     for (let i = 0; i < getUnderlyingTokens0.length; i++) {
      //       if (!common.includes(getUnderlyingTokens0[i])) {
      //         tempUnder0.push(getUnderlyingTokens0[i]);
      //       }
      //     }

      //     var newUnderlying0 = tempUnder0.concat(common);
      //     var newUnderlying1 = tempUnder1.concat(common);

      //     for (let i = 0; i < newUnderlying1.length; i++) {
      //       const bal = await ERC20.attach(newUnderlying1[i]).balanceOf(metaAggregator5.address);
      //       if (newUnderlying1[i] == newUnderlying0[i]) {
      //         _sellTokenAddress.push(newUnderlying1[i]);
      //         _buyTokenAddress.push(newUnderlying0[i]);
      //         _sellAmount.push(bal.toString());
      //         _callData.push("0x");
      //       } else {
      //         const params = {
      //           sell_tokens: getUnderlyingTokens1[i].toString(),
      //           buy_tokens: getUnderlyingTokens0[i].toString(),
      //           sell_amounts: bal.toString(),
      //           taker_address : owner.address,
      //           skip_validation : true,
      //           gasless : false
      //         };

      //         const getResponse = await axios.get(addresses.bebopUrl + `${qs.stringify(params)}`, {
      //           headers: {
      //             "accept": "application/json",
      //           },
      //         });

      //         _sellTokenAddress.push(newUnderlying1[i]);
      //         _buyTokenAddress.push(newUnderlying0[i]);
      //         _sellAmount.push(bal.toString());
      //         _callData.push(getResponse.tx.data.toString());
      //       }
      //     }
      //   }
      //   exchangeData = {
      //     sellTokenAddress: _sellTokenAddress,
      //     buyTokenAddress: _buyTokenAddress,
      //     swapHandler: bebopHandler.address,
      //     portfolioToken: bToken,
      //     sellAmount: _sellAmount,
      //     _lpSlippage: "200",
      //     callData: _callData,
      //   };

      //   const balBefore = await ERC20.attach(bToken).balanceOf(vaultAddress);

      //   const tx2 = await metaAggregator5.metaAggregatorSwap(exchangeData);

      //   const balAfter = await ERC20.attach(bToken).balanceOf(vaultAddress);

      //   const newTokenList = await indexSwap5.getTokens();
      //   expect(Number(balAfter)).to.be.greaterThan(Number(balBefore));
      //   expect(newTokenList.includes(bToken)).to.equal(true);
      // })

      it("swaps into primary using ZeroEx Protocol from primary", async () => {
        var tokens = await indexSwap5.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        var sToken = tokens[1];
        var bToken = addresses.USDCe;
        var sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap5.vault());
        var zeroExparams = {};
        var MetaSwapData = {};

        var tokenBalanceBefore = await ERC20.attach(bToken).balanceOf(await indexSwap5.vault());
        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);
        if (sToken == getUnderlyingTokens0[0]) {
          MetaSwapData = {
            sellTokenAddress: [sToken.toString()],
            buyTokenAddress: [getUnderlyingTokens0[0].toString()],
            swapHandler: zeroExHandler.address,
            sellAmount: [sAmount.toString()],
            portfolioToken: bToken,
            _lpSlippage: "200",
            protocolFee: ["0"],
            callData: ["0x"],
          };
        } else {
          zeroExparams = {
            sellToken: sToken.toString(),
            buyToken: getUnderlyingTokens0[0].toString(),
            sellAmount: sAmount.toString(),
            slippagePercentage: 0.06,
          };
          const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
            headers: {
              "0x-api-key": process.env.ZEROX_KEY,
            },
          });
          var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

          MetaSwapData = {
            sellTokenAddress: [sToken.toString()],
            buyTokenAddress: [getUnderlyingTokens0[0].toString()],
            swapHandler: zeroExHandler.address,
            sellAmount: [sAmount.toString()],
            portfolioToken: bToken,
            _lpSlippage: "200",
            protocolFee: [fee.toString()],
            callData: [zeroExResponse.data.data],
          };
        }
        await metaAggregator5.swapPrimaryToken(MetaSwapData);
        var tokenBalanceAfter = await ERC20.attach(bToken).balanceOf(await indexSwap5.vault());
        var amountAfterSwap = await ERC20.attach(sToken).balanceOf(await indexSwap5.vault());
        expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        expect(Number(amountAfterSwap)).to.be.equal(0);
      });

      it("swaps into derivative using ZeroEx Protocol from primary", async () => {
        var tokens = await indexSwap5.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        var sToken = tokens[0];
        var bToken = addresses.MAIN_LP_USDCe;
        var sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap5.vault());
        var zeroExparams = {};
        var MetaSwapData = {};

        var tokenBalanceBefore = await ERC20.attach(bToken).balanceOf(await indexSwap5.vault());
        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);
        if (sToken == getUnderlyingTokens0[0]) {
          MetaSwapData = {
            sellTokenAddress: [sToken.toString()],
            buyTokenAddress: [getUnderlyingTokens0[0].toString()],
            swapHandler: zeroExHandler.address,
            sellAmount: [sAmount.toString()],
            portfolioToken: bToken,
            _lpSlippage: "200",
            protocolFee: ["0"],
            callData: ["0x"],
          };
        } else {
          zeroExparams = {
            sellToken: sToken.toString(),
            buyToken: getUnderlyingTokens0[0].toString(),
            sellAmount: sAmount.toString(),
            slippagePercentage: 0.06,
          };
          const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
            headers: {
              "0x-api-key": process.env.ZEROX_KEY,
            },
          });
          var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

          MetaSwapData = {
            sellTokenAddress: [sToken.toString()],
            buyTokenAddress: [getUnderlyingTokens0[0].toString()],
            swapHandler: zeroExHandler.address,
            sellAmount: [sAmount.toString()],
            portfolioToken: bToken,
            _lpSlippage: "200",
            protocolFee: [fee.toString()],
            callData: [zeroExResponse.data.data],
          };
        }
        await metaAggregator5.swapPrimaryToken(MetaSwapData);
        var tokenBalanceAfter = await handler0.getTokenBalance(await indexSwap5.vault(), bToken);

        var amountAfterSwap = await ERC20.attach(sToken).balanceOf(await indexSwap5.vault());
        expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        expect(Number(amountAfterSwap)).to.be.equal(0);
      });

      it("swaps into lp token using ZeroEx Protocol from primary", async () => {
        var tokens = await indexSwap5.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        var sToken = tokens[0];
        var bToken = addresses.SushiSwap_WETH_WBTC;
        var sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap5.vault());
        var zeroExparams = {};
        var MetaSwapData = {};

        var _sellTokenAddress = [];
        var _buyTokenAddress = [];
        var _sellAmount = [];
        var _callData = [];

        var tokenBalanceBefore = await ERC20.attach(bToken).balanceOf(await indexSwap5.vault());

        const tokenInfo1: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(sToken);
        const handlerAddress1 = tokenInfo1[2];
        const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
        const handlerAddress0 = tokenInfo0[2];
        const handler1 = await ethers.getContractAt("IHandler", handlerAddress1);
        const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
        const getUnderlyingTokens1: string[] = await handler1.getUnderlying(sToken);
        const getUnderlyingTokens0: string[] = await handler0.getUnderlying(bToken);

        if (getUnderlyingTokens0.length == 1) {
          zeroExparams = {
            sellToken: sToken.toString(),
            buyToken: getUnderlyingTokens0[0].toString(),
            sellAmount: sAmount.toString(),
            slippagePercentage: 0.06,
          };
          const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
            headers: {
              "0x-api-key": process.env.ZEROX_KEY,
            },
          });
          var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;

          MetaSwapData = {
            sellTokenAddress: [sToken.toString()],
            buyTokenAddress: [getUnderlyingTokens0[0].toString()],
            swapHandler: zeroExHandler.address,
            sellAmount: [sAmount.toString()],
            portfolioToken: bToken.toString(),
            _lpSlippage: "200",
            protocolFee: [fee.toString()],
            callData: [zeroExResponse.data.data],
          };
        }
        if (getUnderlyingTokens0.length == 2) {
          var amount1 = sAmount.div(2);
          var amount2 = sAmount.sub(amount1);
          var balAmount = [amount1, amount2];

          for (let i = 0; i < getUnderlyingTokens0.length; i++) {
            if (getUnderlyingTokens1[0] == getUnderlyingTokens0[i]) {
              _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
              _buyTokenAddress.push(getUnderlyingTokens0[i].toString());
              _sellAmount.push(balAmount[i].toString());
              _callData.push("0x");
            } else {
              zeroExparams = {
                sellToken: sToken.toString(),
                buyToken: getUnderlyingTokens0[i].toString(),
                sellAmount: balAmount[i].toString(),
                slippagePercentage: 0.06,
              };
              const zeroExResponse = await axios.get(addresses.zeroExUrl + `${qs.stringify(zeroExparams)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              var fee = zeroExResponse.data.protocolFee ? zeroExResponse.data.protocolFee : 0;
              _sellTokenAddress.push(getUnderlyingTokens1[0].toString());
              _buyTokenAddress.push(getUnderlyingTokens0[i].toString());
              _sellAmount.push(balAmount[i].toString());
              _callData.push(zeroExResponse.data.data);
            }
          }
          MetaSwapData = {
            sellTokenAddress: _sellTokenAddress,
            buyTokenAddress: _buyTokenAddress,
            swapHandler: zeroExHandler.address,
            sellAmount: _sellAmount,
            portfolioToken: bToken.toString(),
            _lpSlippage: "200",
            callData: _callData,
          };
        }
        await metaAggregator5.swapPrimaryToken(MetaSwapData);
        var tokenBalanceAfter = await ERC20.attach(bToken).balanceOf(await indexSwap5.vault());
        var amountAfterSwap = await ERC20.attach(sToken).balanceOf(await indexSwap5.vault());
        expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        expect(Number(amountAfterSwap)).to.be.equal(0);
      });

      it("Direct Swap reverts if passed underlying token length more than 1", async () => {
        const tokens = await indexSwap1.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const bToken = addresses.SushiSwap_WETH_USDT;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        await expect(
          metaAggregator1.directSwap([sToken], [bToken], [sAmount.toString()], ["200"]),
        ).to.be.revertedWithCustomError(metaAggregator1, "InvalidTokenLength");
      });

      it("Direct Swap reverts if underlying is not same", async () => {
        const tokens = await indexSwap1.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const bToken = addresses.WETH;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        await expect(
          metaAggregator1.directSwap([sToken], [bToken], [sAmount.toString()], ["200"]),
        ).to.be.revertedWithCustomError(metaAggregator1, "InvalidToken");
      });

      it("Direct Swap reverts if length of tokens are not same", async () => {
        const tokens = await indexSwap1.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const bToken = addresses.SushiSwap_WETH_USDT;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        await expect(
          metaAggregator1.directSwap([sToken, tokens[1]], [bToken], [sAmount.toString()], ["200"]),
        ).to.be.revertedWithCustomError(metaAggregator1, "InvalidTokenLength");
      });

      it("Direct Swap reverts if length of tokens and sellAmount are not same", async () => {
        const tokens = await indexSwap1.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const bToken = addresses.SushiSwap_WETH_USDT;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap1.vault());

        await expect(metaAggregator1.directSwap([sToken], [bToken], [], ["200"])).to.be.revertedWithCustomError(
          metaAggregator1,
          "InvalidSellAmount",
        );
      });

      it("redeem should revert back if index not paused", async () => {
        const tokens = await indexSwap.getTokens();
        const sToken = tokens[0];
        const sAmount = ethers.utils.parseEther("10");
        await expect(metaAggregator.redeem(sAmount, "700", sToken)).to.be.reverted;
      });

      it("should pause", async () => {
        await rebalancing.setPause(true);
      });

      it("redeem should revert back if token getting redeem is not valid", async () => {
        const tokens = await indexSwap.getTokens();
        const sToken = addresses.cETH;
        const sAmount = ethers.utils.parseEther("100");
        await expect(metaAggregator.redeem(sAmount, "200", sToken)).to.be.reverted;
      });

      it("should revert back if the buy token is not registered", async () => {
        const tokens = await indexSwap.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.BOB_LP_USDCe;
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

        const sToken = tokens[0];
        const bToken = addresses.WETH;

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

        const sToken = tokens[0];
        const sAmount = ethers.utils.parseEther("100");
        await expect(metaAggregator1.connect(nonOwner).redeem(sAmount, "200", sToken)).to.be.revertedWithCustomError(
          metaAggregator1,
          "CallerNotAssetManager",
        );
      });

      it("should revert back if metaAggregatorSwap is called by non asset manager", async () => {
        const tokens = await indexSwap.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const sToken = tokens[0];
        const bToken = addresses.WETH;

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

      it("Invest 1ETH into Top10 fund", async () => {
        await rebalancing.setPause(false);
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["600", "600"],
            _lpSlippage: ["600", "600"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });
    });
  });
});