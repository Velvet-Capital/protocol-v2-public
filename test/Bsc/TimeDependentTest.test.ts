import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import hre from "hardhat";
import { ethers, upgrades, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import {
  tokenAddresses,
  IAddresses,
  indexSwapLibrary,
  baseHandler,
  accessController,
  venusHandler,
  wombatHandler,
  beefyHandler,
  pancakeLpHandler,
  priceOracle,
  beefyLPHandler,
  biSwapLPHandler,
  apeSwapLPHandler,
  apeSwapLendingHandler
} from "./Deployments.test";

import {
  IndexSwap,
  IndexSwap__factory,
  Exchange,
  Rebalancing__factory,
  AccessController,
  IndexFactory,
  UniswapV2Handler,
  VelvetSafeModule,
  PriceOracle,
  AssetManagerConfig,
  TokenRegistry,
  FeeModule,
  OffChainIndexSwap,
  RebalanceLibrary,
  VelvetSafeModule__factory,
  RebalanceAggregator__factory,
  ZeroExHandler
} from "../../typechain";

import { chainIdToAddresses } from "../../scripts/networkVariables";
import { copyFileSync, link } from "fs";
import { MerkleTree } from "merkletreejs";
import { equal } from "assert";
import { TransformStreamDefaultController } from "stream/web";

const axios = require("axios");
const qs = require("qs");

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for TimeDependent", () => {
  let iaddress: IAddresses;
  let accounts;
  // let priceOracle: PriceOracle;
  let indexSwap: any;
  let indexSwap1: any;
  let indexSwap2: any;
  let indexSwap3: any;
  let indexSwap4: any;
  let indexSwapContract: IndexSwap;
  let indexFactory: IndexFactory;
  let swapHandler1: UniswapV2Handler;
  let swapHandler: UniswapV2Handler;
  let tokenRegistry: TokenRegistry;
  let assetManagerConfig: AssetManagerConfig;
  let exchange: Exchange;
  let rebalancing: any;
  let rebalancing1: any;
  let rebalancing2: any;
  let rebalancing3: any;
  let accessController0: AccessController;
  let accessController1: AccessController;
  let feeModule0: FeeModule;
  let feeModule1: FeeModule;
  let feeModule2: FeeModule;
  let rebalanceLibrary: RebalanceLibrary;
  let txObject;
  let velvetSafeModule: VelvetSafeModule;
  let gnosisSafeAddress: string;
  let offChainIndexSwap: OffChainIndexSwap;
  let investor1: SignerWithAddress;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let assetManagerTreasury: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let assetManagerAdmin: SignerWithAddress;
  let assetManager: SignerWithAddress;
  let whitelistManagerAdmin: SignerWithAddress;
  let whitelistManager: SignerWithAddress;
  let velvetManager: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let merkleTree: MerkleTree;
  let indexInfo: any;
  let indexInfo1: any;
  let indexInfo2: any;
  let indexInfo3: any;
  let indexInfo4: any;
  let metaAggregator: any;
  let metaAggregator1: any;
  let metaAggregator2: any;
  let metaAggregator3: any;
  let metaAggregator4: any;
  let zeroExHandler: ZeroExHandler;
  // let pancakeLpHandler: any;
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  let velvetTreasuryBalance = 0;
  let assetManagerTreasuryBalance = 0;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe.only("Tests for Time Dependent contract", () => {
    before(async () => {
    const ZeroExHandler = await ethers.getContractFactory("ZeroExHandler");
    zeroExHandler = await ZeroExHandler.deploy();
    await zeroExHandler.deployed();

    zeroExHandler.init("0xdef1c0ded9bec7f1a1670819833240f027b25eff", priceOracle.address);
    await zeroExHandler.addOrUpdateProtocolSlippage("100");

      accounts = await ethers.getSigners();
      [
        owner,
        investor1,
        nonOwner,
        treasury,
        assetManagerTreasury,
        addr1,
        addr2,
        addr3,
        assetManager,
        assetManagerAdmin,
        whitelistManager,
        whitelistManagerAdmin,
        ...addrs
      ] = accounts;

      iaddress = await tokenAddresses();

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");

      const registry = await upgrades.deployProxy(
        TokenRegistry,
        [
          "3000000000000000000",
          "120000000000000000000000",
          treasury.address,
          addresses.WETH_Address
        ],
        { kind: "uups" },
      );

      tokenRegistry = TokenRegistry.attach(registry.address);
      await tokenRegistry.setCoolDownPeriod("1");

      const UniswapV2Handler = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler = await UniswapV2Handler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

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
      offChainIndexSwap = await offChainIndex.deploy();
      await offChainIndexSwap.deployed();

      const PancakeSwapHandler1 = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler1 = await PancakeSwapHandler1.deploy();
      await swapHandler1.deployed();

      // Granting owner index manager role to swap eth to token
      await accessController.grantRole(
        "0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16",
        owner.address,
      );

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      exchange = await Exchange.deploy();
      await exchange.deployed();

      let registry1 = await tokenRegistry.enableToken(
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
          addresses.vBTC_Address,
          addresses.vETH_Address,
          addresses.vBNB_Address,
          addresses.vDOGE_Address,
          addresses.vDAI_Address,
          iaddress.busdAddress,
          iaddress.btcAddress,
          iaddress.ethAddress,
          iaddress.wbnbAddress,
          iaddress.dogeAddress,
          iaddress.daiAddress,
          addresses.USDT,
          addresses.Cake_BUSDLP_Address,
          addresses.Cake_WBNBLP_Address,
          addresses.MAIN_LP_BUSD,
          addresses.mooBTCBUSDLP,
          addresses.MAIN_LP_DAI,
          addresses.oBNB,
          addresses.BSwap_WBNB_BUSDLP_Address,
          addresses.mooBTCBUSDLP,
          addresses.vBNB_Address,
          addresses.BSwap_BTC_WBNBLP_Address,
          addresses.DOGE_WBNBLP_Address,
          addresses.BSwap_DOGE_WBNBLPAddress,
          addresses.ApeSwap_DOGE_WBNB_Address,
          addresses.mooDOGEWBNB,
          addresses.mooValasBUSD,
          addresses.mooVenusBNB,
          addresses.mooValasBTCB,
        ],
        [
          venusHandler.address,
          venusHandler.address,
          venusHandler.address,
          venusHandler.address,
          venusHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          pancakeLpHandler.address,
          pancakeLpHandler.address,
          wombatHandler.address,
          beefyLPHandler.address,
          wombatHandler.address,
          apeSwapLendingHandler.address,
          biSwapLPHandler.address,
          beefyLPHandler.address,
          venusHandler.address,
          biSwapLPHandler.address,
          pancakeLpHandler.address,
          biSwapLPHandler.address,
          apeSwapLPHandler.address,
          beefyLPHandler.address,
          beefyHandler.address,
          beefyHandler.address,
          beefyHandler.address,
        ],
        [
          [addresses.venus_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.base_RewardToken],
          [addresses.apeSwap_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.apeSwap_RewardToken],
          [addresses.biswap_RewardToken],
          [addresses.base_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.biswap_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.biswap_RewardToken],
          [addresses.apeSwap_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
        ],
        [
          false,
          false,
          false,
          false,
          false,
          true,
          true,
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
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
      );
      registry1.wait();
      tokenRegistry.enableSwapHandlers([swapHandler.address, swapHandler1.address]);
      await tokenRegistry.addRewardToken([addresses.venus_RewardToken,addresses.wombat_RewardToken],baseHandler.address);

      await tokenRegistry.enablePermittedTokens(
        [iaddress.busdAddress, iaddress.btcAddress, iaddress.ethAddress, iaddress.wbnbAddress],
        [priceOracle.address, priceOracle.address, priceOracle.address, priceOracle.address],
      );
      await tokenRegistry.addNonDerivative(wombatHandler.address);

      await tokenRegistry.enableExternalSwapHandler(zeroExHandler.address);

      const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
      const assetManagerConfig = await AssetManagerConfig.deploy();
      await assetManagerConfig.deployed();

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

      let whitelistedTokens = [
        addresses.vBTC_Address,
          addresses.vETH_Address,
          addresses.vBNB_Address,
          addresses.vDOGE_Address,
          addresses.vDAI_Address,
          iaddress.busdAddress,
          iaddress.btcAddress,
          iaddress.ethAddress,
          iaddress.wbnbAddress,
          iaddress.dogeAddress,
          iaddress.daiAddress,
          addresses.USDT,
          addresses.Cake_BUSDLP_Address,
          addresses.Cake_WBNBLP_Address,
          addresses.MAIN_LP_BUSD,
          addresses.mooBTCBUSDLP,
          addresses.MAIN_LP_DAI,
          addresses.oBNB,
          addresses.BSwap_WBNB_BUSDLP_Address,
          addresses.mooBTCBUSDLP,
          addresses.vBNB_Address,
          addresses.BSwap_BTC_WBNBLP_Address,
          addresses.DOGE_WBNBLP_Address,
          addresses.BSwap_DOGE_WBNBLPAddress,
          addresses.ApeSwap_DOGE_WBNB_Address,
          addresses.mooDOGEWBNB,
          addresses.mooValasBUSD,
          addresses.mooVenusBNB,
          addresses.mooValasBTCB,
      ];

      console.log("indexFactory address:", indexFactory.address);
      const indexFactoryCreate = await indexFactory.createIndexNonCustodial({
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

      const indexFactoryCreate2 = await indexFactory.createIndexCustodial(
        {
          name: "INDEXL",
          symbol: "IDX",
          maxIndexInvestmentAmount: "120000000000000000000000",
          minIndexInvestmentAmount: "3000000000000000000",
          _managementFee: "200",
          _performanceFee: "2500",
          _entryFee: "100",
          _exitFee: "100",
          _assetManagerTreasury: assetManagerTreasury.address,
          _whitelistedTokens: whitelistedTokens,
          _public: true,
          _transferable: true,
          _transferableToPublic: false,
          _whitelistTokens: false,
        },
        [owner.address, nonOwner.address],
        2,
      );

      const indexFactoryCreate3 = await indexFactory.createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "120000000000000000000000",
        minIndexInvestmentAmount: "3000000000000000000",
        _managementFee: "0",
        _performanceFee: "0",
        _entryFee: "0",
        _exitFee: "0",
        _assetManagerTreasury: assetManagerTreasury.address,
        _whitelistedTokens: whitelistedTokens,
        _public: true,
        _transferable: true,
        _transferableToPublic: true,
        _whitelistTokens: false,
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
        _transferable: true,
        _transferableToPublic: true,
        _whitelistTokens: false,
      });

      const indexAddress = await indexFactory.getIndexList(0);
      indexInfo = await indexFactory.IndexSwapInfolList(0);

      const indexAddress1 = await indexFactory.getIndexList(1);
      indexInfo1 = await indexFactory.IndexSwapInfolList(1);

      const indexAddress2 = await indexFactory.getIndexList(2);
      indexInfo2 = await indexFactory.IndexSwapInfolList(2);

      const indexAddress3 = await indexFactory.getIndexList(3);
      indexInfo3 = await indexFactory.IndexSwapInfolList(3);

      indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

      indexSwap1 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress1);

      velvetTreasuryBalance = await indexSwap1.balanceOf(treasury.address);
      assetManagerTreasuryBalance = await indexSwap1.balanceOf(assetManagerTreasury.address);

      const accessController0Addr = await indexSwap.accessController();
      accessController0 = accessController.attach(accessController0Addr);

      const accessController1Addr = await indexSwap1.accessController();
      accessController1 = accessController.attach(accessController1Addr);

      indexSwap2 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress2);

      indexSwap3 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress3);

      console.log("indexSwapAddress1:", indexAddress1);

      rebalancing = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo.rebalancing);

      rebalancing1 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo1.rebalancing);

      rebalancing2 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo2.rebalancing);

      rebalancing3 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo3.rebalancing);

      feeModule0 = FeeModule.attach(indexInfo.feeModule);
      feeModule1 = FeeModule.attach(indexInfo1.feeModule);
      feeModule2 = FeeModule.attach(indexInfo2.feeModule);

      metaAggregator = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo.metaAggregator);
      metaAggregator1 = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo1.metaAggregator);
      metaAggregator2 = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo2.metaAggregator);

      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("Time Dependent Test", function () {
        it("Initialize 1st IndexFund Tokens", async () => {
            const indexAddress = await indexFactory.getIndexList(0);
            const index = indexSwap.attach(indexAddress);
            await index.initToken([addresses.MAIN_LP_USDT, addresses.Cake_WBNBLP_Address], [5000, 5000]);
          });
    
        it("Initialize 2nd IndexFund Tokens", async () => {
          const indexAddress = await indexFactory.getIndexList(1);
          const index = indexSwap.attach(indexAddress);
          await index.initToken( 
          [addresses.MAIN_LP_USDT, addresses.BSwap_BTC_WBNBLP_Address, addresses.mooBTCBUSDLP],
          [5000, 2500, 2500]
          ); 
        });
  
        it("Initialize 3rd IndexFund Tokens", async () => {
          const indexAddress = await indexFactory.getIndexList(2);
          const index = indexSwap.attach(indexAddress);
          await index.initToken([addresses.vBTC_Address, addresses.ETH_Address], [5000, 5000]);
        });
  
        it("Initialize 4th IndexFund Tokens", async () => {
          const indexAddress = await indexFactory.getIndexList(3);
          const index = indexSwap.attach(indexAddress);
          await index.initToken([addresses.MAIN_LP_USDT, addresses.WBNB, addresses.vETH_Address,iaddress.btcAddress],
            [2500, 2500, 2500, 2500]);
        });
        it("Invest 1BNB into Top10 fund", async () => {
          const VBep20Interface = await ethers.getContractAt(
            "VBep20Interface",
            "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
          );
  
          const indexSupplyBefore = await indexSwap.totalSupply();
          // console.log("0.1bnb before", indexSupplyBefore);
          await indexSwap.investInFund(
            {
              _slippage: ["500", "500"],
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
          // console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)))
          // console.log(indexSupplyAfter);
  
          expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        });
  
        it("Invest 2BNB into Top10 2nd index fund", async () => {
          const VBep20Interface = await ethers.getContractAt(
            "VBep20Interface",
            "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
          );
  
          const indexSupplyBefore = await indexSwap1.totalSupply();
          // console.log("2bnb before", indexSupplyBefore);
          await indexSwap1.investInFund(
            {
              _slippage: ["500", "500","500"],
              _lpSlippage: ["200", "200","500"],
              _to: owner.address,
              _tokenAmount: "2000000000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.wbnbAddress,
            },
            {
              value: "2000000000000000000",
            },
          );
          const indexSupplyAfter = await indexSwap1.totalSupply();
          console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
          console.log(indexSupplyAfter);
  
          expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        });
  
        it("Invest 1BNB into Top10 3rd index fund", async () => {
          const VBep20Interface = await ethers.getContractAt(
            "VBep20Interface",
            "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
          );
  
          const indexSupplyBefore = await indexSwap2.totalSupply();
          // console.log("2bnb before", indexSupplyBefore);
          await indexSwap2.investInFund(
            {
              _slippage: ["500", "500"],
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
          const indexSupplyAfter = await indexSwap2.totalSupply();
          // console.log(indexSupplyAfter);
          console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
          console.log(indexSupplyAfter);
  
          expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        });
  
        it("Invest 2BNB into Top10 4th index fund", async () => {
          const VBep20Interface = await ethers.getContractAt(
            "VBep20Interface",
            "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
          );
  
          const indexSupplyBefore = await indexSwap3.totalSupply();
          // console.log("2bnb before", indexSupplyBefore);
          await indexSwap3.investInFund(
            {
              _slippage: ["200", "200", "200", "200"],
              _lpSlippage: ["1000", "1000", "1000", "200"],
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
          // console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
  
          // console.log(indexSupplyAfter);
          console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
          console.log(indexSupplyAfter);
  
          expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        });

        // PriceOracle test case
        it("should revert if the price did not updated for more than 25 hours", async () =>{
          await ethers.provider.send("evm_increaseTime", [100000]);
          await ethers.provider.send('evm_mine');
          await expect(priceOracle.getPriceForOneTokenInUSD(addresses.WBNB)).to.be.revertedWithCustomError(priceOracle,"PriceOracleExpired")
        });
  
        it("should revert if the price did not updated for more than 25 hours", async () =>{
          await ethers.provider.send('evm_increaseTime', [100000]);
          await ethers.provider.send('evm_mine');
          await expect(priceOracle.getPrice(
            "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
            "0x0000000000000000000000000000000000000348",
          )).to.be.revertedWithCustomError(priceOracle,"PriceOracleExpired")
        });

        it("should update threshold of the oracle", async()=>{
          await priceOracle.updateOracleExpirationThreshold("1000000000000000000000");
          expect(await priceOracle.oracleExpirationThreshold()).to.be.equal("1000000000000000000000");
        })
        // Time Increased For Fee 
        it("Asset manager should propose new management fee", async () => {
          const config = await indexSwap.iAssetManagerConfig();
          const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
          const assetManagerConfig = AssetManagerConfig.attach(config);
          await assetManagerConfig.proposeNewManagementFee("150");
          expect(await assetManagerConfig.newManagementFee()).to.be.equal(150);
        });

        it("Asset manager should propose new performance fee", async () => {
          const config = await indexSwap.iAssetManagerConfig();
          const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
          const assetManagerConfig = AssetManagerConfig.attach(config);
          await assetManagerConfig.proposeNewPerformanceFee("150");
          expect(await assetManagerConfig.newPerformanceFee()).to.be.equal(150);
        });

        it("Asset manager should propose new entry and exit fee", async () => {
          const config = await indexSwap.iAssetManagerConfig();
          const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
          const assetManagerConfig = AssetManagerConfig.attach(config);
          await assetManagerConfig.proposeNewEntryAndExitFee("100","100");
          expect(await assetManagerConfig.newEntryFee()).to.be.equal(100);
          expect(await assetManagerConfig.newExitFee()).to.be.equal(100);
        });
  
        it("Asset manager should be able to update management fee after 28 days passed", async () => {
          await network.provider.send("evm_increaseTime", [2419200]);
          const config = await indexSwap.iAssetManagerConfig();
          const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
          const assetManagerConfig = AssetManagerConfig.attach(config);
  
          await assetManagerConfig.updateManagementFee();
          expect(await assetManagerConfig.managementFee()).to.be.equal(150);
        });
  
        it("Asset manager should be able to update performance fee after 28 days passed", async () => {
          const config = await indexSwap.iAssetManagerConfig();
          const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
          const assetManagerConfig = AssetManagerConfig.attach(config);
          await assetManagerConfig.updatePerformanceFee();
          expect(await assetManagerConfig.performanceFee()).to.be.equal(150);
        });

        it("Asset manager should be able to update entry fee after 28 days passed", async () => {
          const config = await indexSwap.iAssetManagerConfig();
          const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
          const assetManagerConfig = AssetManagerConfig.attach(config);
          await assetManagerConfig.updateEntryAndExitFee();
          expect(await assetManagerConfig.entryFee()).to.be.equal(100);
          expect(await assetManagerConfig.exitFee()).to.be.equal(100);
        });

        // Time Increased For Claim Reward
        it("should claim tokens", async () => {
          await ethers.provider.send("evm_increaseTime", [3153600]);
  
          let tokens = [addresses.MAIN_LP_USDT];
          await indexSwap1.claimTokens(tokens);
  
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
          let balance = await ERC20.attach(addresses.wombat_RewardToken).balanceOf(await indexSwap1.vault());
          console.log("claim", balance);
        });
  
        it("should swap reward token using pancakeSwap Handler into derivative token",async() => {
          var tokens = await indexSwap1.getTokens();
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
  
          var sToken = addresses.wombat_RewardToken;
          var bToken = tokens[0];
          const vault = await indexSwap1.vault()
          var sAmount = await ERC20.attach(sToken).balanceOf(vault);
  
          const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
          const handlerAddress0 = tokenInfo0[2];
          const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
          var tokenBalanceBefore = await handler0.getTokenBalance(vault,bToken);
          await rebalancing1.swapRewardToken(sToken,swapHandler.address,bToken,sAmount,"300","400");
  
          var tokenBalanceAfter = await handler0.getTokenBalance(vault,bToken);
          var amountAfterSwap = await ERC20.attach(sToken).balanceOf(vault);
          expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        });

        it("should claim tokens", async () => {
          await ethers.provider.send("evm_increaseTime", [3153600]);
  
          let tokens = [addresses.MAIN_LP_USDT];
          await indexSwap.claimTokens(tokens);
  
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
          let balance = await ERC20.attach(addresses.wombat_RewardToken).balanceOf(await indexSwap.vault());
          console.log("claim", balance);
        });
  
        it("should swap reward token using pancakeSwap Handler into LP token",async() => {
          var tokens = await indexSwap.getTokens();
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
  
          var sToken = addresses.wombat_RewardToken;
          var bToken = tokens[1];
          const vault = await indexSwap.vault()
          var sAmount = await ERC20.attach(sToken).balanceOf(vault);
  
          const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
          const handlerAddress0 = tokenInfo0[2];
          const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
          var tokenBalanceBefore = await handler0.getTokenBalance(vault,bToken);
          await rebalancing.swapRewardToken(sToken,swapHandler.address,bToken,sAmount,"300","400");
  
          var tokenBalanceAfter = await handler0.getTokenBalance(vault,bToken);
          var amountAfterSwap = await ERC20.attach(sToken).balanceOf(vault);
          expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        });

        it("should claim tokens", async () => {
          await ethers.provider.send("evm_increaseTime", [31536000]);
  
          let tokens = [addresses.vBTC_Address];
          await indexSwap2.claimTokens(tokens);
  
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
          let balance = await ERC20.attach(addresses.venus_RewardToken).balanceOf(await indexSwap2.vault());
          console.log("claim", balance);
        });
  
        it("swaps reward token should fail using 0x Protocol if buyToken is not IndexToken", async () => {
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
  
          var sToken = addresses.venus_RewardToken;
          var bToken = iaddress.wbnbAddress;
          var sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap2.vault());
          var zeroExparams = {};
          var MetaSwapData = {};
  
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
            const zeroExResponse = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(zeroExparams)}`, {
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
          await expect(metaAggregator2.swapRewardToken(MetaSwapData)).to.be.revertedWithCustomError(
            metaAggregator1,
            "TokenNotIndexToken",
          );
        });
  
        it("swaps reward token using 0x Protocol", async () => {
          var tokens = await indexSwap2.getTokens();
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
  
          var sToken = addresses.venus_RewardToken;
          var bToken = tokens[1];
          var sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap2.vault());
          var zeroExparams = {};
          var MetaSwapData = {};
  
          var tokenBalanceBefore = await ERC20.attach(bToken).balanceOf(await indexSwap2.vault());
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
          await metaAggregator2.swapRewardToken(MetaSwapData);
          var tokenBalanceAfter = await ERC20.attach(bToken).balanceOf(await indexSwap2.vault());
          var amountAfterSwap = await ERC20.attach(sToken).balanceOf(await indexSwap2.vault());
          expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
          expect(Number(amountAfterSwap)).to.be.equal(0);
        });
        it("should claim tokens", async () => {
          await ethers.provider.send("evm_increaseTime", [3153600]);
  
          let tokens = [addresses.MAIN_LP_USDT];
          await indexSwap3.claimTokens(tokens);
  
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
          let balance = await ERC20.attach(addresses.wombat_RewardToken).balanceOf(await indexSwap3.vault());
          console.log("claim", balance);
        });
  
        it("should swap reward token using pancakeSwap Handler into WETH base token",async() => {
          var tokens = await indexSwap3.getTokens();
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
  
          var sToken = addresses.wombat_RewardToken;
          var bToken = tokens[1];
          const vault = await indexSwap3.vault()
          var sAmount = await ERC20.attach(sToken).balanceOf(vault);
  
          const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
          const handlerAddress0 = tokenInfo0[2];
          const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
          var tokenBalanceBefore = await handler0.getTokenBalance(vault,bToken);
          await rebalancing3.swapRewardToken(sToken,swapHandler.address,bToken,sAmount,"300","400");
  
          var tokenBalanceAfter = await handler0.getTokenBalance(vault,bToken);
          var amountAfterSwap = await ERC20.attach(sToken).balanceOf(vault);
          expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        });

        it("should claim tokens", async () => {
          await ethers.provider.send("evm_increaseTime", [3153600]);
  
          let tokens = [addresses.vETH_Address];
          await indexSwap3.claimTokens(tokens);
  
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
          let balance = await ERC20.attach(addresses.venus_RewardToken).balanceOf(await indexSwap3.vault());
          console.log("claim", balance);
        });
  
        it("should swap reward token using pancakeSwap Handler into base token",async() => {
          var tokens = await indexSwap3.getTokens();
          const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
  
          var sToken = addresses.venus_RewardToken;
          var bToken = tokens[3];
          const vault = await indexSwap3.vault()
          var sAmount = await ERC20.attach(sToken).balanceOf(vault);
  
          const tokenInfo0: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(bToken);
          const handlerAddress0 = tokenInfo0[2];
          const handler0 = await ethers.getContractAt("IHandler", handlerAddress0);
          var tokenBalanceBefore = await handler0.getTokenBalance(vault,bToken);
          await rebalancing3.swapRewardToken(sToken,swapHandler.address,bToken,sAmount,"300","400");
  
          var tokenBalanceAfter = await handler0.getTokenBalance(vault,bToken);
          var amountAfterSwap = await ERC20.attach(sToken).balanceOf(vault);
          expect(Number(tokenBalanceAfter)).to.be.greaterThan(Number(tokenBalanceBefore));
        });

    });
  });
});
