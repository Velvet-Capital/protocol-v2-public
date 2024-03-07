import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";
import {
  tokenAddresses,
  IAddresses,
  indexSwapLibrary,
  baseHandler,
  venusHandler,
  wombatHandler,
  beefyHandler,
  apeSwapLendingHandler,
  pancakeLpHandler,
  beefyLPHandler,
  biSwapLPHandler,
  apeSwapLPHandler,
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
  Exchange__factory,
  AccessController__factory,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for MixedIndex", () => {
  let iaddress: IAddresses;
  let accounts;
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
  let exchange: any;
  let exchange1: Exchange;
  let rebalancing: any;
  let rebalancing1: any;
  let accessController: any;
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
  let indexInfo: any;
  let indexInfo1: any;
  let indexInfo2: any;
  let indexInfo3: any;
  let indexInfo4: any;

  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  let zeroAddress = "0x0000000000000000000000000000000000000000";
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for MixedIndex ", () => {
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
        ["3000000000000000000", "120000000000000000000000", treasury.address, addresses.WETH_Address],
        { kind: "uups" },
      );

      tokenRegistry = TokenRegistry.attach(registry.address);
      await tokenRegistry.setCoolDownPeriod("1");

      const PancakeSwapHandler = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.addOrUpdateProtocolSlippage("1600");

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

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      exchange1 = await Exchange.deploy();
      await exchange1.deployed();

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
          addresses.LP_BNBx,
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
        ],
      );
      registry1.wait();
      tokenRegistry.enableSwapHandlers([swapHandler.address]);
      await tokenRegistry.enablePermittedTokens(
        [iaddress.wbnbAddress, iaddress.busdAddress, iaddress.ethAddress, iaddress.daiAddress, addresses.USDT],
        [priceOracle.address, priceOracle.address, priceOracle.address, priceOracle.address, priceOracle.address],
      );

      tokenRegistry.addNonDerivative(wombatHandler.address);

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
        addresses.LP_BNBx,
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
      ];

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
            _baseExchangeHandlerAddress: exchange1.address,
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
        _transferableToPublic: true,
        _whitelistTokens: false,
      });

      const indexFactoryCreate1 = await indexFactory.createIndexNonCustodial({
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

      const indexAddress = await indexFactory.getIndexList(0);
      indexInfo = await indexFactory.IndexSwapInfolList(0);
      indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
      rebalancing = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo.rebalancing);
      exchange = await ethers.getContractAt(Exchange__factory.abi, indexInfo.exchangeHandler);
      accessController = await ethers.getContractAt(AccessController__factory.abi, await indexSwap.accessController());

      const indexAddress1 = await indexFactory.getIndexList(1);
      indexInfo1 = await indexFactory.IndexSwapInfolList(1);
      indexSwap1 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress1);
      rebalancing1 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo1.rebalancing);
      // exchange1 = await ethers.getContractAt(Exchange__factory.abi, indexInfo1.exchangeHandler);
      // accessController1 = await ethers.getContractAt(AccessController__factory.abi, await indexSwap1.accessController());

      console.log(await indexSwap.callStatic.accessController());
    });

    describe("Mixed Contracts", function () {
      it("should check Index token name and symbol", async () => {
        expect(await indexSwap.name()).to.eq("INDEXLY");
        expect(await indexSwap.symbol()).to.eq("IDX");
      });

      it("initialize should revert if tokens length does not match denorms length", async () => {
        await expect(
          indexSwap.initToken(
            [addresses.oBNB, addresses.BSwap_WBNB_BUSDLP_Address, addresses.mooBTCBUSDLP],
            [100, 1000],
          ),
        ).to.be.revertedWithCustomError(indexSwap, "InvalidInitInput");
      });

      it("initialize should revert if a token address is null", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        await expect(
          indexSwap.initToken(
            [zeroAddress, addresses.BSwap_WBNB_BUSDLP_Address, addresses.mooBTCBUSDLP],
            [100, 100, 9800],
          ),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "InvalidTokenAddress");
      });

      it("initialize should revert if a non-approved token is being used for init", async () => {
        await expect(
          indexSwap.initToken(
            [addresses.BSwap_WBNB_LINKLP_Address, addresses.BSwap_WBNB_BUSDLP_Address, addresses.mooBTCBUSDLP],
            [100, 1000, 10],
          ),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "TokenNotApproved");
      });

      it("initialize should revert if total Weights not equal 10,000", async () => {
        await expect(
          indexSwap.initToken(
            [addresses.oBNB, addresses.BSwap_WBNB_BUSDLP_Address, addresses.mooBTCBUSDLP],
            [100, 1000, 10],
          ),
        )
          .to.be.revertedWithCustomError(indexSwap, "InvalidWeights")
          .withArgs("10000");
      });

      it("Initialize IndexFund Tokens", async () => {
        await indexSwap.initToken(
          [addresses.vETH_Address, addresses.BSwap_BTC_WBNBLP_Address, addresses.mooBTCBUSDLP],
          [5000, 2500, 2500],
        );
      });

      it("Initialize 2nd IndexFund Tokens", async () => {
        await indexSwap1.initToken(
          [addresses.LP_BNBx, addresses.BSwap_DOGE_WBNBLPAddress, addresses.mooDOGEWBNB],
          [5000, 2500, 2500],
        );
      });

      it("should confirm that the correct tokens are initialised for the 1st index", async () => {
        expect(await indexSwap.getTokens()).to.deep.equal([
          addresses.vETH_Address,
          addresses.BSwap_BTC_WBNBLP_Address,
          addresses.mooBTCBUSDLP,
        ]);
      });

      it("should update a price Oracle feed", async () => {
        await expect(
          priceOracle._updateFeed(
            iaddress.wbnbAddress,
            "0x0000000000000000000000000000000000000348",
            "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
          ),
        );
      });

      it("should not be able to add pid if arrray lengths don't match", async () => {
        await expect(
          pancakeLpHandler.connect(owner).pidMap([addresses.Cake_WBNBLP_Address], [0, 12]),
        ).to.be.revertedWithCustomError(pancakeLpHandler, "InvalidLength");

        await expect(
          apeSwapLPHandler.connect(owner).pidMap([addresses.ApeSwap_WBNB_BUSD_Address], [0, 12]),
        ).to.be.revertedWithCustomError(apeSwapLPHandler, "InvalidLength");
      });

      it("should not be able to delete pid if array lengths don't match", async () => {
        await expect(
          apeSwapLPHandler.connect(owner).removePidMap([addresses.ApeSwap_WBNB_BUSD_Address], [0, 12]),
        ).to.be.revertedWithCustomError(apeSwapLPHandler, "InvalidLength");

        await expect(
          pancakeLpHandler.connect(owner).removePidMap([addresses.Cake_WBNBLP_Address], [0, 12]),
        ).to.be.revertedWithCustomError(pancakeLpHandler, "InvalidLength");
      });

      it("should add pid", async () => {
        await pancakeLpHandler.connect(owner).pidMap([addresses.Cake_WBNBLP_Address], [0]);
      });

      it("should not be able to delete pid if the entry does not match", async () => {
        await apeSwapLPHandler.connect(owner).pidMap([addresses.ApeSwap_WBNB_BUSD_Address], [39]);

        await expect(
          apeSwapLPHandler.connect(owner).removePidMap([addresses.ApeSwap_WBNB_BUSD_Address], [12]),
        ).to.be.revertedWithCustomError(apeSwapLPHandler, "InvalidPID");
      });

      it("should delete pid", async () => {
        await pancakeLpHandler.connect(owner).pidMap([addresses.Cake_BUSDLP_Address], [39]);

        expect(await pancakeLpHandler.connect(owner).removePidMap([addresses.Cake_BUSDLP_Address], [39]));
      });

      it("should fetch the router address of the pancake LP handler", async () => {
        await pancakeLpHandler.getRouterAddress();
      });

      it("should get the swap address from the pancake swap handler", async () => {
        await swapHandler.getSwapAddress();
      });

      it("should check if a token is enabled or not in the registry", async () => {
        expect(await tokenRegistry.isEnabled(addresses.oBNB));
      });

      it("should disable a token in the registry", async () => {
        expect(await tokenRegistry.disableToken(addresses.vDAI_Address));
      });

      it("should reiterate the WETH address of the token registry", async () => {
        expect(await tokenRegistry.updateWETH(addresses.WETH_Address));
      });

      it("should not be able to enable a zero address permitted token in TokenRegistry", async () => {
        await expect(
          tokenRegistry.enablePermittedTokens([zeroAddress], [priceOracle.address]),
        ).to.be.revertedWithCustomError(tokenRegistry, "TokenNotEnabled");
      });

      it("should not be able to enable if empty array is passed to TokenRegistry", async () => {
        await expect(tokenRegistry.enablePermittedTokens([], [])).to.be.revertedWithCustomError(
          tokenRegistry,
          "InvalidLength",
        );
      });

      it("should not be able to enable a token which is already enabled", async () => {
        await expect(
          tokenRegistry.enablePermittedTokens([iaddress.wbnbAddress], [priceOracle.address]),
        ).to.be.revertedWithCustomError(tokenRegistry, "AddressAlreadyApproved");
      });

      it("should not be able to enable tokens when oracle length is not equal to token length ", async () => {
        await expect(
          tokenRegistry.enablePermittedTokens([iaddress.wbnbAddress, iaddress.busdAddress], [priceOracle.address]),
        ).to.be.revertedWithCustomError(tokenRegistry, "InvalidLength");
      });

      it("should not be able to enable token in registry if the oracle array length does not match the length of other arrays", async () => {
        await expect(
          tokenRegistry.enableToken(
            [priceOracle.address, priceOracle.address],
            [iaddress.wbnbAddress],
            [baseHandler.address],
            [[addresses.base_RewardToken]],
            [true],
          ),
        ).to.be.revertedWithCustomError(tokenRegistry, "IncorrectArrayLength");
      });

      it("should not be able to enable token in registry if the token array length does not match the length of other arrays", async () => {
        await expect(
          tokenRegistry.enableToken(
            [priceOracle.address],
            [iaddress.wbnbAddress, iaddress.btcAddress],
            [baseHandler.address],
            [[addresses.base_RewardToken]],
            [true],
          ),
        ).to.be.revertedWithCustomError(tokenRegistry, "IncorrectArrayLength");
      });

      it("should not be able to enable token in registry if the handler array length does not match the length of other arrays", async () => {
        await expect(
          tokenRegistry.enableToken(
            [priceOracle.address],
            [iaddress.wbnbAddress],
            [baseHandler.address, wombatHandler.address],
            [[addresses.base_RewardToken]],
            [true],
          ),
        ).to.be.revertedWithCustomError(tokenRegistry, "IncorrectArrayLength");
      });

      it("should not be able to enable token in registry if the reward token array length does not match the length of other arrays", async () => {
        await expect(
          tokenRegistry.enableToken(
            [priceOracle.address],
            [iaddress.wbnbAddress],
            [baseHandler.address],
            [[addresses.base_RewardToken], [addresses.base_RewardToken]],
            [true],
          ),
        ).to.be.revertedWithCustomError(tokenRegistry, "IncorrectArrayLength");
      });

      it("should not be able to enable token in registry if the primary token array length does not match the length of other arrays", async () => {
        await expect(
          tokenRegistry.enableToken(
            [priceOracle.address],
            [iaddress.wbnbAddress],
            [baseHandler.address],
            [[addresses.base_RewardToken]],
            [true, false],
          ),
        ).to.be.revertedWithCustomError(tokenRegistry, "IncorrectArrayLength");
      });

      it("disable token in registry should fail if zero address is passed", async () => {
        await expect(tokenRegistry.disablePermittedTokens([zeroAddress])).to.be.revertedWithCustomError(
          tokenRegistry,
          "InvalidTokenAddress",
        );
      });

      it("disable token in registry should fail if token is not enabled at all", async () => {
        await expect(tokenRegistry.disablePermittedTokens([iaddress.cakeAddress])).to.be.revertedWithCustomError(
          tokenRegistry,
          "AddressNotApproved",
        );
      });

      it("disable token in registry should fail if empty array is passed", async () => {
        await expect(tokenRegistry.disablePermittedTokens([])).to.be.revertedWithCustomError(
          tokenRegistry,
          "InvalidLength",
        );
      });

      it("Non owner should not be able to disable a permitted token in TokenRegistry", async () => {
        await expect(tokenRegistry.connect(addr1).disablePermittedTokens([addresses.USDT])).to.be.reverted;
      });

      it("should successfully disable a permitted token in TokenRegistry", async () => {
        await tokenRegistry.disablePermittedTokens([addresses.USDT]);
      });

      it("should update an enabled token's data in the TokenRegistry", async () => {
        let tokenInfo1 = await tokenRegistry.getTokenInformation(addresses.Cake_WBNBLP_Address);
        let oldHandlerAddress = tokenInfo1.handler;

        const LpHandler2 = await ethers.getContractFactory("PancakeSwapLPHandler");
        const lpHandler2 = await LpHandler2.connect(owner).deploy(priceOracle.address);
        await lpHandler2.deployed();
        lpHandler2.addOrUpdateProtocolSlippage("1000");

        tokenRegistry.enableToken(
          [priceOracle.address],
          [addresses.Cake_WBNBLP_Address],
          [lpHandler2.address],
          [[addresses.cake_RewardToken]],
          [false],
        );

        let tokenInfo2 = await tokenRegistry.getTokenInformation(addresses.Cake_WBNBLP_Address);
        let newHandlerAddress = tokenInfo2.handler;

        expect(oldHandlerAddress).to.be.not.equal(newHandlerAddress);
      });

      it("should revert if wrong LP slippage is assigned to a LP handler", async () => {
        const LpHandler = await ethers.getContractFactory("PancakeSwapLPHandler");
        const lpHandler2 = await LpHandler.connect(owner).deploy(priceOracle.address);
        await lpHandler2.deployed();
        await expect(lpHandler2.addOrUpdateProtocolSlippage("12000")).to.be.revertedWithCustomError(
          pancakeLpHandler,
          "IncorrectSlippageRange",
        );
      });

      it("should revert if a zero address is passed to ApeSwapLP Handler's constructor", async () => {
        const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler");
        await expect(ApeSwapLPHandler.deploy(zeroAddress)).to.be.revertedWithCustomError(
          apeSwapLPHandler,
          "InvalidAddress",
        );
      });

      it("should revert if a zero address is passed to BiSwapLP Handler's constructor", async () => {
        const BiSwapLPHandler = await ethers.getContractFactory("BiSwapLPHandler");
        await expect(BiSwapLPHandler.deploy(zeroAddress)).to.be.revertedWithCustomError(
          biSwapLPHandler,
          "InvalidAddress",
        );
      });

      it("should revert if a zero address is passed to PancakeSwapLP Handler's constructor", async () => {
        const PancakeSwapLPHandler = await ethers.getContractFactory("PancakeSwapLPHandler");
        await expect(PancakeSwapLPHandler.deploy(zeroAddress)).to.be.revertedWithCustomError(
          pancakeLpHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to enable swap handlers in registry if an empty array is passed", async () => {
        await expect(tokenRegistry.enableSwapHandlers([])).to.be.revertedWithCustomError(
          tokenRegistry,
          "InvalidLength",
        );
      });

      it("should not be able to enable a handler in the registry that has already been enabled", async () => {
        await expect(tokenRegistry.enableSwapHandlers([swapHandler.address])).to.be.revertedWithCustomError(
          tokenRegistry,
          "HandlerAlreadyEnabled",
        );
      });

      it("Non-primary tokens should not get enabled on the registry level", async () => {
        await expect(
          tokenRegistry.enablePermittedTokens([addresses.vBNB_Address], [priceOracle.address]),
        ).to.be.revertedWithCustomError(tokenRegistry, "TokenNotPrimary");
      });

      it("asset manager should not be able to add token which is not approved in registry", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.setPermittedTokens([iaddress.btcAddress])).to.be.revertedWithCustomError(
          assetManagerConfig,
          "TokenNotPermitted",
        );
      });

      it("asset manager should not be able to add a zero address as permitted token", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.setPermittedTokens([zeroAddress])).to.be.revertedWithCustomError(
          assetManagerConfig,
          "InvalidTokenAddress",
        );
      });

      it("asset manager should not be able to delete a non-permitted token", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);

        await expect(assetManagerConfig.deletePermittedTokens([iaddress.linkAddress])).to.be.revertedWithCustomError(
          assetManagerConfig,
          "TokenNotApproved",
        );
      });

      it("asset manager should not be able to delete permitted tokens if an empty array is passed", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);

        await expect(assetManagerConfig.deletePermittedTokens([])).to.be.revertedWithCustomError(
          assetManagerConfig,
          "InvalidLength",
        );
      });

      it("isTokenPermitted should not return output for zero address", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);

        await expect(assetManagerConfig.isTokenPermitted(zeroAddress)).to.be.revertedWithCustomError(
          assetManagerConfig,
          "InvalidTokenAddress",
        );
      });

      it("Invest 0.1 BNB should not revert, if investing token is not initialized + tranferFrom should not work", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        await tokenRegistry.setCoolDownPeriod("100");
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200", "200"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        await indexSwap.approve(addr1.address, "1000000000000000");
        await expect(
          indexSwap.connect(addr1).transferFrom(owner.address, addr1.address, "10000"),
        ).to.be.revertedWithCustomError(indexSwap, "CoolDownPeriodNotPassed");
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        let underLying = await beefyLPHandler.getUnderlying(addresses.mooBTCBUSDLP);
        let handlerBalance = await ERC20.attach(underLying[0]).balanceOf(beefyLPHandler.address);
        await tokenRegistry.setCoolDownPeriod("1");
        await ethers.provider.send("evm_increaseTime", [100]);
        expect(handlerBalance).to.be.equal(0);
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 1 BNB in 2nd index", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        await indexSwap1.investInFund(
          {
            _slippage: ["500", "500", "500"],
            _lpSlippage: ["1000", "1000", "1000"],
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

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 10BUSD should revert if investing token is not initialized", async () => {
        await expect(
          indexSwap.investInFund({
            _slippage: ["200", "200", "200"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "10000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.busdAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "InvalidToken");
      });

      it("asset manager should be able to permit token which is approved in registry", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.setPermittedTokens([
          iaddress.wbnbAddress,
          iaddress.daiAddress,
          iaddress.busdAddress,
          iaddress.ethAddress,
        ]);
      });

      it("should not be able to get underlying token of a zero address Wombat lp token", async () => {
        await expect(wombatHandler.getUnderlying(zeroAddress)).to.be.revertedWithCustomError(
          wombatHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to get token balance of a zero address Wombat lp token", async () => {
        await expect(wombatHandler.getTokenBalance(zeroAddress, owner.address)).to.be.revertedWithCustomError(
          wombatHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to get token balance of a zero address Wombat lp token holder", async () => {
        await expect(wombatHandler.getTokenBalance(addresses.LP_BNBx, zeroAddress)).to.be.revertedWithCustomError(
          wombatHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to get underlying balance of a zero address Wombat lp token", async () => {
        await expect(wombatHandler.getUnderlyingBalance(zeroAddress, owner.address)).to.be.revertedWithCustomError(
          wombatHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to get underlying balance of a zero address Wombat lp token holder", async () => {
        await expect(wombatHandler.getUnderlyingBalance(addresses.LP_BNBx, zeroAddress)).to.be.revertedWithCustomError(
          wombatHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to get underlying token of a zero address Beefy token", async () => {
        await expect(beefyHandler.getUnderlying(zeroAddress)).to.be.reverted;
      });

      it("should not be able to get token balance of a zero address Beefy token", async () => {
        await expect(beefyHandler.getTokenBalance(zeroAddress, owner.address)).to.be.revertedWithCustomError(
          beefyHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to get underlying balance of a zero address Beefy moo token", async () => {
        await expect(beefyHandler.getUnderlyingBalance(zeroAddress, owner.address)).to.be.reverted;
      });

      it("should not be able to get underlying balance of a zero address Beefy moo token holder", async () => {
        await expect(beefyHandler.getUnderlyingBalance(addresses.mooValasBUSD, zeroAddress)).to.be.reverted;
      });

      it("should be able to get underlying balance of a Beefy LP token", async () => {
        await beefyHandler.getUnderlyingBalance(owner.address, addresses.mooWOMBUSDLP);
      });

      it("should not be able to get underlying token of a non-Venus token via the Venus handler", async () => {
        await expect(venusHandler.getUnderlying(addresses.mooValasBUSD)).to.be.revertedWithCustomError(
          venusHandler,
          "NotVToken",
        );
      });

      it("should not be able to get underlying balance of a zero address Venus token", async () => {
        await expect(venusHandler.getUnderlyingBalance(zeroAddress, owner.address)).to.be.revertedWithCustomError(
          venusHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to get underlying balance of a zero address Venus token holder", async () => {
        await expect(
          venusHandler.getUnderlyingBalance(addresses.vETH_Address, zeroAddress),
        ).to.be.revertedWithCustomError(venusHandler, "InvalidAddress");
      });

      it("should not be able to get token balance of a zero address Venus token", async () => {
        await expect(venusHandler.getTokenBalance(zeroAddress, owner.address)).to.be.revertedWithCustomError(
          venusHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to get token balance of a zero address Venus token holder", async () => {
        await expect(venusHandler.getTokenBalance(addresses.vETH_Address, zeroAddress)).to.be.revertedWithCustomError(
          venusHandler,
          "InvalidAddress",
        );
      });

      it("should not be able to get underlying token of a zero address Venus token", async () => {
        await expect(venusHandler.getUnderlying(zeroAddress)).to.be.revertedWithCustomError(
          venusHandler,
          "InvalidAddress",
        );
      });
      it("should add reward token to registry and verify it", async () => {
        await tokenRegistry.addRewardToken(
          [addresses.venus_RewardToken, addresses.wombat_RewardToken],
          baseHandler.address,
        );

        expect(await tokenRegistry.isRewardToken(addresses.venus_RewardToken)).to.be.equal(true);
        expect(await tokenRegistry.isRewardToken(addresses.wombat_RewardToken)).to.be.equal(true);
      });

      it("should remove reward token from registry and verify it", async () => {
        await tokenRegistry.removeRewardToken(addresses.venus_RewardToken);
        expect(await tokenRegistry.isRewardToken(addresses.venus_RewardToken)).to.be.equal(false);
      });

      it("should add reward token to registry and verify it", async () => {
        await tokenRegistry.addRewardToken([addresses.venus_RewardToken], baseHandler.address);
        expect(await tokenRegistry.isRewardToken(addresses.venus_RewardToken)).to.be.equal(true);
      });

      it("should revert when add reward token to registry sending 0 address token address", async () => {
        await expect(
          tokenRegistry.addRewardToken(["0x0000000000000000000000000000000000000000"], baseHandler.address),
        ).to.be.revertedWithCustomError(tokenRegistry, "InvalidTokenAddress");
      });

      it("should revert when add reward token to registry sending 0 address handler address", async () => {
        await expect(
          tokenRegistry.addRewardToken([addresses.venus_RewardToken], "0x0000000000000000000000000000000000000000"),
        ).to.be.revertedWithCustomError(tokenRegistry, "InvalidHandlerAddress");
      });

      it("Invest 10BUSD into Top10 fund", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const busdtoken = ERC20.attach(iaddress.busdAddress);
        const swapResult = await swapHandler
          .connect(owner)
          .swapETHToTokens("200", iaddress.busdAddress, owner.address, {
            value: "1000000000000000000",
          });
        console.log("Balance of user", await busdtoken.balanceOf(owner.address));
        await busdtoken.approve(indexSwap.address, "10000000000000000000");
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("10busd before", indexSupplyBefore);
        await indexSwap.investInFund({
          _slippage: ["800", "800", "800"],
          _lpSlippage: ["800", "800", "800"],
          _tokenAmount: "10000000000000000000",
          _swapHandler: swapHandler.address,
          _token: iaddress.busdAddress,
        });

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log("10BUSD After", indexSupplyAfter);
        let underLying = await beefyLPHandler.getUnderlying(addresses.mooBTCBUSDLP);
        let handlerBalance = await ERC20.attach(underLying[0]).balanceOf(beefyLPHandler.address);
        expect(handlerBalance).to.be.equal(0);
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.00001 BNB into Top10 fund should fail", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.2bnb before", indexSupplyBefore);
        await expect(
          indexSwap.investInFund(
            {
              _slippage: ["200", "200", "200"],
              _lpSlippage: ["200", "200", "200"],
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
        // console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 10BNB into Top10 fund", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.2bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["800", "800", "800"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "10000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "10000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        let underLying = await beefyLPHandler.getUnderlying(addresses.mooBTCBUSDLP);
        let handlerBalance = await ERC20.attach(underLying[0]).balanceOf(beefyLPHandler.address);
        expect(handlerBalance).to.be.equal(0);
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Investment should fail when contract is paused", async () => {
        await rebalancing.setPause(true);
        await expect(
          indexSwap.investInFund(
            {
              _slippage: ["200", "200", "200"],
              _lpSlippage: ["200", "200", "200"],
              _to: owner.address,
              _tokenAmount: "1000000000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.wbnbAddress,
            },
            {
              value: "1000000000000000000",
            },
          ),
        ).to.be.reverted;
      });

      it("update Weights should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateWeights(
            [6667, 2330, 1000],
            ["200", "200", "200"],
            ["200", "200", "200"],
            swapHandler.address,
          ),
        )
          .to.be.revertedWithCustomError(indexSwap, "InvalidWeights")
          .withArgs("10000");
      });

      it("update weights should revert if weights and slippage array length don't match", async () => {
        await expect(
          rebalancing.updateWeights([6667, 3330], ["200", "200", "2000"], ["200", "200", "200"], swapHandler.address),
        ).to.be.revertedWithCustomError(rebalancing, "LengthsDontMatch");
      });

      it("update weights should revert if slippage array length don't match the token count", async () => {
        await expect(
          rebalancing.updateWeights([6667, 2330, 1000], ["200", "200"], ["200", "200"], swapHandler.address),
        ).to.be.revertedWithCustomError(rebalancing, "InvalidSlippageLength");
      });

      it("update weights should revert if swap handler is not enabled", async () => {
        await tokenRegistry.disableSwapHandlers([swapHandler.address]);

        await expect(
          rebalancing.updateWeights(
            [6667, 2330, 1000],
            ["200", "200", "200"],
            ["200", "200", "200"],
            swapHandler.address,
          ),
        ).to.be.revertedWithCustomError(rebalancing, "SwapHandlerNotEnabled");
      });

      it("update Weights should revert if total Weights not equal 10,000", async () => {
        await tokenRegistry.enableSwapHandlers([swapHandler.address]);
        await expect(
          rebalancing.updateWeights(
            [6667, 2330, 1000],
            ["200", "200", "200"],
            ["200", "200", "200"],
            swapHandler.address,
          ),
        )
          .to.be.revertedWithCustomError(indexSwap, "InvalidWeights")
          .withArgs("10000");
      });

      it("update weights should revert if weights and slippage array length don't match", async () => {
        await expect(
          rebalancing.updateWeights([6667, 3330], ["200", "200", "2000"], ["200", "200", "200"], swapHandler.address),
        ).to.be.revertedWithCustomError(rebalancing, "LengthsDontMatch");
      });

      it("update weights should revert if slippage array length don't match the token count", async () => {
        await expect(
          rebalancing.updateWeights([6667, 2330, 1000], ["200", "200"], ["200", "200"], swapHandler.address),
        ).to.be.revertedWithCustomError(rebalancing, "InvalidSlippageLength");
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights(
          [5000, 2500, 2500],
          ["200", "200", "200"],
          ["200", "200", "200"],
          swapHandler.address,
        );
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights(
          [2333, 4667, 3000],
          ["200", "200", "200"],
          ["200", "200", "200"],
          swapHandler.address,
        );
      });

      it("updateTokens should revert if total Weights not equal 10,000", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        await expect(
          rebalancing.updateTokens({
            tokens: [addresses.MAIN_LP_DAI, addresses.vBTC_Address, addresses.vBNB_Address],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 1000],
            _slippageSell: ["200", "200", "200"],
            _slippageBuy: ["200", "200", "200"],
            _lpSlippageSell: ["200", "200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        )
          .to.be.revertedWithCustomError(indexSwap, "InvalidWeights")
          .withArgs("10000");
      });

      it("owner should be able to add asset manager", async () => {
        await accessController.grantRole(
          "0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819",
          nonOwner.address,
        );
      });

      it("non owner should not be able to add asset manager", async () => {
        await expect(
          accessController
            .connect(nonOwner)
            .grantRole("0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819", investor1.address),
        ).to.be.reverted;
      });

      it("disable swaphandler in registry should not work if handler array lenght is 0", async () => {
        await expect(tokenRegistry.disableSwapHandlers([])).to.be.revertedWithCustomError(
          tokenRegistry,
          "InvalidLength",
        );
      });

      it("disable swaphandler in registry should not work if the handler is already disabled", async () => {
        await tokenRegistry.disableSwapHandlers([swapHandler.address]);
        await expect(tokenRegistry.disableSwapHandlers([swapHandler.address])).to.be.revertedWithCustomError(
          tokenRegistry,
          "HandlerAlreadyDisabled",
        );
      });

      it("update tokens should not work if the protocol is paused", async () => {
        await tokenRegistry.setProtocolPause(true);
        await tokenRegistry.enableSwapHandlers([swapHandler.address]);
        await expect(
          rebalancing.updateTokens({
            tokens: [addresses.MAIN_LP_DAI, addresses.vBTC_Address, addresses.vBNB_Address],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 2000],
            _slippageSell: ["200", "200", "200"],
            _slippageBuy: ["200", "200", "200"],
            _lpSlippageSell: ["200", "200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        ).to.be.revertedWithCustomError(rebalancing, "ProtocolIsPaused");
      });

      it("update tokens should not work if swaphandler is not enabled", async () => {
        await tokenRegistry.setProtocolPause(false);
        await tokenRegistry.disableSwapHandlers([swapHandler.address]);
        await expect(
          rebalancing.updateTokens({
            tokens: [addresses.MAIN_LP_DAI, addresses.vBTC_Address, addresses.vBNB_Address],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 2000],
            _slippageSell: ["200", "200", "200"],
            _slippageBuy: ["200", "200", "200"],
            _lpSlippageSell: ["200", "200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        ).to.be.revertedWithCustomError(rebalancing, "SwapHandlerNotEnabled");
      });

      it("update tokens should not work if non-enabled token is being used", async () => {
        tokenRegistry.enableSwapHandlers([swapHandler.address]);
        await expect(
          rebalancing.updateTokens({
            tokens: [addresses.BSwap_WBNB_LINKLP_Address, addresses.vBTC_Address, addresses.vBNB_Address],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 2000],
            _slippageSell: ["200", "200", "200"],
            _slippageBuy: ["200", "200", "200"],
            _lpSlippageSell: ["200", "200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        ).to.be.revertedWithCustomError(rebalanceLibrary, "TokenNotApproved");

        await tokenRegistry.disableSwapHandlers([swapHandler.address]);
      });

      it("update tokens should not work if the function caller is not an asset manager", async () => {
        await expect(
          rebalancing.connect(addr3).updateTokens({
            tokens: [addresses.MAIN_LP_DAI, addresses.vBTC_Address, addresses.vBNB_Address],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 2000],
            _slippageSell: ["200", "200", "200"],
            _slippageBuy: ["200", "200", "200"],
            _lpSlippageSell: ["200", "200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
          }),
        ).to.be.reverted;
      });

      it("should get token balance from the rebalance contract", async () => {
        await rebalancing.getTokenBalance(addresses.vBTC_Address);
      });

      it("new asset manager should update tokens", async () => {
        await tokenRegistry.enableSwapHandlers([swapHandler.address]);

        await rebalancing.connect(nonOwner).updateTokens({
          tokens: [addresses.vETH_Address, iaddress.wbnbAddress, addresses.vBNB_Address],
          _swapHandler: swapHandler.address,
          denorms: [2000, 6000, 2000],
          _slippageSell: ["800", "800", "800"],
          _slippageBuy: ["800", "800", "800"],
          _lpSlippageSell: ["800", "800", "800"],
          _lpSlippageBuy: ["800", "800", "800"],
        });
      });

      it("withdrawal should revert when contract is paused", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        // const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: amountIndexToken,
            _slippage: ["200", "200", "300"],
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
      });

      it("when withdraw fund more then balance", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const updateAmount = amountIndexToken.add(1);
        const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(
          indexSwap.connect(nonOwner).withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["200", "200", "300"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "CallerNotHavingGivenTokenAmount");
      });

      it("should fail withdraw when slippage array length is not equal to index length", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken.toString()); //

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "InvalidSlippageLength");
      });

      it("should fail withdraw when balance falls below min investment amount", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT.sub("1000000000000"),
            _slippage: ["200", "200", "300"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          }),
        )
          .to.be.revertedWithCustomError(indexSwap, "BalanceCantBeBelowVelvetMinInvestAmount")
          .withArgs("3000000000000000000");
      });

      it("should fail withdraw when balance falls below min investment amount (multi asset)", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT.sub("1000000000000"),
            _slippage: ["200", "200", "300"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: true,
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          }),
        )
          .to.be.revertedWithCustomError(indexSwap, "BalanceCantBeBelowVelvetMinInvestAmount")
          .withArgs("3000000000000000000");
      });

      it("should fail withdraw fund when the output token is not permitted in the asset manager config and is not WETH", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["200", "200", "300"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: iaddress.dogeAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "InvalidToken");
      });

      it("should fail withdraw when the protocol is paused", async () => {
        await tokenRegistry.setProtocolPause(true);
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["200", "200", "300"],
            _lpSlippage: ["200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: iaddress.dogeAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "ProtocolIsPaused");
      });

      it("should withdraw fund and burn index token successfully", async () => {
        await tokenRegistry.setProtocolPause(false);
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["1000", "1000", "1000"],
          _lpSlippage: ["1500", "1500", "1500"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });

        expect(txObject.confirmations).to.equal(1);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken");
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["500", "900", "500"],
            _lpSlippage: ["200", "200", "200"],
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
        // console.log(indexSupplyAfter);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["500", "900", "500"],
            _lpSlippage: ["200", "200", "200"],
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
        // console.log(indexSupplyAfter);
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["500", "900", "500"],
            _lpSlippage: ["200", "200", "200"],
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
        // console.log(indexSupplyAfter);
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["500", "900", "500"],
            _lpSlippage: ["200", "200", "200"],
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
        // console.log(indexSupplyAfter);
      });

      it("should withdraw fund in BUSD and burn index token successfully", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken");
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const ethtoken = ERC20.attach(iaddress.ethAddress);
        const balanceBefore = await ethtoken.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB
        console.log("balanceBefore", balanceBefore);
        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["500", "900", "500"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.ethAddress,
        });

        const balanceAfter = await ethtoken.balanceOf(owner.address);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["500", "900", "500"],
            _lpSlippage: ["200", "200", "200"],
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

      it("should withdraw tokens directly instead of BNB", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["400", "700", "400"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: true,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });
      });

      it("should update tokens for more testing", async () => {
        await rebalancing.connect(nonOwner).updateTokens({
          tokens: [addresses.USDT, addresses.vBTC_Address, iaddress.btcAddress],
          _swapHandler: swapHandler.address,
          denorms: [1000, 4000, 5000],
          _slippageSell: ["200", "200", "200"],
          _slippageBuy: ["200", "200", "200"],
          _lpSlippageSell: ["200", "200", "200"],
          _lpSlippageBuy: ["200", "200", "200"],
        });
      });

      it("should invest with a token same as one of the portfolio tokens", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await tokenRegistry.enablePermittedTokens([addresses.USDT], [priceOracle.address]);
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.setPermittedTokens([addresses.USDT]);
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const usdttoken = ERC20.attach(addresses.USDT);
        const swapResult = await swapHandler.connect(owner).swapETHToTokens("200", addresses.USDT, owner.address, {
          value: "1000000000000000000",
        });
        console.log("Balance of user", await usdttoken.balanceOf(owner.address));
        await usdttoken.approve(indexSwap.address, "10000000000000000000");
        // console.log("10busd before", indexSupplyBefore);
        await indexSwap.investInFund({
          _slippage: ["300", "300", "300"],
          _lpSlippage: ["200", "200", "200"],
          _to: owner.address,
          _tokenAmount: "10000000000000000000",
          _swapHandler: swapHandler.address,
          _token: addresses.USDT,
        });
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("should obtain the last rebalance time from the IndexSwap", async () => {
        await indexSwap.getLastRebalance();
      });

      it("should introduce a token not having the standard 18 decimals", async () => {
        await rebalancing.connect(nonOwner).updateTokens({
          tokens: [addresses.USDT, addresses.vBNB_Address, iaddress.dogeAddress],
          _swapHandler: swapHandler.address,
          denorms: [1000, 4000, 5000],
          _slippageSell: ["200", "200", "200"],
          _slippageBuy: ["200", "200", "200"],
          _lpSlippageSell: ["200", "200", "200"],
          _lpSlippageBuy: ["200", "200", "200"],
        });
      });

      it("Invest 1BNB in the newly rebalanced fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200", "200"],
            _lpSlippage: ["1000", "1000", "1000"],
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
        // console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });
    });
  });
});