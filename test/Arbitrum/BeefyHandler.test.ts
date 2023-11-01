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
  compoundHandlerv3,
  beefyHandler,
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

describe.only("Tests for Beefy", () => {
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

  describe("Tests for Beefy Handler", () => {
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
    });

    describe("Beefy Handler", async function () {
      it("should lend tokens mooHopEth", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const mooHopEthToken = ERC20.attach(addresses.mooHopEth);
        const balanceBefore = await mooHopEthToken.balanceOf(owner.address);
        const lend = await beefyHandler.deposit(
          addresses.mooHopEth,
          [10000000000000, 0],
          "600",
          owner.address,
          owner.address,{
            value : "10000000000000"
          }
        );
        lend.wait();
        const balanceAfter = await mooHopEthToken.balanceOf(owner.address);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
      });

      it("should lend tokens mooHopUsdc", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const mooHopUsdcToken = ERC20.attach(addresses.mooHopUsdc);
        const balanceBefore = await mooHopUsdcToken.balanceOf(owner.address);
        const usdce = ERC20.attach(addresses.USDCe);
        const swapResult = await swapHandler
          .swapETHToTokens("1000", addresses.USDCe, beefyHandler.address, {
            value: "1000000000000",
          });
        const balanceToken = await usdce.balanceOf(beefyHandler.address);
        const lend = await beefyHandler.deposit(
          addresses.mooHopUsdc,
          [balanceToken, 0],
          "600",
          owner.address,
          owner.address,
        );
        lend.wait();
        const balanceAfter = await mooHopUsdcToken.balanceOf(owner.address);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
      });

      it("should redeem tokens", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const mooHopEthToken = ERC20.attach(addresses.mooHopEth);

        const balanceBefore = await mooHopEthToken.balanceOf(owner.address);

        await mooHopEthToken.transfer(beefyHandler.address, balanceBefore.sub("100"));
        const balanceHandler = await mooHopEthToken.balanceOf(beefyHandler.address);

        const redeem = await beefyHandler.redeem({
          _yieldAsset: addresses.mooHopEth,
          _amount: balanceHandler.sub("100"),
          _lpSlippage: "600",
          _to: owner.address,
          isWETH: true,
        });
        redeem.wait();

        const balanceAfter = await mooHopEthToken.balanceOf(owner.address);
        expect(Number(balanceBefore)).to.be.greaterThan(Number(balanceAfter));
      });

      it("gets underlying asset of the token", async () => {
        const result = await beefyHandler.getUnderlying(addresses.mooHopEth);
        expect(result[0]).to.be.equal(addresses.WETH);
      });

      it("should get token balance of the token holder", async () => {
        const result = await beefyHandler.getTokenBalance(owner.address, addresses.mooHopEth);
        expect(Number(result)).to.be.greaterThan(0);
      });

      it("should get the token price in USD", async () => {
        const tokenBalance = await beefyHandler.callStatic.getTokenBalanceUSD(owner.address, addresses.mooHopEth);
        expect(Number(tokenBalance)).to.be.greaterThan(0);
      });
    });
  });
});
