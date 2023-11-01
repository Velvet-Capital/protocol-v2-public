import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";

import {
  tokenAddresses,
  IAddresses,
  indexSwapLibrary,
  baseHandler,
  wombatHandler,
  priceOracle,
  apeSwapLPHandler,
  sushiLpHandler,
  hopHandler,
  beefyLPHandler,
} from "./Deployments.test";

import {
  IndexSwap,
  IndexSwap__factory,
  Exchange,
  Rebalancing__factory,
  AccessController,
  IndexFactory,
  ApeSwapLPHandler,
  VelvetSafeModule,
  AssetManagerConfig,
  TokenRegistry,
  FeeModule,
  OffChainIndexSwap,
  RebalanceLibrary,
  Exchange__factory,
  AccessController__factory,
  RebalanceAggregator__factory,
  SushiSwapLPHandler,
  UniswapV2Handler,
} from "../../typechain";

import { chainIdToAddresses } from "../../scripts/networkVariables";

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
  let swapHandler1: UniswapV2Handler;
  let swapHandler: UniswapV2Handler;
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
  let metaAggregator: any;
  let nonOwner: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let assetManagerAdmin: SignerWithAddress;
  let assetManager: SignerWithAddress;
  let whitelistManagerAdmin: SignerWithAddress;
  let whitelistManager: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let indexInfo: any;

  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 42161;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for MixedIndex", () => {
    before(async () => {
      await priceOracle.updateOracleExpirationThreshold("90000");
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

      iaddress = await tokenAddresses(priceOracle, true);
      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");

      const registry = await upgrades.deployProxy(
        TokenRegistry,
        ["3000000000000000000", "120000000000000000000000", treasury.address, addresses.WETH],
        { kind: "uups" },
      );

      tokenRegistry = TokenRegistry.attach(registry.address);
      await tokenRegistry.setCoolDownPeriod("1");

      const PancakeSwapHandler = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.SushiSwapRouterAddress, priceOracle.address);

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

      const IndexSwap = await ethers.getContractFactory("IndexSwap", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      indexSwapContract = await IndexSwap.deploy();
      await indexSwapContract.deployed();

      const offChainIndex = await ethers.getContractFactory("OffChainIndexSwap", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary?.address,
        },
      });
      offChainIndexSwap = await offChainIndex.deploy();
      await offChainIndexSwap.deployed();

      const PancakeSwapHandlerDefault = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler1 = await PancakeSwapHandlerDefault.deploy();
      await swapHandler1.deployed();

      swapHandler1.init(addresses.SushiSwapRouterAddress, priceOracle.address);

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary?.address,
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
        ],
        [
          addresses.ARB,
          addresses.WBTC,
          addresses.WETH,
          addresses.DAI,
          addresses.ADoge,
          addresses.USDCe,

          addresses.USDT,
          addresses.MAIN_LP_USDT,
          addresses.MAIN_LP_USDCe,
          addresses.MAIN_LP_DAI,
          addresses.ApeSwap_WBTC_USDT,

          addresses.SushiSwap_WETH_WBTC,
          addresses.SushiSwap_WETH_LINK,
          addresses.SushiSwap_WETH_USDT,
          addresses.SushiSwap_ADoge_WETH,
          addresses.SushiSwap_WETH_ARB,

          addresses.HOP_USDC_LP,

          addresses.mooSushiWethUsdc,
        ],
        [
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

          hopHandler.address,

          beefyLPHandler.address,
        ],
        [
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

          [addresses.base_RewardToken],

          [addresses.base_RewardToken],
        ],
        [
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
        ],
      );

      registry1.wait();

      tokenRegistry.enableSwapHandlers([swapHandler.address, swapHandler1.address]);
      tokenRegistry.addNonDerivative(wombatHandler.address);

      // tokenRegistry.enablePermittedTokens([addresses.USDT],[priceOracle.address]);

      let whitelistedTokens = [
        addresses.ARB,
        addresses.WBTC,
        addresses.WETH,
        addresses.DAI,
        addresses.ADoge,
        addresses.USDCe,
        addresses.USDT,
        addresses.MAIN_LP_USDT,
        addresses.MAIN_LP_USDCe,
        addresses.MAIN_LP_DAI,
        addresses.ApeSwap_WBTC_USDT,
        addresses.SushiSwap_WETH_WBTC,
        addresses.SushiSwap_WETH_LINK,
        addresses.SushiSwap_WETH_USDT,
        addresses.SushiSwap_ADoge_WETH,
        addresses.SushiSwap_WETH_ARB,
        addresses.HOP_USDC_LP,
        addresses.mooSushiWethUsdc,
      ];

      await tokenRegistry.enablePermittedTokens(
        [addresses.WBTC, addresses.WETH, addresses.ARB, addresses.USDCe],
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
        _whitelistTokens: false,
      });

      const indexAddress = await indexFactory.getIndexList(0);
      indexInfo = await indexFactory.IndexSwapInfolList(0);
      indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
      rebalancing = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo.rebalancing);
      exchange = await ethers.getContractAt(Exchange__factory.abi, indexInfo.exchangeHandler);
      accessController = await ethers.getContractAt(AccessController__factory.abi, await indexSwap.accessController());
      console.log(await indexSwap.callStatic.accessController());
      metaAggregator = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo.metaAggregator);
    });

    describe("Mixed Protocols", async function () {
      it("should check Index token name and symbol", async () => {
        expect(await indexSwap.name()).to.eq("INDEXLY");
        expect(await indexSwap.symbol()).to.eq("IDX");
      });

      it("initialize should revert if total Weights not equal 10,000", async () => {
        await expect(indexSwap.initToken([addresses.ARB, addresses.WBTC, addresses.WETH], [100, 1000, 100]))
          .to.be.revertedWithCustomError(indexSwap, "InvalidWeights")
          .withArgs("10000");
      });

      it("Initialize should fail if the number of tokens exceed the max limit set during deployment (current = 15)", async () => {
        await expect(
          indexSwap.initToken(
            [
              addresses.ARB,
              addresses.WETH,
              addresses.WBTC,
              addresses.cETH,
              addresses.cDAI,
              addresses.cBTC,
              addresses.aArbDAI,
              addresses.aArbUSDC,
              addresses.aArbUSDT,
              addresses.aArbLINK,
              addresses.aArbWBTC,
              addresses.aArbWETH,
              addresses.DAI,
              addresses.USDCe,
              addresses.LINK,
              addresses.ADoge,
              addresses.USDT,
            ],
            [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 2000, 3000, 2000, 2000, 100, 100, 100],
          ),
        ).to.be.revertedWithCustomError(indexSwap, "TokenCountOutOfLimit");
      });

      it("should retrieve the current max asset limit from the TokenRegistry", async () => {
        expect(await tokenRegistry.getMaxAssetLimit()).to.equal(15);
      });

      it("should update the max asset limit to 10 in the TokenRegistry", async () => {
        await tokenRegistry.setMaxAssetLimit(10);
      });

      it("should retrieve the current max asset limit from the TokenRegistry", async () => {
        expect(await tokenRegistry.getMaxAssetLimit()).to.equal(10);
      });

      it("Initialize should fail if the number of tokens exceed the max limit set by the Registry (current = 10)", async () => {
        await expect(
          indexSwap.initToken(
            [
              addresses.ARB,
              addresses.WETH,
              addresses.WBTC,
              addresses.cETH,
              addresses.cDAI,
              addresses.cBTC,
              addresses.aArbDAI,
              addresses.aArbUSDC,
              addresses.aArbUSDT,
              addresses.aArbLINK,
              addresses.aArbWBTC,
              addresses.aArbWETH,
            ],
            [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 4000, 5000],
          ),
        ).to.be.revertedWithCustomError(indexSwap, "TokenCountOutOfLimit");
      });

      it("Initialize IndexFund Tokens", async () => {
        await indexSwap.initToken(
          [addresses.mooSushiWethUsdc, addresses.HOP_USDC_LP, addresses.WETH],
          [5000, 2000, 3000],
        );
      });

      it("should add pid", async () => {
        await apeSwapLPHandler.connect(owner).pidMap([addresses.ApeSwap_WBTC_USDCe], [0]);
      });

      it("should remove pid", async () => {
        await apeSwapLPHandler.connect(owner).pidMap([addresses.ApeSwap_WBTC_USDT], [39]);

        expect(await apeSwapLPHandler.connect(owner).removePidMap([addresses.ApeSwap_WBTC_USDT], [39]));
      });

      it("asset manager should not be able to add token which is not approved in registry", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.setPermittedTokens([addresses.LINK])).to.be.revertedWithCustomError(
          assetManagerConfig,
          "TokenNotPermitted",
        );
      });

      it("Invest 0.16 WETH should not revert , if investing token is not initialized", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        console.log("indexSupplyBefore", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200", "200"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "167352683749194728",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "167352683749194728",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        await exchange.on("returnedUninvestedFunds", (_to: any, _token: any, _balance: any, _time: any) => {
          expect(owner.address).to.be.equal(_to);
          expect(Number(_balance)).to.be.greaterThan(0);
        });
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        const exchangeBalance = await provider.getBalance(exchange.address);
        expect(Number(exchangeBalance)).to.be.equal(0);
        expect(Number(CoolDownAfter)).to.be.greaterThan(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 10 USDT should revert , if investing token is not initialized", async () => {
        await expect(
          indexSwap.investInFund({
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "10000000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.USDT,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "InvalidToken");
      });

      it("asset manager should be able to add token which is approved in registry", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.setPermittedTokens([addresses.ARB, addresses.USDCe]);
      });

      // it("Invest 0.1 WETH into Top10 fund should fail if LP slippage is invalid", async () => {
      //   await expect(
      //     indexSwap.investInFund(
      //       {
      //         _slippage: ["500", "500", "500"],
      //         _lpSlippage: ["2800", "2800", "2800"],
      //         _tokenAmount: "100000000000000000",
      //         _swapHandler: swapHandler.address,
      //         _token: addresses.WETH,
      //       },
      //       {
      //         value: "100000000000000000",
      //       },
      //     ),
      //   ).to.be.revertedWithCustomError(swapHandler, "InvalidSlippageLength");
      // });

      it("Invest 0.1 WETH into Top10 fund", async () => {
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("owner address", owner.address);
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 10 USDT into Top10 fund", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        const usdtToken = ERC20.attach(addresses.USDCe);
        const ethtoken = ERC20.attach(addresses.WETH);
        const btctoken = ERC20.attach(addresses.WBTC);
        const arbtoken = ERC20.attach(addresses.ARB);
        // console.log("swap start");

        const swapResult = await swapHandler.connect(owner).swapETHToTokens("1000", addresses.USDCe, owner.address, {
          value: "1000000000000000000",
        });

        // console.log("swap done");
        await usdtToken.approve(indexSwap.address, "19826472847483927477");
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("10busd before", indexSupplyBefore);

        await indexSwap.investInFund({
          _slippage: ["900", "900", "900"],
          _lpSlippage: ["800", "800", "800"],
          _tokenAmount: "19826472",
          _swapHandler: swapHandler.address,
          _token: addresses.USDCe,
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        // console.log("10BUSD After", indexSupplyAfter);
        await exchange.on("returnedUninvestedFunds", (_to: any, _token: any, _balance: any, _time: any) => {
          expect(owner.address).to.be.equal(_to);
          expect(Number(_balance)).to.be.greaterThan(0);
        });
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.00001 WETH into Top10 fund should fail", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await expect(
          indexSwap.investInFund(
            {
              _slippage: ["200", "200", "200"],
              _lpSlippage: ["200", "200", "200"],
              _tokenAmount: "10000000000000",
              _swapHandler: swapHandler.address,
              _token: addresses.WETH,
            },
            {
              value: "10000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "WrongInvestmentAmount");
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Should change expectedRangeDecimal", async () => {
        await tokenRegistry.setExceptedRangeDecimal("10000");
        expect(await tokenRegistry.exceptedRangeDecimal()).to.be.equal(Number(10000));
      });

      it("Invest 2 WETH into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["500", "500", "500"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should return false if both of the token in pool is not WETH", async () => {
        expect(await exchange.callStatic.isWETH(addresses.MAIN_LP_USDT, wombatHandler.address)).to.be.false;
      });

      it("Invest 1 WETH into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["700", "700", "700"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Investment should fail when contract is paused", async () => {
        await rebalancing.setPause(true);
        await expect(
          indexSwap.investInFund(
            {
              _slippage: ["200", "200", "200"],
              _lpSlippage: ["200", "200", "200"],
              _tokenAmount: "1000000000000000000",
              _swapHandler: swapHandler.address,
              _token: addresses.WETH,
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

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights(
          [3333, 5667, 1000],
          ["500", "500", "500"],
          ["1000", "1000", "1000"],
          swapHandler.address,
        );
      });

      it("updateTokens should revert if total Weights not equal 10,000", async () => {
        await expect(
          rebalancing.updateTokens({
            tokens: [addresses.HOP_USDC_LP, addresses.WETH, addresses.USDT, addresses.USDCe],
            _swapHandler: swapHandler.address,
            denorms: [2000, 5000, 1000, 1000],
            _slippageSell: ["200", "200", "200"],
            _slippageBuy: ["200", "200", "200", "200"],
            _lpSlippageSell: ["200", "200", "200"],
            _lpSlippageBuy: ["200", "200", "200", "200"],
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

      it("new asset manager should update tokens", async () => {
        await rebalancing.connect(nonOwner).updateTokens({
          tokens: [addresses.MAIN_LP_USDT, addresses.MAIN_LP_USDCe, addresses.MAIN_LP_DAI, addresses.WETH],
          _swapHandler: swapHandler.address,
          denorms: [2000, 5000, 1000, 2000],
          _slippageSell: ["200", "200", "200"],
          _slippageBuy: ["700", "700", "700", "700"],
          _lpSlippageSell: ["700", "700", "700"],
          _lpSlippageBuy: ["700", "700", "700", "700"],
        });
      });

      it("withdrawal should revert when contract is paused", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        const AMOUNT = ethers.BigNumber.from(amountIndexToken).add(1); //

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["200", "800", "200", "200"],
            _lpSlippage: ["200", "200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
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
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        const AMOUNT = ethers.BigNumber.from(amountIndexToken).add(1); //

        await expect(
          indexSwap.connect(nonOwner).withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["200", "800", "200", "200"],
            _lpSlippage: ["200", "200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "CallerNotHavingGivenTokenAmount");
      });

      it("should fail withdraw when balance falls below min investment amount", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT.sub("1000000000000"),
            _slippage: ["200", "800", "200", "200"],
            _lpSlippage: ["200", "200", "200", "200"],
            isMultiAsset: false,
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          }),
        )
          .to.be.revertedWithCustomError(indexSwap, "BalanceCantBeBelowVelvetMinInvestAmount")
          .withArgs("3000000000000000000");
      });

      it("should fail withdraw when balance falls below min investment amount (multi asset)", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1WETH

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT.sub("1000000000000"),
            _slippage: ["200", "800", "200", "200"],
            _lpSlippage: ["200", "200", "200", "200"],
            isMultiAsset: true,
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          }),
        )
          .to.be.revertedWithCustomError(indexSwap, "BalanceCantBeBelowVelvetMinInvestAmount")
          .withArgs("3000000000000000000");
      });

      it("should withdraw fund and burn index token successfully", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1WETH
        // console.log(AMOUNT);

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["400", "800", "400", "400"],
          _lpSlippage: ["700", "700", "700", "700"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: addresses.WETH,
        });

        expect(txObject.confirmations).to.equal(1);
      });

      it("Invest 0.1WETH into Top10 fund", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken");
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["300", "300", "300", "300"],
            _lpSlippage: ["500", "500", "500", "500"],
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
        // console.log(indexSupplyAfter);
      });

      it("Invest 0.1WETH into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["300", "300", "300", "300"],
            _lpSlippage: ["500", "500", "500", "500"],
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
        // console.log(indexSupplyAfter);
      });

      it("Invest 1WETH into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["300", "300", "300", "300"],
            _lpSlippage: ["800", "800", "800", "800"],
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
        // console.log(indexSupplyAfter);
      });

      it("Invest 1 WETH into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["700", "700", "700", "700"],
            _lpSlippage: ["800", "800", "800", "800"],
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
        // console.log(indexSupplyAfter);
      });

      it("should withdraw fund in ETH and burn index token successfully", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken");
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const ethtoken = ERC20.attach(addresses.WETH);
        const balanceBefore = await ethtoken.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1WETH

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["700", "900", "700", "700"],
          _lpSlippage: ["200", "200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: addresses.WETH,
        });

        expect(txObject.confirmations).to.equal(1);
      });

      it("Invest 0.1 WETH into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["700", "900", "700", "700"],
            _lpSlippage: ["800", "800", "800", "800"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "100000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
      });

      it("Invest 0.1 WETH into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["700", "900", "700", "700"],
            _lpSlippage: ["800", "800", "800", "800"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: addresses.WETH,
          },
          {
            value: "100000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
      });

      it("should withdraw tokens directly instead of WETH", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["200", "800", "200", "200"],
          _lpSlippage: ["800", "800", "800", "800"],
          isMultiAsset: true,
          _swapHandler: swapHandler.address,
          _token: addresses.WETH,
        });
      });
    });
  });
});
