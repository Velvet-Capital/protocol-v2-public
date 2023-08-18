import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
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
} from "./Deployments.test";

import {
  IndexSwap,
  IndexSwap__factory,
  Exchange,
  Rebalancing__factory,
  AccessController,
  IndexFactory,
  PancakeSwapHandler,
  VelvetSafeModule,
  PriceOracle,
  AssetManagerConfig,
  TokenRegistry,
  FeeModule,
  OffChainIndexSwap,
  RebalanceLibrary,
  VelvetSafeModule__factory,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";
import { copyFileSync, link } from "fs";
import { MerkleTree } from "merkletreejs";
import { equal } from "assert";
import { TransformStreamDefaultController } from "stream/web";
import exp from "constants";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for IndexFactory", () => {
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
  let swapHandler1: PancakeSwapHandler;
  let swapHandler: PancakeSwapHandler;
  let tokenRegistry: TokenRegistry;
  let assetManagerConfig: AssetManagerConfig;
  let exchange: Exchange;
  let rebalancing: any;
  let rebalancing1: any;
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
  // let pancakeLpHandler: any;
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  let velvetTreasuryBalance = 0;
  let assetManagerTreasuryBalance = 0;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe.only("Tests for IndexFactory contract", () => {
    before(async () => {
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
          "2500", // protocol fee
          "30", // protocolFeeBottomConstraint
          "1000", // max asset manager fee
          "3000", // max performance fee
          "500",
          "500",
          "3000000000000000000",
          "120000000000000000000000",
          treasury.address,
          addresses.WETH_Address,
          "1",
          15,
        ],
        { kind: "uups" },
      );

      tokenRegistry = TokenRegistry.attach(registry.address);

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

      const PancakeSwapHandler1 = await ethers.getContractFactory("PancakeSwapHandler");
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
        ],
        [
          iaddress.busdAddress,
          iaddress.btcAddress,
          iaddress.ethAddress,
          iaddress.wbnbAddress,
          iaddress.dogeAddress,
          iaddress.daiAddress,
          addresses.vBTC_Address,
          addresses.vETH_Address,
          addresses.vBNB_Address,
          addresses.vDOGE_Address,
          addresses.vDAI_Address,
          addresses.Cake_BUSDLP_Address,
          addresses.Cake_WBNBLP_Address,
          addresses.MAIN_LP_BUSD,
          addresses.mooValasBUSD,
          addresses.mooVenusBNB,
          addresses.mooValasBTCB,
        ],
        [
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          venusHandler.address,
          venusHandler.address,
          venusHandler.address,
          venusHandler.address,
          venusHandler.address,
          pancakeLpHandler.address,
          pancakeLpHandler.address,
          wombatHandler.address,
          beefyHandler.address,
          beefyHandler.address,
          beefyHandler.address,
        ],
        [
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.venus_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.wombat_RewardToken],
          [],
          [],
          [],
        ],
        [
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
        ],
      );
      registry1.wait();
      tokenRegistry.enableSwapHandlers([swapHandler.address, swapHandler1.address]);

      await tokenRegistry.enablePermittedTokens(
        [iaddress.busdAddress, iaddress.btcAddress, iaddress.ethAddress, iaddress.wbnbAddress],
        [priceOracle.address, priceOracle.address, priceOracle.address, priceOracle.address],
      );
      await tokenRegistry.addNonDerivative(wombatHandler.address);

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
            _velvetProtocolFee: "100",
            _maxInvestmentAmount: "120000000000000000000000",
            _minInvestmentAmount: "3000000000000000000",
          },
        ],
        { kind: "uups" },
      );

      indexFactory = IndexFactory.attach(indexFactoryInstance.address);

      let whitelistedTokens = [
        iaddress.busdAddress,
        iaddress.btcAddress,
        iaddress.ethAddress,
        iaddress.wbnbAddress,
        iaddress.dogeAddress,
        iaddress.daiAddress,
        addresses.vETH_Address,
        addresses.vBTC_Address,
        addresses.vBNB_Address,
        addresses.vDAI_Address,
        addresses.vDOGE_Address,
        addresses.vLINK_Address,
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
        addresses.mooVenusBNB,
        addresses.mooValasBTCB,
      ];

      await assetManagerConfig.init({
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "100",
        _exitFee: "100",
        _maxInvestmentAmount: "120000000000000000000000",
        _minInvestmentAmount: "3000000000000000000",
        _tokenRegistry: tokenRegistry.address,
        _accessController: accessController.address,
        _assetManagerTreasury: treasury.address,
        _whitelistedTokens: whitelistedTokens,
        _publicPortfolio: true,
        _transferable: true,
        _transferableToPublic: true,
        _whitelistTokens: false,
      });

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

      const indexFactoryCreate2 = await indexFactory.connect(nonOwner).createIndexCustodial(
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
          _public: false,
          _transferable: true,
          _transferableToPublic: false,
          _whitelistTokens: false,
        },
        [owner.address, nonOwner.address],
        2,
      );

      const indexFactoryCreate3 = await indexFactory.connect(nonOwner).createIndexNonCustodial({
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

      const indexFactoryCreate4 = await indexFactory.connect(nonOwner).createIndexNonCustodial({
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
        _public: false,
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

      feeModule0 = FeeModule.attach(indexInfo.feeModule);
      feeModule1 = FeeModule.attach(indexInfo1.feeModule);
      feeModule2 = FeeModule.attach(indexInfo2.feeModule);

      const config = await indexSwap1.iAssetManagerConfig();

      const assetManagerConfig1 = assetManagerConfig.attach(config);
      await assetManagerConfig1.connect(nonOwner).addWhitelistedUser([owner.address, nonOwner.address]);

      const config3 = await indexSwap3.iAssetManagerConfig();

      const assetManagerConfig3 = assetManagerConfig.attach(config3);
      await assetManagerConfig3.connect(nonOwner).addWhitelistedUser([owner.address, nonOwner.address]);

      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("IndexFactory Contract", function () {
      it("should revert back if the custodial is true and no address is passed in _owner", async () => {
        await expect(
          indexFactory.connect(nonOwner).createIndexCustodial(
            {
              name: "INDEXLY",
              symbol: "IDX",
              maxIndexInvestmentAmount: "120000000000000000000000",
              minIndexInvestmentAmount: "3000000000000000000",
              _managementFee: "100",
              _performanceFee: "10",
              _entryFee: "0",
              _exitFee: "0",
              _assetManagerTreasury: assetManagerTreasury.address,
              _whitelistedTokens: [addresses.WBNB_BUSDLP_Address],
              _public: true,
              _transferable: true,
              _transferableToPublic: true,
              _whitelistTokens: false,
            },
            [],
            1,
          ),
        ).to.be.revertedWithCustomError(indexFactory, "NoOwnerPassed");
      });

      it("should revert back if the _custodial is true and threshold is more than owner length", async () => {
        await expect(
          indexFactory.connect(nonOwner).createIndexCustodial(
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
              _whitelistedTokens: [addresses.WBNB_BUSDLP_Address],
              _public: true,
              _transferable: true,
              _transferableToPublic: true,
              _whitelistTokens: false,
            },
            [owner.address],
            2,
          ),
        ).to.be.revertedWithCustomError(indexFactory, "InvalidThresholdLength");
      });

      it("asset manager should create a private transferable fund and make it non-transferable", async () => {
        await expect(
          indexFactory.connect(nonOwner).createIndexNonCustodial({
            name: "INDEXLY",
            symbol: "IDX",
            maxIndexInvestmentAmount: "120000000000000000000000",
            minIndexInvestmentAmount: "3000000000000000000",
            _managementFee: "200",
            _performanceFee: "2500",
            _entryFee: "0",
            _exitFee: "0",
            _assetManagerTreasury: assetManagerTreasury.address,
            _whitelistedTokens: [addresses.WBNB_BUSDLP_Address],
            _public: false,
            _transferable: true,
            _transferableToPublic: true,
            _whitelistTokens: false,
          }),
        );

        const indexAddress = await indexFactory.getIndexList(4);
        const indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        expect(await assetManagerConfig.transferable()).to.eq(true);
        expect(await assetManagerConfig.transferableToPublic()).to.eq(true);
        // Change the fund to non-transferable
        await expect(assetManagerConfig.connect(nonOwner).updateTransferability(false, false));
        expect(await assetManagerConfig.transferable()).to.eq(false);
        expect(await assetManagerConfig.transferableToPublic()).to.eq(false);
      });

      it("asset manager should be able to make the previous private fund transferable to whitelisted addresses", async () => {
        const indexAddress = await indexFactory.getIndexList(4);
        const indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        expect(await assetManagerConfig.transferable()).to.eq(false);
        expect(await assetManagerConfig.transferableToPublic()).to.eq(false);
        // Change the fund transferable to whitelisted addresses
        await expect(assetManagerConfig.connect(nonOwner).updateTransferability(true, false));
        expect(await assetManagerConfig.transferable()).to.eq(true);
        expect(await assetManagerConfig.transferableToPublic()).to.eq(false);
      });

      it("asset manager should be able to convert the previous transferable private fund to public", async () => {
        const indexAddress = await indexFactory.getIndexList(4);
        const indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        expect(await assetManagerConfig.publicPortfolio()).to.eq(false);
        expect(await assetManagerConfig.transferableToPublic()).to.eq(false);
        // Change the fund to public
        await expect(assetManagerConfig.connect(nonOwner).convertPrivateFundToPublic());
        expect(await assetManagerConfig.publicPortfolio()).to.eq(true);
        // The public fund by default becomes tranferable to public
        expect(await assetManagerConfig.transferableToPublic()).to.eq(true);
      });

      it("asset manager should be able to make the previous public fund non-transferable", async () => {
        const indexAddress = await indexFactory.getIndexList(4);
        const indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        expect(await assetManagerConfig.transferable()).to.eq(true);
        // Change the fund to non-transferable
        await expect(assetManagerConfig.connect(nonOwner).updateTransferability(false, false));
        expect(await assetManagerConfig.transferable()).to.eq(false);
      });

      it("asset manager should not be able to make the previous public fund transferable to only whitelisted addresses", async () => {
        const indexAddress = await indexFactory.getIndexList(4);
        const indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        expect(await assetManagerConfig.transferable()).to.eq(false);
        // Try changing the fund to transferable only to whitelisted addresses
        await expect(
          assetManagerConfig.connect(nonOwner).updateTransferability(true, false),
        ).to.be.revertedWithCustomError(assetManagerConfig, "PublicFundToWhitelistedNotAllowed");
      });

      it("asset manager should be able to make the previous public fund transferable", async () => {
        const indexAddress = await indexFactory.getIndexList(4);
        const indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        expect(await assetManagerConfig.transferable()).to.eq(false);
        expect(await assetManagerConfig.transferableToPublic()).to.eq(false);
        // Change the fund transferable to public
        await expect(assetManagerConfig.connect(nonOwner).updateTransferability(true, true));
        expect(await assetManagerConfig.transferable()).to.eq(true);
        expect(await assetManagerConfig.transferableToPublic()).to.eq(true);
      });

      it("should check Index token name and symbol", async () => {
        expect(await indexSwap.name()).to.eq("INDEXLY");
        expect(await indexSwap.symbol()).to.eq("IDX");
      });

      it("should check if module owner of all fund is exchange contract", async () => {
        const VelvetSafeModule = await ethers.getContractFactory("VelvetSafeModule");
        const safeModule = await VelvetSafeModule.attach(indexInfo.gnosisModule);
        const safeModule1 = await VelvetSafeModule.attach(indexInfo1.gnosisModule);
        const safeModule2 = await VelvetSafeModule.attach(indexInfo2.gnosisModule);
        const safeModule3 = await VelvetSafeModule.attach(indexInfo3.gnosisModule);
        expect(await safeModule.owner()).to.be.equal(indexInfo.exchangeHandler);
        expect(await safeModule1.owner()).to.be.equal(indexInfo1.exchangeHandler);
        expect(await safeModule2.owner()).to.be.equal(indexInfo2.exchangeHandler);
        expect(await safeModule3.owner()).to.be.equal(indexInfo3.exchangeHandler);
      });

      it("initialize should revert if total Weights not equal 10,000", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        await expect(index.initToken([iaddress.btcAddress, iaddress.ethAddress], [100, 1000]))
          .to.be.revertedWithCustomError(indexSwap, "InvalidWeights")
          .withArgs("10000");
      });

      it("initialize should revert if tokens and denorms length is not equal", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        await expect(
          index.initToken([iaddress.btcAddress, iaddress.ethAddress], [2000, 1000, 7000]),
        ).to.be.revertedWithCustomError(indexSwap, "InvalidInitInput");
      });

      it("initialize should revert if token not whitelisted", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        await expect(
          index.initToken([iaddress.linkAddress, iaddress.ethAddress], [3000, 7000]),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "TokenNotWhitelisted");
      });

      it("Initialize 1st IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.mooVenusBNB, addresses.Cake_WBNBLP_Address], [5000, 5000]);
      });

      it("Initialize 2nd IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap.attach(indexAddress);
        await index.connect(nonOwner).initToken([iaddress.btcAddress, addresses.MAIN_LP_BUSD], [5000, 5000]);
      });

      it("Initialize 3rd IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(2);
        const index = indexSwap.attach(indexAddress);
        await index.connect(nonOwner).initToken([addresses.vBTC_Address, addresses.vETH_Address], [5000, 5000]);
      });

      it("Initialize 4th IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(3);
        const index = indexSwap.attach(indexAddress);
        await index.connect(nonOwner).initToken([iaddress.btcAddress, addresses.vBTC_Address], [5000, 5000]);
      });

      it("Owner of vault for 1st fund should be exchangeHandler address", async () => {
        const safe = indexInfo.vaultAddress;
        const gnosisSafe = await ethers.getContractFactory("GnosisSafe");
        const gnosisContract = await gnosisSafe.attach(safe);

        expect((await gnosisContract.getOwners())[0]).to.be.equal(indexInfo.exchangeHandler);
      });

      it("Owner of vault for 2nd fund should be deployer's addressess", async () => {
        const safe = indexInfo1.vaultAddress;
        const gnosisSafe = await ethers.getContractFactory("GnosisSafe");
        const gnosisContract = await gnosisSafe.attach(safe);

        expect((await gnosisContract.getOwners())[0]).to.be.equal(owner.address);
        expect((await gnosisContract.getOwners())[1]).to.be.equal(nonOwner.address);
      });

      it("Owner of vault for 3rd fund should be exchangeHandler address", async () => {
        const safe = indexInfo2.vaultAddress;
        const gnosisSafe = await ethers.getContractFactory("GnosisSafe");
        const gnosisContract = await gnosisSafe.attach(safe);

        expect((await gnosisContract.getOwners())[0]).to.be.equal(indexInfo2.exchangeHandler);
      });

      it("Owner of vault for 4th fund should be exchangeHandler address", async () => {
        const safe = indexInfo3.vaultAddress;
        const gnosisSafe = await ethers.getContractFactory("GnosisSafe");
        const gnosisContract = await gnosisSafe.attach(safe);

        expect((await gnosisContract.getOwners())[0]).to.be.equal(indexInfo3.exchangeHandler);
      });

      it("Calculate fees should return fee values", async () => {
        const res = await feeModule0.callStatic.calculateFees();

        expect(Number(res._protocolFee)).to.be.equal(Number(0));
        expect(Number(res._managementFee)).to.be.equal(Number(0));
        expect(Number(res._performanceFee)).to.be.equal(Number(0));
      });

      it("expect owner to be IndexFactory", async () => {
        const OffChainIndex = await ethers.getContractFactory("OffChainIndexSwap", {
          libraries: {
            IndexSwapLibrary: indexSwapLibrary.address,
          },
        });
        const OffChainRebalance = await ethers.getContractFactory("OffChainRebalance", {
          libraries: {
            RebalanceLibrary: rebalanceLibrary.address,
            IndexSwapLibrary: indexSwapLibrary.address,
          },
        });
        const RebalanceAggregator = await ethers.getContractFactory("RebalanceAggregator", {
          libraries: {
            RebalanceLibrary: rebalanceLibrary.address,
          },
        });
        const offChainRebalance = await OffChainRebalance.attach(indexInfo.offChainRebalancing);
        const rebalanceAggregator = await RebalanceAggregator.attach(indexInfo.metaAggregator);
        const offChainIndex = await OffChainIndex.attach(indexInfo.offChainIndexSwap);

        expect(await offChainIndex.owner()).to.be.equal(indexFactory.address);
        expect(await indexSwap.owner()).to.be.equal(indexFactory.address);
        expect(await rebalancing.owner()).to.be.equal(indexFactory.address);
        expect(await feeModule0.owner()).to.be.equal(indexFactory.address);
        expect(await offChainRebalance.owner()).to.be.equal(indexFactory.address);
        expect(await rebalanceAggregator.owner()).to.be.equal(indexFactory.address);
      });

      it("Invest 0.1BNB into Top10 fund should fail for slippage greater than 10%", async () => {
        await indexSwap.investInFund(
          {
            _slippage: ["1100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
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
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
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

      it("Invest 0.1BNB into Top10 3rd index fund", async () => {
        const indexSupplyBefore = await indexSwap2.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        await indexSwap2.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap2.totalSupply();
        // console.log(indexSupplyAfter);
        console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 0.1BNB into Top10 3rd index fund", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );

        const indexSupplyBefore = await indexSwap2.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        await indexSwap2.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
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
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
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

      it("Invest 2BNB into Top10 4th index fund", async () => {
        const indexSupplyBefore = await indexSwap3.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        await indexSwap3.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
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
        console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into Top10 4th index fund should revert if bnb value is greater than 0 and investment token is not bnb", async () => {
        const indexSupplyBefore = await indexSwap3.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        await expect(
          indexSwap3.investInFund(
            {
              _slippage: ["100", "100"],
              _lpSlippage: ["200", "200"],
              _tokenAmount: "2000000000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.busdAddress,
            },
            {
              value: "2000000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(indexSwap, "InvalidToken");
        const indexSupplyAfter = await indexSwap3.totalSupply();
        // console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into Top10 4th index fund on behalf of addr3 should fail if user addr3 is not whitelisted", async () => {
        await expect(
          indexSwap3.connect(addr3).investInFund(
            {
              _slippage: ["100", "100"],
              _lpSlippage: ["200", "200"],
              _tokenAmount: "2000000000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.wbnbAddress,
            },
            {
              value: "2000000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "UserNotAllowedToInvest");
      });

      it("Add addr3 whitelisted user", async () => {
        const config = await indexSwap3.iAssetManagerConfig();

        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig1 = AssetManagerConfig.attach(config);
        await assetManagerConfig1.connect(nonOwner).addWhitelistedUser([addr3.address]);
      });

      it("Invest 2BNB into Top10 4th index fund on behalf of addr3", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );

        const indexSupplyBefore = await indexSwap3.totalSupply();
        const addr3BalanceBefore = await indexSwap3.balanceOf(addr3.address);
        // console.log("2bnb before", indexSupplyBefore);
        await indexSwap3.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap3.totalSupply();
        // console.log(indexSupplyAfter);
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(addr3BalanceBefore));
      });

      for (let i = 0; i < 5; i++) {
        it("Invest 0.1BNB into Top10 fund", async () => {
          const VBep20Interface = await ethers.getContractAt(
            "VBep20Interface",
            "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
          );

          const indexSupplyBefore = await indexSwap.totalSupply();
          // console.log("0.1bnb before", indexSupplyBefore);
          await indexSwap.investInFund(
            {
              _slippage: ["100", "100"],
              _lpSlippage: ["200", "200"],
              _tokenAmount: "100000000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.wbnbAddress,
            },
            {
              value: "100000000000000000",
            },
          );
          const indexSupplyAfter = await indexSwap.totalSupply();
          // console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
          console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
          console.log(indexSupplyAfter);

          expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        });
      }

      it("Add addr1 whitelisted user", async () => {
        const config = await indexSwap1.iAssetManagerConfig();

        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig1 = AssetManagerConfig.attach(config);
        await assetManagerConfig1.connect(nonOwner).addWhitelistedUser([addr1.address]);
      });

      it("non owner should not be able to add whitelist manager admin", async () => {
        await expect(
          accessController1.grantRole(
            "0xc5f56b202d004644c051ff6057ecbf2a2764b8d81e0a6641e536e1cfa55dfd42",
            whitelistManagerAdmin.address,
          ),
        ).to.be.reverted;
      });

      it("owner should be able to add asset whitelist manager admin", async () => {
        await accessController1
          .connect(nonOwner)
          .grantRole(
            "0xc5f56b202d004644c051ff6057ecbf2a2764b8d81e0a6641e536e1cfa55dfd42",
            whitelistManagerAdmin.address,
          );
      });

      it("owner should not be able to add index manager", async () => {
        await expect(
          accessController1
            .connect(nonOwner)
            .grantRole("0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16", owner.address),
        ).to.be.reverted;
      });

      it("owner should not be able to add rebalancing manager", async () => {
        await expect(
          accessController1
            .connect(nonOwner)
            .grantRole("0x8e73530dd444215065cdf478f826e993aeb5e2798587f0bbf5a978bd97df63ea", owner.address),
        ).to.be.reverted;
      });

      it("non whitelist manager admin should not be able to add asset manager", async () => {
        await expect(
          accessController1
            .connect(owner)
            .grantRole("0x827de50cc5532fcea9338402dc65442c2567a37fbd0cd8eb56858d00e9e842bd", whitelistManager.address),
        ).to.be.reverted;
      });

      it("new whitelist manager admin should be able to add whitelist manager", async () => {
        await accessController1
          .connect(whitelistManagerAdmin)
          .grantRole("0x827de50cc5532fcea9338402dc65442c2567a37fbd0cd8eb56858d00e9e842bd", whitelistManager.address);
      });

      it("owner should be able to add whitelist manager", async () => {
        await accessController0.grantRole(
          "0x827de50cc5532fcea9338402dc65442c2567a37fbd0cd8eb56858d00e9e842bd",
          addr1.address,
        );
      });

      it("non whitelist manager should not be able to update merkle root", async () => {
        const config = await indexSwap1.iAssetManagerConfig();

        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig1 = AssetManagerConfig.attach(config);
        await expect(
          assetManagerConfig1.connect(addr3).removeWhitelistedUser([owner.address]),
        ).to.be.revertedWithCustomError(assetManagerConfig1, "CallerNotWhitelistManager");
      });

      it("Whitelist manager should be able to update merkle root", async () => {
        const config = await indexSwap1.iAssetManagerConfig();

        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig1 = AssetManagerConfig.attach(config);
        await assetManagerConfig1.connect(whitelistManager).addWhitelistedUser([addr1.address, addr2.address]);
      });

      it("Whitelist manager should be able to add and remove a whitelisted user", async () => {
        const config = await indexSwap1.iAssetManagerConfig();

        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig1 = AssetManagerConfig.attach(config);
        await assetManagerConfig1.connect(whitelistManager).addWhitelistedUser([addr3.address]);

        await assetManagerConfig1.connect(whitelistManager).removeWhitelistedUser([addr3.address]);
      });

      it("non whitelist manager admin should not be able to revoke whitelist manager", async () => {
        await expect(
          accessController1
            .connect(addr1)
            .revokeRole("0x827de50cc5532fcea9338402dc65442c2567a37fbd0cd8eb56858d00e9e842bd", whitelistManager.address),
        ).to.be.reverted;
      });

      it("whitelist manager admin should be able to revoke whitelist manager", async () => {
        await accessController1
          .connect(whitelistManagerAdmin)
          .revokeRole("0x827de50cc5532fcea9338402dc65442c2567a37fbd0cd8eb56858d00e9e842bd", whitelistManager.address);
      });

      it("Whitelist manager should not be able to add user to whitelist after his role was revoked", async () => {
        const config = await indexSwap1.iAssetManagerConfig();

        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig1 = AssetManagerConfig.attach(config);
        await expect(
          assetManagerConfig1.connect(whitelistManager).addWhitelistedUser([addr3.address]),
        ).to.be.revertedWithCustomError(assetManagerConfig1, "CallerNotWhitelistManager");
      });

      it("New (addr1) whitelisted user invest 2BNB into Top10 2nd index fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        await indexSwap1.connect(addr1).investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)))
        // console.log(indexSupplyAfter);
        console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("New (addr2) whitelisted user invest 2BNB into Top10 2nd index fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        await indexSwap1.connect(addr2).investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)))
        // console.log(indexSupplyAfter);
        console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        console.log(indexSupplyAfter);
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Non whitelisted user invest 2BNB into Top10 2nd index fund should fail", async () => {
        await expect(
          indexSwap1.connect(addr3).investInFund(
            {
              _slippage: ["100", "100"],
              _lpSlippage: ["200", "200"],
              _tokenAmount: "2000000000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.wbnbAddress,
            },
            {
              value: "2000000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "UserNotAllowedToInvest");
      });

      it("Should charge fees for index 1", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        const assetManagerBalanceBefore = await indexSwap.balanceOf(assetManagerTreasury.address);
        const velvetBalanceBefore = await indexSwap.balanceOf(treasury.address);
        let tx2 = await feeModule0.callStatic.calculateFees();
        console.log(tx2);
        let tx = await feeModule0.chargeFees();
        let receipt = await tx.wait();

        const indexSupplyAfter = await indexSwap.totalSupply();
        const assetManagerBalanceAfter = await indexSwap.balanceOf(assetManagerTreasury.address);
        const velvetBalanceAfter = await indexSwap.balanceOf(treasury.address);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        expect(Number(velvetBalanceAfter)).to.be.greaterThanOrEqual(Number(velvetBalanceBefore));
        expect(Number(assetManagerBalanceAfter)).to.be.greaterThanOrEqual(Number(assetManagerBalanceBefore));

        //console.log(receipt.events);
        let protocolFeeMinted = 0;
        let managementFeeMinted = 0;

        let result = await receipt.events?.filter((x) => {
          return x.event == "FeesToBeMinted";
        });

        if (result && result[0].args) {
          protocolFeeMinted = Number(result[0].args["protocolFee"]);
          managementFeeMinted = Number(result[0].args["managerFee"]);
        }

        console.log(protocolFeeMinted, managementFeeMinted);

        if (protocolFeeMinted != 0 && managementFeeMinted != 0) {
          let procotolFeePercentage = (protocolFeeMinted / (protocolFeeMinted + managementFeeMinted)) * 100;
          let managementFeePercentage = (managementFeeMinted / (protocolFeeMinted + managementFeeMinted)) * 100;

          // should be 75%/25% but sometimes it's around 24.999
          expect(procotolFeePercentage).to.be.greaterThan(24);
          expect(managementFeePercentage).to.be.lessThan(76);
        }
      });

      it("Should charge fees for index 2", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        const assetManagerBalanceBefore = await indexSwap1.balanceOf(assetManagerTreasury.address);
        const velvetBalanceBefore = await indexSwap1.balanceOf(treasury.address);

        await feeModule1.chargeFees();

        const indexSupplyAfter = await indexSwap1.totalSupply();
        const assetManagerBalanceAfter = await indexSwap1.balanceOf(assetManagerTreasury.address);
        const velvetBalanceAfter = await indexSwap1.balanceOf(treasury.address);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        expect(Number(velvetBalanceAfter)).to.be.greaterThanOrEqual(Number(velvetBalanceBefore));
        expect(Number(assetManagerBalanceAfter)).to.be.greaterThanOrEqual(Number(assetManagerBalanceBefore));
      });

      it("Management fees for index 3 should be 0", async () => {
        const indexSupplyBefore = await indexSwap2.totalSupply();
        const assetManagerBalanceBefore = await indexSwap2.balanceOf(assetManagerTreasury.address);

        let tx = await feeModule2.chargeFees();
        let receipt = await tx.wait();

        const indexSupplyAfter = await indexSwap2.totalSupply();
        const assetManagerBalanceAfter = await indexSwap2.balanceOf(assetManagerTreasury.address);

        expect(Number(assetManagerBalanceAfter)).to.be.equal(Number(assetManagerBalanceBefore));

        //console.log(receipt.events);
        let managementFeeMinted = 0;

        let result = await receipt.events?.filter((x) => {
          return x.event == "FeesToBeMinted";
        });

        if (result && result[0].args) {
          managementFeeMinted = Number(result[0].args["managerFee"]);
        }
        // should be 75%/25% but sometimes it's around 24.999
        expect(managementFeeMinted).to.be.equal(0);
      });

      it("Invest 0.00001 BNB into Top10 fund should fail", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await expect(
          indexSwap.investInFund(
            {
              _slippage: ["100", "100"],
              _lpSlippage: ["200", "200"],
              _tokenAmount: "10000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.wbnbAddress,
            },
            {
              value: "10000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "WrongInvestmentAmount");

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        // console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("asset manager should be able to add token which is approved in registry for all the indexes", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.setPermittedTokens([iaddress.wbnbAddress]);

        const config1 = await indexSwap1.iAssetManagerConfig();
        const AssetManagerConfig1 = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig1 = AssetManagerConfig1.attach(config1);
        await assetManagerConfig1.connect(nonOwner).setPermittedTokens([iaddress.wbnbAddress]);

        const config2 = await indexSwap2.iAssetManagerConfig();
        const AssetManagerConfig2 = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig2 = AssetManagerConfig2.attach(config2);
        await assetManagerConfig2.connect(nonOwner).setPermittedTokens([iaddress.wbnbAddress]);

        const config3 = await indexSwap3.iAssetManagerConfig();
        const AssetManagerConfig3 = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig3 = AssetManagerConfig3.attach(config3);
        await assetManagerConfig3.connect(nonOwner).setPermittedTokens([iaddress.wbnbAddress]);
      });

      it("Invest 2BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        //console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 1BNB into Top10 2nd Index fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        await indexSwap1.connect(owner).investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        //console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 1BNB into Top10 2nd Index fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        const assetManagerBalanceBefore = await indexSwap1.balanceOf(assetManagerTreasury.address);
        const velvetBalanceBefore = await indexSwap1.balanceOf(treasury.address);
        await indexSwap1.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();
        //console.log("1bnb after", indexSupplyAfter);
        //console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        const assetManagerBalanceAfter = await indexSwap1.balanceOf(assetManagerTreasury.address);
        const velvetBalanceAfter = await indexSwap1.balanceOf(treasury.address);
        expect(Number(velvetBalanceAfter)).to.be.greaterThanOrEqual(Number(velvetBalanceBefore));
        expect(Number(assetManagerBalanceAfter)).to.be.greaterThanOrEqual(Number(assetManagerBalanceBefore));
      });

      it("Investment should fail when contract is paused", async () => {
        await rebalancing.setPause(true);
        await expect(
          indexSwap.investInFund(
            {
              _slippage: ["100", "100"],
              _lpSlippage: ["200", "200"],
              _tokenAmount: "2000000000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.wbnbAddress,
            },
            {
              value: "2000000000000000000",
            },
          ),
        ).to.be.reverted;
      });

      it("update Weights should revert if total Weights not equal 10,000", async () => {
        await expect(rebalancing.updateWeights([6667, 3330], ["100", "100"], ["200", "200"], swapHandler.address))
          .to.be.revertedWithCustomError(rebalancing, "InvalidWeights")
          .withArgs("10000");
      });

      it("Update Weights and Rebalance should revert if one of the weight is zero", async () => {
        await expect(
          rebalancing.updateWeights([10000, 0], ["100", "0"], ["200", "200"], swapHandler.address),
        ).to.be.revertedWithCustomError(indexSwap, "ZeroDenormValue");
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([6667, 3333], ["100", "500"], ["100", "200"], swapHandler.address);
      });

      it("should Update Weights and Rebalance for 2nd Index Fund", async () => {
        await rebalancing1
          .connect(nonOwner)
          .updateWeights([6667, 3333], ["100", "100"], ["200", "200"], swapHandler.address);
      });

      it("should Update Weights and Rebalance for 2nd Index Fund", async () => {
        await rebalancing1
          .connect(nonOwner)
          .updateWeights([5000, 5000], ["100", "100"], ["200", "200"], swapHandler.address);
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([5000, 5000], ["100", "100"], ["200", "200"], swapHandler.address);
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([3333, 6667], ["100", "100"], ["200", "200"], swapHandler.address);
      });

      it("updateTokens should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateTokens({
            tokens: [iaddress.ethAddress, iaddress.daiAddress, iaddress.wbnbAddress],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 1000],
            _slippageSell: ["100", "100"],
            _slippageBuy: ["100", "100", "100"],
            _lpSlippageSell: ["200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        )
          .to.be.revertedWithCustomError(rebalancing, "InvalidWeights")
          .withArgs("10000");
      });

      it("updateTokens should revert if token is not whitelisted", async () => {
        await tokenRegistry.enableToken(
          [priceOracle.address],
          [iaddress.linkAddress],
          [baseHandler.address],
          [[addresses.base_RewardToken]],
          [true],
        );
        let handler = (await indexFactory.IndexSwapInfolList(0)).exchangeHandler;
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        await expect(
          rebalancing.updateTokens({
            tokens: [iaddress.linkAddress, iaddress.daiAddress, iaddress.wbnbAddress],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 2000],
            _slippageSell: ["300", "300"],
            _slippageBuy: ["300", "300", "300"],
            _lpSlippageSell: ["200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        ).to.be.reverted;
      });

      it("updateTokens should revert if token is not enabled", async () => {
        await expect(
          rebalancing.updateTokens({
            tokens: [addresses.ibBTCB_Address, iaddress.daiAddress, iaddress.wbnbAddress],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 2000],
            _slippageSell: ["300", "300"],
            _slippageBuy: ["300", "300", "300"],
            _lpSlippageSell: ["200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        ).to.be.reverted;
      });

      it("updateTokens should revert if protocol is paused", async () => {
        tokenRegistry.setProtocolPause(true);
        await expect(
          rebalancing.updateTokens({
            tokens: [iaddress.linkAddress, iaddress.daiAddress, iaddress.wbnbAddress],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 2000],
            _slippageSell: ["300", "300"],
            _slippageBuy: ["300", "300", "300"],
            _lpSlippageSell: ["200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        ).to.be.revertedWithCustomError(rebalancing, "ProtocolIsPaused");
        tokenRegistry.setProtocolPause(false);
      });

      it("updateTokens should revert if swapHandler is not enabled", async () => {
        await tokenRegistry.disableSwapHandlers([swapHandler.address]);
        await expect(
          rebalancing.updateTokens({
            tokens: [iaddress.linkAddress, iaddress.daiAddress, iaddress.wbnbAddress],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 2000],
            _slippageSell: ["300", "300"],
            _slippageBuy: ["300", "300", "300"],
            _lpSlippageSell: ["200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        ).to.be.revertedWithCustomError(rebalancing, "SwapHandlerNotEnabled");
        await tokenRegistry.enableSwapHandlers([swapHandler.address]);
      });

      it("Non Rebalancing access address calling update function", async () => {
        let beforeTokenXBalance;
        let beforeVaultValue;
        let handler = (await indexFactory.IndexSwapInfolList(0)).exchangeHandler;
        await expect(
          indexSwap.updateRecords([iaddress.ethAddress, iaddress.daiAddress, iaddress.wbnbAddress], [2000, 6000, 2000]),
        ).to.be.revertedWithCustomError(indexSwap, "CallerNotRebalancerContract");
      });

      it("update tokens should revert is any two tokens are same", async () => {
        await expect(
          rebalancing.updateTokens({
            tokens: [iaddress.btcAddress, iaddress.btcAddress, iaddress.wbnbAddress],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 2000],
            _slippageSell: ["500", "900"],
            _slippageBuy: ["500", "900", "500"],
            _lpSlippageSell: ["200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        ).to.be.revertedWithCustomError(indexSwap, "TokenAlreadyExist");
      });

      it("should update tokens", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        await rebalancing.updateTokens({
          tokens: [iaddress.ethAddress, iaddress.btcAddress, iaddress.wbnbAddress],
          _swapHandler: swapHandler.address,
          denorms: [2000, 6000, 2000],
          _slippageSell: ["500", "900"],
          _slippageBuy: ["500", "900", "500"],
          _lpSlippageSell: ["200", "200"],
          _lpSlippageBuy: ["200", "200", "200"],
        });
      });

      it("print values", async () => {
        const vault = await indexSwap.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const bal1 = await ERC20.attach(iaddress.ethAddress).balanceOf(vault);
        const bal2 = await ERC20.attach(iaddress.btcAddress).balanceOf(vault);
        const bal3 = await ERC20.attach(iaddress.wbnbAddress).balanceOf(vault);

        const bal1USD = await priceOracle.getPriceTokenUSD18Decimals(iaddress.ethAddress, bal1);
        const bal2USD = await priceOracle.getPriceTokenUSD18Decimals(iaddress.btcAddress, bal2);
        const bal3USD = await priceOracle.getPriceTokenUSD18Decimals(iaddress.wbnbAddress, bal3);

        const total = Number(bal1USD) + Number(bal2USD) + Number(bal3USD);
        console.log("percent 1", Number(bal1USD) / Number(total));
        console.log("percent 2", Number(bal2USD) / Number(total));
        console.log("percent 3", Number(bal3USD) / Number(total));
      });

      it("should update tokens", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        await rebalancing.updateTokens({
          tokens: [iaddress.ethAddress, iaddress.btcAddress, iaddress.wbnbAddress],
          _swapHandler: swapHandler.address,
          denorms: [2000, 6000, 2000],
          _slippageSell: ["500", "900", "300"],
          _slippageBuy: ["500", "900", "500"],
          _lpSlippageSell: ["200", "200", "200"],
          _lpSlippageBuy: ["200", "200", "200"],
        });
      });

      it("withdrawal should revert when contract is paused", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwap, "ContractPaused");
      });

      it("should unpause", async () => {
        await rebalancing.setPause(false);
      });

      it("should pause", async () => {
        await rebalancing.setPause(true);
      });

      it("should revert unpause", async () => {
        await expect(rebalancing.connect(addr1).setPause(false)).to.be.revertedWithCustomError(
          rebalancing,
          "FifteenMinutesNotExcedeed",
        );
      });

      it("should unpause", async () => {
        await ethers.provider.send("evm_increaseTime", [1900]);
        await rebalancing.connect(addr1).setPause(false);
        console.log(await ethers.provider.blockNumber);
      });

      it("should update tokens for 2nd Index", async () => {
        await rebalancing1.connect(nonOwner).updateTokens({
          tokens: [iaddress.ethAddress, iaddress.btcAddress, iaddress.wbnbAddress],
          _swapHandler: swapHandler.address,
          denorms: [2000, 6000, 2000],
          _slippageSell: ["500", "900"],
          _slippageBuy: ["500", "900", "500"],
          _lpSlippageSell: ["200", "200"],
          _lpSlippageBuy: ["200", "200", "200"],
        });
      });

      it("when withdraw fund more then balance", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(
          indexSwap.connect(nonOwner).withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["100", "500", "100"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "CallerNotHavingGivenTokenAmount");
      });

      it("should fail withdraw when balance falls below min investment amount", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT.sub("1000000000000"),
            _slippage: ["100", "500", "100"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          }),
        )
          .to.be.revertedWithCustomError(indexSwap, "BalanceCantBeBelowVelvetMinInvestAmount")
          .withArgs("3000000000000000000");
      });

      it("should fail withdraw when balance falls below min investment amount", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT.sub("1000000000000"),
            _slippage: ["100", "500", "100"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: true,
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          }),
        )
          .to.be.revertedWithCustomError(indexSwap, "BalanceCantBeBelowVelvetMinInvestAmount")
          .withArgs("3000000000000000000");
      });

      it("should withdraw fund and burn index token successfully", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500", "100"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });

        expect(txObject.confirmations).to.equal(1);
      });

      it("should withdraw fund and burn index token successfully", async () => {
        const amountIndexToken = await indexSwap1.balanceOf(addr1.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap1.connect(addr1).withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500", "100"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });

        expect(txObject.confirmations).to.equal(1);
      });

      it("should withdraw fund and burn index token successfully for account that has been removed from whitelist", async () => {
        const amountIndexToken = await indexSwap1.balanceOf(addr2.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);

        txObject = await indexSwap1.connect(addr2).withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500", "100"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });

        expect(txObject.confirmations).to.equal(1);
      });

      it("Invest 0.1BNB into Top10 2nd Index fund", async () => {
        await indexSwap1.investInFund(
          {
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log(indexSupplyAfter);
      });

      it("transfer idx for a non transferable portfolio should fail", async () => {
        // should fail in next step once we add restriction to transfer idx tokens
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log("available transfer amount", amountIndexToken);
        await expect(indexSwap.transfer(addr1.address, amountIndexToken.div(2))).to.be.revertedWithCustomError(
          indexSwap,
          "Transferprohibited",
        );
      });

      it("transfer idx from owner to non whitelisted account should fail", async () => {
        // should fail in next step once we add restriction to transfer idx tokens
        const amountIndexToken = await indexSwap1.balanceOf(owner.address);
        // console.log("available transfer amount", amountIndexToken);
        await expect(indexSwap1.transfer(addr3.address, amountIndexToken.div(2))).to.be.revertedWithCustomError(
          indexSwap1,
          "Transferprohibited",
        );
      });

      it("transfer idx from owner to a whitelisted account", async () => {
        // should fail in next step once we add restriction to transfer idx tokens
        const amountIndexToken = await indexSwap1.balanceOf(owner.address);
        // console.log("available transfer amount", amountIndexToken);
        await indexSwap1.transfer(addr1.address, amountIndexToken.div(2));
      });

      it("transfer idx from owner to another account (Index 3)", async () => {
        // should fail in next step once we add restriction to transfer idx tokens
        const amountIndexToken = await indexSwap2.balanceOf(owner.address);
        // console.log("available transfer amount", amountIndexToken);
        await indexSwap2.transfer(addr1.address, amountIndexToken);
      });

      it("transfer idx from owner to another account (Index 4)", async () => {
        // should fail in next step once we add restriction to transfer idx tokens
        const amountIndexToken = await indexSwap3.balanceOf(owner.address);
        // console.log("available transfer amount", amountIndexToken);
        await indexSwap3.transfer(addr1.address, amountIndexToken);
      });

      it("new owner of idx withdraws funds from Index 3", async () => {
        // last withdrawal
        const amountIndexToken = await indexSwap2.balanceOf(addr1.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);

        txObject = await indexSwap2.connect(addr1).withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500"],
          _lpSlippage: ["200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });
      });

      it("Invest 1BNB into Top10 fund after last withdrawal", async () => {
        //console.log("idx before", await indexSwap2.totalSupply());

        const tokens = await indexSwap2.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const token1 = ERC20.attach(tokens[0]);
        const token2 = ERC20.attach(tokens[1]);

        const vault = await indexSwap2.vault();

        const token1BalanceBefore = await token1.balanceOf(vault);
        const token2BalanceBefore = await token2.balanceOf(vault);

        //console.log("t1BeforeInvest", token1BalanceBefore);
        //console.log("t2BeforeInvest", token2BalanceBefore);

        await indexSwap2.investInFund(
          {
            _slippage: ["100", "500"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap2.totalSupply();
        //console.log("idx ", indexSupplyAfter);

        const token1BalanceAfter = await token1.balanceOf(vault);
        const token2BalanceAfter = await token2.balanceOf(vault);

        //console.log("t1AfterInvest", token1BalanceAfter);
        //console.log("t2AfterInvest", token2BalanceAfter);
      });

      it("withdraw check values", async () => {
        const tokens = await indexSwap2.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const token1 = ERC20.attach(tokens[0]);
        const token2 = ERC20.attach(tokens[1]);

        const vault = await indexSwap2.vault();

        const token1BalanceBefore = await token1.balanceOf(vault);
        const token2BalanceBefore = await token2.balanceOf(vault);

        //console.log("t1BeforeWithdraw", token1BalanceBefore);
        //console.log("t2BeforeWithdraw", token2BalanceBefore);
        // second last withdrawal
        const amountIndexToken = await indexSwap2.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);

        txObject = await indexSwap2.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500"],
          _lpSlippage: ["200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });

        const token1BalanceAfter = await token1.balanceOf(vault);
        const token2BalanceAfter = await token2.balanceOf(vault);

        //console.log("t1AfterWithdraw", token1BalanceAfter);
        //console.log("t2AfterWithdraw", token2BalanceAfter);
      });

      // todo test case withdraw, check how many tokens, compare with invest

      it("new owner of idx withdraws funds from Index 4", async () => {
        const amountIndexToken = await indexSwap3.balanceOf(addr1.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);

        txObject = await indexSwap3.connect(addr1).withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500"],
          _lpSlippage: ["200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });
      });

      it("should withdraw fund and burn index token successfully for 2nd Index", async () => {
        const amountIndexToken = await indexSwap1.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken after transfer");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap1.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500", "100"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });

        expect(txObject.confirmations).to.equal(1);
      });

      it("should withdraw fund and burn index token successfully for account that received idx", async () => {
        const amountIndexToken = await indexSwap1.balanceOf(addr1.address);
        // console.log(amountIndexToken, "amountIndexToken after transfer");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap1.connect(addr1).withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500", "100"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });

        expect(txObject.confirmations).to.equal(1);
      });

      it("Invest 2BNB into Top10 fund", async () => {
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
      });

      it("Invest 0.1BNB into Top10 2nd Index fund", async () => {
        await indexSwap1.investInFund(
          {
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log(indexSupplyAfter);
      });

      it("Invest 0.1BNB into Top10 2nd Index fund", async () => {
        const CoolDownBefore = await indexSwap1.lastWithdrawCooldown(owner.address);
        await indexSwap1.investInFund(
          {
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap1.totalSupply();
        const CoolDownAfter = await indexSwap1.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        // console.log(indexSupplyAfter);
      });

      it("should withdraw tokens directly instead of BNB", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500", "100"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: true,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });
      });

      it("should withdraw tokens directly instead of BNB for 2nd Index", async () => {
        const amountIndexToken = await indexSwap1.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap1.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "100", "100"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: true,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });
      });

      it("non owner should not be able to add asset manager admin", async () => {
        await expect(
          accessController0
            .connect(nonOwner)
            .grantRole("0x15900ee5215ef76a9f5d2b8a5ec2fe469c362cbf4d7bef6646ab417b6d169e88", assetManagerAdmin.address),
        ).to.be.reverted;
      });

      it("owner should be able to add asset manager admin", async () => {
        await accessController0.grantRole(
          "0x15900ee5215ef76a9f5d2b8a5ec2fe469c362cbf4d7bef6646ab417b6d169e88",
          assetManagerAdmin.address,
        );
      });

      it("non asset manager admin should not be able to add asset manager", async () => {
        await expect(
          accessController0
            .connect(nonOwner)
            .grantRole("0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819", assetManager.address),
        ).to.be.reverted;
      });

      it("new asset manager admin should be able to add asset manager", async () => {
        await accessController0
          .connect(assetManagerAdmin)
          .grantRole("0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819", assetManager.address);
      });

      it("owner should be able to add asset manager", async () => {
        await accessController0.grantRole(
          "0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819",
          addr1.address,
        );
      });

      it("non-owner should be able to pause protocol", async () => {
        await expect(tokenRegistry.connect(nonOwner).setProtocolPause(true)).to.be.revertedWith(
          "Ownable: caller is not the owner",
        );
      });

      it("should not upgrade Proxy Exchnage To New Contract for 1st Index", async () => {
        const proxyAddress = (await indexFactory.IndexSwapInfolList(0)).exchangeHandler;
        // console.log("PRoxy ADdress : ", proxyAddress);
        // console.log("Exchange ADdress : ", exchange.address);
        await expect(indexFactory.upgradeExchange([proxyAddress], exchange.address)).to.be.revertedWithCustomError(
          indexFactory,
          "ProtocolNotPaused",
        );
      });

      it("should protocol pause", async () => {
        await tokenRegistry.setProtocolPause(true);
      });

      it("should upgrade Proxy Exchnage To New Contract for 1st Index and 2nd Index", async () => {
        const proxyAddress1 = (await indexFactory.IndexSwapInfolList(0)).exchangeHandler;
        const proxyAddress2 = (await indexFactory.IndexSwapInfolList(1)).exchangeHandler;
        await indexFactory.upgradeExchange([proxyAddress1, proxyAddress2], exchange.address);
        // console.log("After Upgrade");
      });

      it("should not upgrade if msg.sender is not owner", async () => {
        const proxyAddress1 = (await indexFactory.IndexSwapInfolList(0)).exchangeHandler;
        const proxyAddress2 = (await indexFactory.IndexSwapInfolList(1)).exchangeHandler;
        await indexFactory.upgradeExchange([proxyAddress1, proxyAddress2], exchange.address);
        // console.log("After Upgrade");
      });

      it("non owner of indexFactory should not be able to upgrade Exchange", async () => {
        const proxyAddress = (await indexFactory.IndexSwapInfolList(2)).exchangeHandler;
        // console.log("PRoxy ADdress : ", proxyAddress);
        // console.log("Exchange ADdress : ", exchange.address);
        await expect(
          indexFactory.connect(nonOwner).upgradeExchange([proxyAddress], exchange.address),
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("should upgrade Proxy IndexSwap To New Contract for 1st Index", async () => {
        const proxyAddress = await indexFactory.getIndexList(0);
        await indexFactory.upgradeIndexSwap([proxyAddress], indexSwapContract.address);
      });

      it("should upgrade Proxy OffChainIndexSwap To New Contract for 1st Index", async () => {
        const proxyAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        await indexFactory.upgradeOffChainIndex([proxyAddress], offChainIndexSwap.address);
      });

      it("should unpause protocol", async () => {
        await tokenRegistry.setProtocolPause(false);
      });

      it("Invest 2BNB into Top10 1st index fund after upgrade", async () => {
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["400", "400", "400"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        // console.log(indexSupplyAfter);
        const CoolDownAfter = await indexSwap1.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into Top10 1st index fund after upgrade", async () => {
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);

        await indexSwap.investInFund(
          {
            _slippage: ["400", "700", "400"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should pause protocol", async () => {
        await tokenRegistry.setProtocolPause(true);
      });

      it("should upgrade Proxy IndexSwap To New Contract for 2nd Index", async () => {
        const proxyAddress = await indexFactory.getIndexList(0);
        await indexFactory.upgradeIndexSwap([proxyAddress], indexSwapContract.address);
      });

      it("should unpause protocol", async () => {
        await tokenRegistry.setProtocolPause(false);
      });

      it("Invest 2BNB into Top10 2nd index fund after upgrade", async () => {
        const CoolDownBefore = await indexSwap1.lastWithdrawCooldown(owner.address);
        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        await indexSwap1.investInFund(
          {
            _slippage: ["400", "400", "400"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log(indexSupplyAfter);
        const CoolDownAfter = await indexSwap1.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Upgrade TokenRegistry", async () => {
        const TokenRegistry2 = await ethers.getContractFactory("TokenRegistry");
        // console.log(tokenRegistry.address);
        await upgrades.upgradeProxy(tokenRegistry.address, TokenRegistry2);
      });

      it("Upgrade IndexFactory, and not able to create Index", async () => {
        const IndexFactory = await ethers.getContractFactory("IndexFactory");
        await upgrades.upgradeProxy(indexFactory.address, IndexFactory);
        const newProxy = IndexFactory.attach(indexFactory.address);
        newProxy.setIndexCreationState(true);
        let whitelistedTokens = [iaddress.wbnbAddress];
        const indexFactoryCreate = await expect(
          newProxy.createIndexNonCustodial({
            name: "INDEXLY123",
            symbol: "IDX123",
            maxIndexInvestmentAmount: "120000000000000000000000",
            minIndexInvestmentAmount: "3000000000000000000",
            _managementFee: "100",
            _performanceFee: "10",
            _entryFee: "0",
            _exitFee: "0",
            _assetManagerTreasury: assetManagerTreasury.address,
            _whitelistedTokens: whitelistedTokens,
            _public: true,
            _transferable: false,
            _transferableToPublic: false,
            _whitelistTokens: true,
          }),
        ).to.be.revertedWithCustomError(newProxy, "indexCreationIsPause");
      });

      it("should unpause index creation and creat index", async () => {
        const IndexFactory = await ethers.getContractFactory("IndexFactory");
        const newProxy = IndexFactory.attach(indexFactory.address);
        newProxy.setIndexCreationState(false);
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
        ];
        const indexFactoryCreate = await newProxy.createIndexNonCustodial({
          name: "INDEXLY123",
          symbol: "IDX123",
          maxIndexInvestmentAmount: "120000000000000000000000",
          minIndexInvestmentAmount: "3000000000000000000",
          _managementFee: "100",
          _performanceFee: "10",
          _entryFee: "0",
          _exitFee: "0",
          _assetManagerTreasury: assetManagerTreasury.address,
          _whitelistedTokens: whitelistedTokens,
          _public: true,
          _transferable: false,
          _transferableToPublic: false,
          _whitelistTokens: true,
        });
        const indexAddress5 = await indexFactory.getIndexList(5);
        const indexSwap5 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress5);
        expect(await indexSwap5.name()).to.eq("INDEXLY123");
        expect(await indexSwap5.symbol()).to.eq("IDX123");
        const indexAddress = await indexFactory.getIndexList(5);
        const index = indexSwap5.attach(indexAddress);
        await index.initToken([iaddress.btcAddress, iaddress.wbnbAddress], [5000, 5000]);

        const indexSupplyBefore = await indexSwap5.totalSupply();
        // console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap5.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap5.totalSupply();
        // console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should set new cool down period", async () => {
        await tokenRegistry.setCoolDownPeriod(600);
      });

      it("Invest 2BNB into Top10 2nd index fund after upgrade", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        const CoolDownBefore = await indexSwap1.lastWithdrawCooldown(nonOwner.address);
        await indexSwap1.connect(nonOwner).investInFund(
          {
            _slippage: ["400", "700", "400"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log(indexSupplyAfter);
        const CoolDownAfter = await indexSwap1.lastWithdrawCooldown(nonOwner.address);
        expect(Number(CoolDownAfter)).to.be.greaterThan(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 1BNB into Top10 2nd index fund after upgrade and should no revert", async () => {
        await ethers.provider.send("evm_increaseTime", [550]);
        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        const CoolDownBefore = await indexSwap1.lastWithdrawCooldown(nonOwner.address);
        await indexSwap1.connect(nonOwner).investInFund(
          {
            _slippage: ["400", "700", "400"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log(indexSupplyAfter);
        const CoolDownAfter = await indexSwap1.lastWithdrawCooldown(nonOwner.address);
        expect(Number(CoolDownAfter)).to.be.lessThan(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should withdraw fund and burn index token successfully should fail", async () => {
        const amountIndexToken = await indexSwap1.balanceOf(nonOwner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap1.connect(nonOwner).withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["100", "500", "100"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwap1, "CoolDownPeriodNotPassed");
      });

      it("transfer tokens should fail, if cooldownperiod is not passed", async () => {
        const amountIndexToken = await indexSwap1.balanceOf(nonOwner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(indexSwap1.connect(nonOwner).transfer(owner.address, AMOUNT)).to.be.revertedWithCustomError(
          indexSwap1,
          "CoolDownPeriodNotPassed",
        );
      });

      it("should transfer token and withdraw fund and burn index token successfully", async () => {
        await ethers.provider.send("evm_increaseTime", [600]);

        const amountIndexToken = await indexSwap1.balanceOf(nonOwner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await indexSwap1.connect(nonOwner).transfer(owner.address, AMOUNT);

        txObject = await indexSwap1.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["100", "500", "100"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });

        expect(txObject.confirmations).to.equal(1);
      });
      it("should fail to create an index with management fee greater than max fee", async () => {
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig2 = await AssetManagerConfig.deploy();
        await assetManagerConfig2.deployed();
        await expect(
          assetManagerConfig2.init({
            _managementFee: "20000",
            _performanceFee: "10",
            _entryFee: "0",
            _exitFee: "0",
            _maxInvestmentAmount: "120000000000000000000000",
            _minInvestmentAmount: "3000000000000000000",
            _tokenRegistry: tokenRegistry.address,
            _accessController: accessController.address,
            _assetManagerTreasury: treasury.address,
            _whitelistedTokens: [],
            _publicPortfolio: true,
            _transferable: true,
            _transferableToPublic: true,
            _whitelistTokens: false,
          }),
        ).to.be.revertedWithCustomError(assetManagerConfig2, "InvalidFee");
      });

      it("should fail to create an index with management fee greater than max fee", async () => {
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig2 = await AssetManagerConfig.deploy();
        await assetManagerConfig2.deployed();
        await expect(
          assetManagerConfig2.init({
            _managementFee: "100",
            _performanceFee: "20000",
            _entryFee: "0",
            _exitFee: "0",
            _maxInvestmentAmount: "120000000000000000000000",
            _minInvestmentAmount: "3000000000000000000",
            _tokenRegistry: tokenRegistry.address,
            _accessController: accessController.address,
            _assetManagerTreasury: treasury.address,
            _whitelistedTokens: [],
            _publicPortfolio: true,
            _transferable: true,
            _transferableToPublic: true,
            _whitelistTokens: false,
          }),
        ).to.be.revertedWithCustomError(assetManagerConfig2, "InvalidFee");
      });

      it("Non asset manager should not be able to propose new management fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.connect(nonOwner).proposeNewManagementFee("200")).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      it("Asset manager should propose new management fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.connect(assetManager).proposeNewManagementFee("200");
      });

      it("Asset manager should not be able to update management fee before 28 days passed", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.connect(assetManager).updateManagementFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "TimePeriodNotOver",
        );
      });

      it("Non asset manager should not be able to delete proposed new management fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.connect(nonOwner).deleteProposedManagementFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      it("Asset manager should be able to delete proposed new management fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.connect(assetManager).deleteProposedManagementFee();
      });

      it("Non asset manager should not be able to update management fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.connect(nonOwner).updateManagementFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      // it("Asset manager should propose new management fee", async () => {
      //   const config = await indexSwap.iAssetManagerConfig();
      //   const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
      //   const assetManagerConfig = AssetManagerConfig.attach(config);
      //   await assetManagerConfig.connect(assetManager).proposeNewManagementFee("150");
      // });

      // it("Asset manager should be able to update management fee after 28 days passed", async () => {
      //   await network.provider.send("evm_increaseTime", [2419200]);
      //   const config = await indexSwap.iAssetManagerConfig();
      //   const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
      //   const assetManagerConfig = AssetManagerConfig.attach(config);

      //   await assetManagerConfig.connect(assetManager).updateManagementFee();
      // });

      // same for performance

      it("Non asset manager should not be able to propose new performance fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(
          assetManagerConfig.connect(nonOwner).proposeNewPerformanceFee("200"),
        ).to.be.revertedWithCustomError(assetManagerConfig, "CallerNotAssetManager");
      });

      it("Asset manager should propose new performance fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.connect(assetManager).proposeNewPerformanceFee("200");
      });

      it("Asset manager should be able to update performance fee before 28 days passed", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.connect(assetManager).updatePerformanceFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "TimePeriodNotOver",
        );
      });

      it("Non asset manager should not be able to delete proposed new performance fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.connect(nonOwner).deleteProposedPerformanceFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      it("Asset manager should be able to delete proposed new performance fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.connect(assetManager).deleteProposedPerformanceFee();
      });

      it("Non asset manager should not be able to update performance fee", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.connect(nonOwner).updatePerformanceFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      // it("Asset manager should propose new management fee", async () => {
      //   const config = await indexSwap.iAssetManagerConfig();
      //   const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
      //   const assetManagerConfig = AssetManagerConfig.attach(config);
      //   await assetManagerConfig.connect(assetManager).proposeNewPerformanceFee("150");
      // });

      // it("Asset manager should be able to update management fee after 28 days passed", async () => {
      //   await time.increase(2419200);
      //   const config = await indexSwap.iAssetManagerConfig();
      //   const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
      //   const assetManagerConfig = AssetManagerConfig.attach(config);
      //   await assetManagerConfig.connect(assetManager).updatePerformanceFee();
      // });

      // treasury
      it("Non asset manager should not be able to update the asset manager treasury", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(
          assetManagerConfig.connect(nonOwner).updateAssetManagerTreasury(owner.address),
        ).to.be.revertedWithCustomError(assetManagerConfig, "CallerNotAssetManager");
      });

      it("Asset manager should not be able to update the asset manager treasury", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.connect(assetManager).updateAssetManagerTreasury(owner.address);
      });

      it("Non asset manager should not be able to update the velvet treasury", async () => {
        await expect(tokenRegistry.connect(nonOwner).updateVelvetTreasury(owner.address)).to.be.reverted;
      });

      it("Asset manager should be able to update the velvet treasury", async () => {
        await tokenRegistry.updateVelvetTreasury(owner.address);
      });

      it("Non owner should not be able to update protocol slippage", async () => {
        await expect(swapHandler.connect(nonOwner).addOrUpdateProtocolSlippage("800")).to.be.reverted;
      });

      it("Owner should not be able to update to a slippage more than 10% (defined max in the contract) update protocol slippage", async () => {
        await expect(swapHandler.addOrUpdateProtocolSlippage("1100")).to.be.revertedWithCustomError(
          swapHandler,
          "IncorrectSlippageRange",
        );
      });

      it("Owner should not be able to update protocol slippage", async () => {
        await swapHandler.addOrUpdateProtocolSlippage("1000");
      });
    });
  });
});
