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
  beefyLPHandler,
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

describe.only("Tests for BeefyLP", () => {
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
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for BeefyLP Handler", () => {
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

      iaddress = await tokenAddresses();
      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");

      const registry = await upgrades.deployProxy(
        TokenRegistry,
        ["3000000000000000000", "120000000000000000000000", treasury.address, addresses.WBNB],
        { kind: "uups" },
      );

      tokenRegistry = TokenRegistry.attach(registry.address);
      await tokenRegistry.setCoolDownPeriod("1");

      const PancakeSwapHandler = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

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

      swapHandler1.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary?.address,
        },
      });
      exchange1 = await Exchange.deploy();
      await exchange1.deployed();
      tokenRegistry.enableSwapHandlers([swapHandler.address, swapHandler1.address]);
      tokenRegistry.addNonDerivative(wombatHandler.address);

      // tokenRegistry.enablePermittedTokens([addresses.USDT],[priceOracle.address]);

      let whitelistedTokens = [
        addresses.mooWOMBUSDLP,
        addresses.mooBTCBUSDLP,
        addresses.mooBTCBNB,
        addresses.mooBTCBETH,
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

    describe("BeefyLP Handler", async function () {
      it("should lend tokens mooCAKEBNBLP", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const mooLPToken = ERC20.attach(addresses.mooCAKEBNBLP);
        const balanceBefore = await mooLPToken.balanceOf(owner.address);
        const CAKE = ERC20.attach(addresses.CAKE_Address);

        const swapResult = await swapHandler.swapETHToTokens("1000", addresses.CAKE_Address, owner.address, {
          value: "10000000000000000",
        });
        await CAKE.transfer(beefyLPHandler.address, "1460000000000000000");
        const lend = await beefyLPHandler.deposit(
          addresses.mooCAKEBNBLP,
          ["1000000000000000", "1460000000000000000"],
          "600",
          owner.address,
          owner.address,
          {
            value: "1000000000000000",
          },
        );
        lend.wait();
        const balanceAfter = await mooLPToken.balanceOf(owner.address);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
      });

      it("should redeem tokens", async () => {
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const mooLPToken = ERC20.attach(addresses.mooCAKEBNBLP);

        const balanceBefore = await mooLPToken.balanceOf(owner.address);

        await mooLPToken.transfer(beefyLPHandler.address, balanceBefore.sub("1000"));
        const balanceHandler = await mooLPToken.balanceOf(beefyLPHandler.address);

        const redeem = await beefyLPHandler.redeem({
          _yieldAsset: addresses.mooCAKEBNBLP,
          _amount: balanceHandler,
          _lpSlippage: "1000",
          _to: owner.address,
          isWETH: true,
        });
        redeem.wait();

        const balanceAfter = await mooLPToken.balanceOf(owner.address);
        expect(Number(balanceBefore)).to.be.greaterThan(Number(balanceAfter));
      });

      it("gets underlying asset of the token", async () => {
        const result = await beefyLPHandler.getUnderlying(addresses.mooCAKEBNBLP);
        expect(result[1]).to.be.equal(addresses.WBNB);
      });

      it("should get token balance of the token holder", async () => {
        const result = await beefyLPHandler.getTokenBalance(owner.address, addresses.mooCAKEBNBLP);
        expect(Number(result)).to.be.greaterThan(0);
      });

      it("should get the token price in USD", async () => {
        const tokenBalance = await beefyLPHandler.callStatic.getTokenBalanceUSD(owner.address, addresses.mooCAKEBNBLP);
        expect(Number(tokenBalance)).to.be.greaterThan(0);
      });
    });
  });
});
