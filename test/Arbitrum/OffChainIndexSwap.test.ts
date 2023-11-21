import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import {
  tokenAddresses,
  IAddresses,
  baseHandler,
  beefyHandler,
  wombatHandler,
  indexSwapLibrary,
  accessController,
  sushiLpHandler,
  priceOracle,
  compoundHandlerv3,
  apeSwapLPHandler,
} from "./Deployments.test";

import {
  IndexSwap,
  IndexSwap__factory,
  Exchange,
  TokenRegistry,
  Rebalancing__factory,
  IndexFactory,
  UniswapV2Handler,
  ZeroExHandler,
  KyberSwapHandler,
  SushiSwapLPHandler,
  OffChainRebalance__factory,
  OffChainIndexSwap,
  VelvetSafeModule,
  Exchange__factory,
} from "../../typechain";

import { chainIdToAddresses } from "../../scripts/networkVariables";

var chai = require("chai");
const axios = require("axios");
const qs = require("qs");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for OffChainIndex", () => {
  let accounts;
  let indexSwap: any;
  let indexSwap1: any;
  let offChainIndex: any;
  let offChainIndex1: any;
  let offChainIndex2: any;
  let iaddress: IAddresses;
  let indexSwapContract: IndexSwap;
  let offChainIndexSwap: OffChainIndexSwap;
  let indexFactory: IndexFactory;
  let swapHandler: UniswapV2Handler;
  let swapHandler1: UniswapV2Handler;
  let lpHandler: SushiSwapLPHandler;
  let exchange: any;
  let exchange1: Exchange;
  let zeroExHandler: ZeroExHandler;
  let rebalancing: any;
  let kyberSwapHandler: KyberSwapHandler;
  let rebalancing1: any;
  let velvetSafeModule: VelvetSafeModule;
  let offChainRebalance: any;
  let offChainRebalance1: any;
  let tokenRegistry: TokenRegistry;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = 42161;
  const addresses = chainIdToAddresses[chainId];
  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  describe.only("Tests for OffChainIndex contract", () => {
    before(async () => {
      accounts = await ethers.getSigners();

      [owner, investor1, nonOwner, treasury, addr1, addr2, addr3, ...addrs] = accounts;

      const provider = ethers.getDefaultProvider();

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();

      iaddress = await tokenAddresses(priceOracle.address, true);

      const ZeroExHandlerDefault = await ethers.getContractFactory("ZeroExHandler");
      zeroExHandler = await ZeroExHandlerDefault.deploy();
      await zeroExHandler.deployed();

      await tokenRegistry.initialize(
        "3000000000000000000",
        "120000000000000000000000",
        nonOwner.address,
        addresses.WETH,
      );

      await tokenRegistry.setCoolDownPeriod("1");
      await tokenRegistry.setExceptedRangeDecimal("100000");

      const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const rebalanceLibrary = await RebalanceLibrary.deploy();
      await rebalanceLibrary.deployed();

      const Rebalancing = await ethers.getContractFactory("Rebalancing", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
          RebalanceLibrary: rebalanceLibrary.address,
        },
      });
      const rebalancingDefult = await Rebalancing.deploy();
      await rebalancingDefult.deployed();

      const OffChainRebalance = await ethers.getContractFactory("OffChainRebalance", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
          RebalanceLibrary: rebalanceLibrary.address,
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

      const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
      const assetManagerConfig = await AssetManagerConfig.deploy();
      await assetManagerConfig.deployed();

      const FeeLibrary = await ethers.getContractFactory("FeeLibrary");
      const feeLibrary = await FeeLibrary.deploy();
      await feeLibrary.deployed();

      const IndexSwap = await ethers.getContractFactory("IndexSwap", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      indexSwapContract = await IndexSwap.deploy();
      await indexSwapContract.deployed();

      const OffChainIndexSwap = await ethers.getContractFactory("OffChainIndexSwap", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      offChainIndexSwap = await OffChainIndexSwap.deploy();
      await offChainIndexSwap.deployed();

      const PancakeSwapHandler = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.SushiSwapRouterAddress, priceOracle.address);

      const PancakeSwapHandler1 = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler1 = await PancakeSwapHandler1.deploy();
      await swapHandler1.deployed();

      swapHandler1.init(addresses.SushiSwapRouterAddress, priceOracle.address);

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

          // priceOracle.address,
          // priceOracle.address,
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
          iaddress.arbAddress,
          iaddress.btcAddress,
          iaddress.wethAddress,

          addresses.ARB,
          addresses.WBTC,
          addresses.WETH,

          addresses.DAI,
          addresses.ADoge,
          addresses.USDCe,

          // addresses.cETH,
          // addresses.cDAI,
          addresses.cUSDCv3,

          addresses.USDT,
          addresses.MAIN_LP_USDT,
          addresses.MAIN_LP_USDCe,
          addresses.MAIN_LP_DAI,
          addresses.ApeSwap_WBTC_USDT,
          addresses.SushiSwap_WETH_USDT,
          addresses.SushiSwap_WETH_ARB,
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
          baseHandler.address,

          // compoundHandlerv3.address,
          // compoundHandlerv3.address,
          compoundHandlerv3.address,

          baseHandler.address,
          wombatHandler.address,
          wombatHandler.address,
          wombatHandler.address,
          apeSwapLPHandler.address,
          sushiLpHandler.address,
          sushiLpHandler.address,
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
          [addresses.base_RewardToken],

          // [addresses.base_RewardToken],
          // [addresses.base_RewardToken],
          [addresses.base_RewardToken],

          [addresses.base_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.apeSwap_RewardToken],
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
          true,
          true,
          // false,
          // false,
          false,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
      );
      registry.wait();

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      exchange1 = await Exchange.deploy();
      await exchange1.deployed();

      const ZeroExHandler = await ethers.getContractFactory("ZeroExHandler");
      zeroExHandler = await ZeroExHandler.deploy();
      await zeroExHandler.deployed();

      zeroExHandler.init("0xdef1c0ded9bec7f1a1670819833240f027b25eff", priceOracle.address);
      await zeroExHandler.addOrUpdateProtocolSlippage("800");

      const KyberSwapHandler = await ethers.getContractFactory("KyberSwapHandler");
      kyberSwapHandler = await KyberSwapHandler.deploy();
      await kyberSwapHandler.deployed();
      await kyberSwapHandler.init(addresses.KyberSwapRouter, priceOracle.address);
      await kyberSwapHandler.addOrUpdateProtocolSlippage("800");

      // Grant owner asset manager role
      await accessController.setupRole(
        "0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819",
        owner.address,
      );

      await accessController.setupRole(
        "0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16",
        owner.address,
      );

      tokenRegistry.enableSwapHandlers([swapHandler1.address]);
      tokenRegistry.enableExternalSwapHandler(zeroExHandler.address);
      tokenRegistry.enableExternalSwapHandler(kyberSwapHandler.address);
      tokenRegistry.addNonDerivative(wombatHandler.address);

      let whitelistedTokens = [
        iaddress.arbAddress,
        iaddress.btcAddress,
        iaddress.wethAddress,
        addresses.cUSDCv3,

        addresses.USDT,
        addresses.ADoge,
        addresses.ARB,
        addresses.WBTC,
        addresses.USDCe,
        addresses.DAI,
        addresses.WETH,
        addresses.MAIN_LP_USDT,
        addresses.MAIN_LP_USDCe,
        addresses.MAIN_LP_DAI,
        addresses.ApeSwap_WBTC_USDT,
        addresses.SushiSwap_WETH_USDT,
        addresses.SushiSwap_WETH_ARB,
      ];

      let whitelist = [owner.address];

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
          _assetManagerTreasury: treasury.address,
          _whitelistedTokens: whitelistedTokens,
          _public: true,
          _transferable: false,
          _transferableToPublic: false,
          _whitelistTokens: true,
        },
        [owner.address],
        1,
      );

      const indexFactoryCreate2 = await indexFactory.connect(nonOwner).createIndexNonCustodial({
        name: "INDEXLY",
        symbol: "IDX",
        maxIndexInvestmentAmount: "120000000000000000000000",
        minIndexInvestmentAmount: "3000000000000000000",
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "0",
        _exitFee: "0",
        _assetManagerTreasury: owner.address,
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

      indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

      indexSwap1 = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress1);

      rebalancing = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo.rebalancing);

      rebalancing1 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo1.rebalancing);

      console.log("here");

      let offChainIndexAddress = indexInfo.offChainIndexSwap;
      offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);

      let offChainIndexAddress1 = indexInfo1.offChainIndexSwap;
      offChainIndex1 = offChainIndexSwap.attach(offChainIndexAddress1);

      exchange = await ethers.getContractAt(Exchange__factory.abi, indexInfo.exchangeHandler);
      await tokenRegistry.enableSwapHandlers([swapHandler.address]);
      await tokenRegistry.enablePermittedTokens(
        [addresses.WETH, addresses.USDCe, addresses.ARB, addresses.WBTC, addresses.ADoge, addresses.DAI],
        [
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
          priceOracle.address,
        ],
      );

      // Granting owner index manager role to swap eth to token
      await accessController.grantRole(
        "0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16",
        owner.address,
      );

      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("IndexFactory Contract", function () {
      const weth = addresses.WETH;

      it("Initialize IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([addresses.WETH, addresses.WBTC], [5000, 5000]);
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.setPermittedTokens([
          addresses.WETH,
          addresses.USDCe,
          addresses.ARB,
          addresses.WBTC,
          addresses.ADoge,
          addresses.DAI,
        ]);
      });

      it("should add pid", async () => {
        await sushiLpHandler
          .connect(owner)
          .pidMap([addresses.SushiSwap_WETH_USDT, addresses.SushiSwap_WETH_ARB], [39, 2]);
      });

      it("Initialize 2nd IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap.attach(indexAddress);
        await index
          .connect(nonOwner)
          .initToken(
            [
              addresses.SushiSwap_WETH_USDT,
              addresses.SushiSwap_WETH_ARB,
              addresses.WETH,
              addresses.WBTC,
              addresses.MAIN_LP_USDT,
            ],
            [3000, 3000, 2000, 1000, 1000],
          );
        const config = await indexSwap1.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig
          .connect(nonOwner)
          .setPermittedTokens([
            addresses.WETH,
            addresses.USDCe,
            addresses.ARB,
            addresses.WBTC,
            addresses.ADoge,
            addresses.DAI,
          ]);
      });

      it("non-admin should not be able to call the access control setupRole function", async () => {
        await expect(
          accessController
            .connect(nonOwner)
            .setupRole("0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819", owner.address),
        ).to.be.revertedWithCustomError(accessController, "CallerNotAdmin");
      });

      it("admin should be able to call the access control setupRole function", async () => {
        await accessController
          .connect(owner)
          .setupRole("0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819", owner.address);
      });

      it("Invest 1 WETH into 1st fund ", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        await indexSwap.investInFund(
          {
            _slippage: ["300", "300"],
            _lpSlippage: ["200", "200"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: addresses.WETH,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.greaterThan(Number(CoolDownBefore));
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 2 WETH into Top10 2nd fund", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const indexSwap1 = indexSwap.attach(indexAddress);
        const indexSupplyBefore = await indexSwap1.totalSupply();

        await indexSwap1.connect(nonOwner).investInFund(
          {
            _slippage: ["700", "700", "700", "700", "700"],
            _lpSlippage: ["700", "700", "700", "700", "700"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: addresses.WETH,
          },

          {
            value: "2000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 101.8 USDCe in 1st Index fund", async () => {
        var tokens = await indexSwap.getTokens();

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = addresses.USDCe;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(nonOwner.address);
        const indexSupplyBefore = await indexSwap.totalSupply();
        const indexAddress = await indexFactory.getIndexList(0);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "101879838");
        const usdtoken = ERC20.attach(addresses.USDCe);
        await swapHandler.swapETHToTokens("200", addresses.USDCe, nonOwner.address, {
          value: "1000000000000000000",
        });
        await usdtoken.connect(nonOwner).approve(offChainIndex.address, "1000000000000000000");
        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != sellTokenAddress) {
              const params = {
                sellToken: sellTokenAddress,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        await offChainIndex.connect(nonOwner).investInFundOffChain(
          {
            sellTokenAddress: sellTokenAddress,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
          },
          "101879838",
          ["700", "700", "700"],
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(nonOwner.address);
        expect(Number(CoolDownAfter)).to.be.greaterThan(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });


      it("Invest 1 USDCe in 1st Index fund should fail (under min amount)", async () => {
        var tokens = await indexSwap.getTokens();

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000");
        const busdtoken = ERC20.attach(addresses.USDCe);
        var sellTokenAddress = addresses.USDCe;
        const swapResult = await swapHandler.swapETHToTokens("200", addresses.USDCe, nonOwner.address, {
          value: "1000000000000000000",
        });
        await busdtoken.connect(nonOwner).approve(offChainIndex.address, "100000000000000000000");

        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != sellTokenAddress) {
              const params = {
                sellToken: sellTokenAddress,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        const fund = await expect(
          offChainIndex.connect(nonOwner).investInFundOffChain(
            {
              sellTokenAddress: sellTokenAddress,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "1000000",
            ["200", "200", "200"],
          ),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "WrongInvestmentAmount");
      });

      it("Invest 50 USDCe should fail, if user input is incorrect in 2nd Index fund", async () => {
        var tokens = await indexSwap1.getTokens();

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = addresses.USDCe;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const indexAddress = await indexFactory.getIndexList(1);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "50000000");
        const usdcToken = ERC20.attach(sellTokenAddress);
        await usdcToken.connect(nonOwner).approve(offChainIndex.address, "5000000000");
        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          let buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          if (i == 1) {
            buyVal = BigNumber.from(buyVal).div(2);
          }
          if (i == 4) {
            buyVal = BigNumber.from(buyVal).add(BigNumber.from(buyVal).div(2));
          }
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != sellTokenAddress) {
              const params = {
                sellToken: sellTokenAddress,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        await expect(
          offChainIndex.connect(nonOwner).investInFundOffChain(
            {
              sellTokenAddress: sellTokenAddress,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "50000000",
            ["800", "800", "800", "800", "800"],
          ),
        ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      });

      it("Invest 100 USDCe should fail if user has sent wrong input in 2nd Index fund", async () => {
        var tokens = await indexSwap1.getTokens();

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = addresses.USDCe;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexAddress = await indexFactory.getIndexList(1);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "100000000");
        const usdctoken = ERC20.attach(addresses.USDCe);
        // console.log("ethAddreess",iaddress.ethAddress);
        const swapResult = await swapHandler.connect(owner).swapETHToTokens("200", addresses.USDCe, owner.address, {
          value: "10000000000000000000",
        });
        await usdctoken.approve(offChainIndex.address, "1000000000000");
        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != sellTokenAddress) {
              const params = {
                sellToken: sellTokenAddress,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.div(2).toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.div(2).toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.div(2).toString());
            }
          }
        }
        await expect(
          offChainIndex.investInFundOffChain(
            {
              sellTokenAddress: sellTokenAddress,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "100000000",
            ["800", "800", "800"],
          ),
        ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      });

      it("Invest 100 USDCe should fail if user tries to manipulate weight in 2nd Index", async () => {
        var tokens = await indexSwap1.getTokens();

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = addresses.USDCe;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexAddress = await indexFactory.getIndexList(1);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "100000000");
        const arbToken = ERC20.attach(sellTokenAddress);
        await arbToken.approve(offChainIndex.address, "100000000000000000000");
        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          let buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          if (i == 1) {
            buyVal = BigNumber.from(buyVal).mul(70).div(100);
          }
          if (i == 4) {
            buyVal = buyVal.add(BigNumber.from(buyVal).mul(30).div(100));
          }
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != sellTokenAddress) {
              const params = {
                sellToken: sellTokenAddress,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        await expect(
          offChainIndex.investInFundOffChain(
            {
              sellTokenAddress: sellTokenAddress,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "100000000",
            ["800", "800", "800"],
          ),
        ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      });

      // it("Invest 100 USDCe should fail if user has sent wrong input in 1st Index fund", async () => {
      //   var tokens = await indexSwap.getTokens();

      //   var buyUnderlyingTokensContract = [];
      //   var buyTokenAmountContract = [];
      //   var buyTokenSwapData = [];
      //   var sellTokenAddress = addresses.USDCe;
      //   const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

      //   const indexSupplyBefore = await indexSwap.totalSupply();
      //   // console.log("1 WETH before", indexSupplyBefore);
      //   const indexAddress = await indexFactory.getIndexList(0);
      //   let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
      //   const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
      //   //Static call for return
      //   const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "100000000");
      //   const usdcToken = ERC20.attach(sellTokenAddress);
      //   // console.log("ethAddreess",iaddress.ethAddress);
      //   const swapResult = await swapHandler.connect(owner).swapETHToTokens("200", sellTokenAddress, owner.address, {
      //     value: "10000000000000000000",
      //   });
      //   await usdcToken.approve(offChainIndex.address, "100000000");
      //   // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
      //   for (let i = 0; i < tokens.length; i++) {
      //     const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
      //     const handlerAddress = tokenInfo[2];
      //     const handler = await ethers.getContractAt("IHandler", handlerAddress);
      //     const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
      //     const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
      //     for (let j = 0; j < getUnderlyingTokens.length; j++) {
      //       if (getUnderlyingTokens[j] != sellTokenAddress) {
      //         const params = {
      //           sellToken: sellTokenAddress,
      //           buyToken: getUnderlyingTokens[j].toString(),
      //           sellAmount: buyVal.div(2).toString(),
      //           slippagePercentage: 1,
      //           gasPrice: "4000457106",
      //         };
      //         const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
      //           headers: {
      //             "0x-api-key": process.env.ZEROX_KEY,
      //           },
      //         });
      //         await delay(2000);
      //         buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
      //         buyTokenSwapData.push(response.data.data.toString());
      //         buyTokenAmountContract.push(buyVal.div(2).toString());
      //       } else {
      //         buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
      //         buyTokenSwapData.push("0x");
      //         buyTokenAmountContract.push(buyVal.div(2).toString());
      //       }
      //     }
      //   }
      //   await expect(
      //     offChainIndex.investInFundOffChain(
      //       {
      //         sellTokenAddress: sellTokenAddress,
      //         _buyToken: buyUnderlyingTokensContract,
      //         buyAmount: buyTokenAmountContract,
      //         _buySwapData: buyTokenSwapData,
      //         _offChainHandler: zeroExHandler.address,
      //       },
      //       "100000000",
      //       ["800", "800", "800"],
      //     ),
      //   ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      // });

      // it("Invest 100 USDCe should fail if user tries to manipulate weight", async () => {
      //   var tokens = await indexSwap.getTokens();

      //   var buyUnderlyingTokensContract = [];
      //   var buyTokenAmountContract = [];
      //   var buyTokenSwapData = [];
      //   var sellTokenAddress = addresses.USDCe;
      //   const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

      //   const indexSupplyBefore = await indexSwap.totalSupply();
      //   // console.log("1 WETH before", indexSupplyBefore);
      //   const indexAddress = await indexFactory.getIndexList(0);
      //   let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
      //   const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
      //   //Static call for return
      //   const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "100000000");
      //   for (let i = 0; i < tokens.length; i++) {
      //     const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
      //     const handlerAddress = tokenInfo[2];
      //     const handler = await ethers.getContractAt("IHandler", handlerAddress);
      //     const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
      //     let buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
      //     if (i == 1) {
      //       buyVal = BigNumber.from("100000000").mul(70).div(100);
      //     } else {
      //       buyVal = BigNumber.from("100000000").mul(30).div(100);
      //     }
      //     for (let j = 0; j < getUnderlyingTokens.length; j++) {
      //       if (getUnderlyingTokens[j] != sellTokenAddress) {
      //         const params = {
      //           sellToken: sellTokenAddress,
      //           buyToken: getUnderlyingTokens[j].toString(),
      //           sellAmount: buyVal.toString(),
      //           slippagePercentage: 1,
      //           gasPrice: "4000457106",
      //         };
      //         const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
      //           headers: {
      //             "0x-api-key": process.env.ZEROX_KEY,
      //           },
      //         });
      //         await delay(2000);
      //         buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
      //         buyTokenSwapData.push(response.data.data.toString());
      //         buyTokenAmountContract.push(buyVal.toString());
      //       } else {
      //         buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
      //         buyTokenSwapData.push("0x");
      //         buyTokenAmountContract.push(buyVal.toString());
      //       }
      //     }
      //   }
      //   await expect(
      //     offChainIndex.investInFundOffChain(
      //       {
      //         sellTokenAddress: sellTokenAddress,
      //         _buyToken: buyUnderlyingTokensContract,
      //         buyAmount: buyTokenAmountContract,
      //         _buySwapData: buyTokenSwapData,
      //         _offChainHandler: zeroExHandler.address,
      //       },
      //       "100000000",
      //       ["800", "800", "800"],
      //     ),
      //   ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      // });

      it("Invest 1 WETH into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();

        await indexSwap.investInFund(
          {
            _slippage: ["800", "800"],
            _lpSlippage: ["800", "800"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: addresses.WETH,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 0.1 WETH in 2nd Index fund", async () => {
        var tokens = await indexSwap1.getTokens();

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap1.totalSupply();
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap1.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex
          .connect(nonOwner)
          .callStatic.calculateSwapAmountsOffChain(indexAddress, "100000000000000000");
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: weth,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        const fund = await offChainIndex.connect(nonOwner).investInFundOffChain(
          {
            sellTokenAddress: weth,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
          },
          "100000000000000000",
          ["800", "800", "800", "800", "800"],
          {
            value: "100000000000000000",
          },
        );

        await fund.wait();

        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 1 WETH into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();

        const tokens = await indexSwap.getTokens();

        const v = await indexSwap.vault();

        await indexSwap.investInFund(
          {
            _slippage: ["800", "800"],
            _lpSlippage: ["800", "800"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: addresses.WETH,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("redeem should fail if a non-permitted and non-WETH token is passed as the out asset", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Mining the tx
        await expect(
          offChainIndex.redeemTokens({
            tokenAmount: AMOUNT,
            _lpSlippage: ["200", "200", "200", "200", "200"],
            token: iaddress.linkAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "InvalidToken");
      });

      it("should withdraw properly with rebalance in between", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);
        var sellAmount;

        var allUnderlying: string[] = [];
        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 eth before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        const ownerBalanceBefore = await owner.getBalance();
        //Mining the tx
        sellAmount = await offChainIndex.redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["200", "200", "200", "200", "200"],
          token: weth,
        });
        await sellAmount.wait();

        const abiCoder = ethers.utils.defaultAbiCoder;
        var userTokens = abiCoder.decode(["address[]"], (await offChainIndex.userWithdrawData(owner.address))[3]);
        var tokens = userTokens[0];
        type Map = {
          [key: string]: BigNumber;
        };
        let m: Map = {};
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          let getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          var result = await offChainIndex.getTokenAmounts(owner.address, tokens[i]);
          for (var j = 0; j < result.length; j++) {
            m[getUnderlyingTokens[j]] = BigNumber.from(m[getUnderlyingTokens[j]] || 0).add(BigNumber.from(result[j]));
          }
        }
        //Static call for return

        for (let key in m) {
          if (key != weth) {
            await delay(2000);
            const params = {
              sellToken: key.toString(),
              buyToken: weth,
              sellAmount: m[key].toString(),
              slippagePercentage: 1,
              gasPrice: "4000457106",
              gas: "350000",
            };
            const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });
            sellTokensContract.push(key);
            sellTokenSwapData.push(response.data.data.toString());
            sellTokenAmountContract.push(m[key].toString());
          } else {
            sellTokensContract.push(key);
            sellTokenSwapData.push("0x");
            sellTokenAmountContract.push(m[key].toString());
          }
        }

        console.log("--------Updating Tokens------");

        await rebalancing.updateTokens({
          tokens: [addresses.WETH, addresses.SushiSwap_WETH_ARB, addresses.WBTC],
          _swapHandler: swapHandler.address,
          denorms: [2000, 4000, 4000],
          _slippageSell: ["800", "800"],
          _slippageBuy: ["800", "800", "800"],
          _lpSlippageSell: ["800", "800"],
          _lpSlippageBuy: ["800", "800", "800"],
        });

        const token = await indexSwap.getTokens();
        let balancesInUsd = [];
        let total = 0;
        const vault = await indexSwap.vault();

        for (let i = 0; i < token.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(token[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(token[i]);

          // TODO after price oracle merge we can get the lp price from the price oracle
          if (getUnderlyingTokens.length > 0) {
            balancesInUsd[i] = await handler.callStatic.getTokenBalanceUSD(vault, token[i]);
          } else {
            const balance = await ERC20.attach(token[i]).balanceOf(vault);
            balancesInUsd[i] = await priceOracle.getPriceTokenUSD18Decimals(token[i], balance);
          }

          total += Number(balancesInUsd[i]);
        }

        for (let i = 0; i < token.length; i++) {
          console.log(`Percentage token ${i} : `, (Number(balancesInUsd[i]) / Number(total)).toString());
        }

        console.log("--------Withdrawing----------");
        const fund = await offChainIndex.withdrawOffChain({
          sellTokenAddress: sellTokensContract,
          sellAmount: sellTokenAmountContract,
          buySwapData: sellTokenSwapData,
          offChainHandler: zeroExHandler.address,
        });

        await fund.wait();
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log(indexSupplyAfter);
        const ownerBalanceAfter = await owner.getBalance();
        expect(Number(indexSupplyBefore)).to.be.greaterThan(Number(indexSupplyAfter));
        console.log("Owner Balance Diff", BigNumber.from(ownerBalanceAfter).sub(BigNumber.from(ownerBalanceBefore)));
        expect(Number(ownerBalanceAfter)).to.be.greaterThan(Number(ownerBalanceBefore));

        for (let j = 0; j < sellTokensContract.length; j++) {
          expect(Number(await offChainIndex.userUnderlyingAmounts(owner.address, sellTokensContract[j]))).to.be.equal(
            Number(0),
          );
        }
      });

      it("Invest 1 WETH into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 WETH before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["800", "800", "800"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: addresses.WETH,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should revert if sellToken address length is manupilated and triggermultiple withdrawal", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);
        var sellAmount;

        var allUnderlying: string[] = [];
        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Mining the tx
        sellAmount = await offChainIndex.redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["200", "200", "200", "200", "200"],
          token: weth,
        });
        await sellAmount.wait();

        const abiCoder = ethers.utils.defaultAbiCoder;
        var userTokens = abiCoder.decode(["address[]"], (await offChainIndex.userWithdrawData(owner.address))[3]);
        var tokens = userTokens[0];
        type Map = {
          [key: string]: BigNumber;
        };
        let m: Map = {};
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          let getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          var result = await offChainIndex.getTokenAmounts(owner.address, tokens[i]);
          for (var j = 0; j < result.length; j++) {
            m[getUnderlyingTokens[j]] = BigNumber.from(m[getUnderlyingTokens[j]] || 0).add(BigNumber.from(result[j]));
          }
        }

        for (let key in m) {
          if (key != weth) {
            await delay(2000);
            const params = {
              sellToken: key.toString(),
              buyToken: weth,
              sellAmount: m[key].toString(),
              slippagePercentage: 1,
              gasPrice: "4000457106",
              gas: "350000",
            };
            const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });
            sellTokensContract.push(key);
            sellTokenSwapData.push(response.data.data.toString());
            sellTokenAmountContract.push(m[key].toString());
          }
        }
        console.log("--------Withdrawing----------");
        const fund = await expect(
          offChainIndex.withdrawOffChain({
            sellTokenAddress: sellTokensContract,
            sellAmount: sellTokenAmountContract,
            buySwapData: sellTokenSwapData,
            offChainHandler: zeroExHandler.address,
          }),
        ).to.be.revertedWithCustomError(offChainIndex, "InvalidLength");

        await offChainIndex.triggerMultipleTokenWithdrawal();
        for (let j = 0; j < sellTokensContract.length; j++) {
          expect(Number(await offChainIndex.userUnderlyingAmounts(owner.address, sellTokensContract[j]))).to.be.equal(
            Number(0),
          );
        }
      });

      it("Invest 1 WETH into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 WETH before", indexSupplyBefore);
        await indexSwap.connect(owner).investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: addresses.WETH,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should Update Weights and Rebalance for 2nd Index", async () => {
        await rebalancing1
          .connect(nonOwner)
          .updateWeights(
            [4667, 1333, 2000, 1000, 1000],
            ["800", "800", "800", "800", "800"],
            ["800", "800", "800", "800", "800"],
            swapHandler.address,
          );
      });

      it("Invest 2 WETH in 2nd Index fund using kyberswap", async () => {
        var tokens = await indexSwap1.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap1.totalSupply();
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap1.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "2000000000000000000");
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                tokenIn: addresses.WETH,
                tokenOut: getUnderlyingTokens[j].toString(),
                amountIn: buyVal.toString(),
              };
              const getResponse = await axios.get(addresses.kyberSwapUrl + `${qs.stringify(params)}`, {
                headers: {
                  "x-client-id": "velvet_capital",
                },
              });

              const postResponse = await axios.post(addresses.kyberSwapPostUrl, {
                routeSummary: getResponse.data.data.routeSummary,
                sender: kyberSwapHandler.address,
                recipient: kyberSwapHandler.address,
                slippageTolerance: 300,
              });

              // await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(postResponse.data.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        const fund = await offChainIndex.connect(nonOwner).investInFundOffChain(
          {
            sellTokenAddress: weth,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: kyberSwapHandler.address,
          },
          "2000000000000000000",
          ["1000", "1000", "1000", "1000", "1000"],
          {
            value: "2000000000000000000",
          },
        );

        await fund.wait();

        const indexSupplyAfter = await indexSwap1.totalSupply();
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("should swap using handler", async () => {
        //0.1 WETH

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        await swapHandler.swapETHToTokens("200", addresses.USDCe, owner.address, {
          value: "1000000000000000000",
        });
        const params = {
          tokenIn: addresses.USDCe,
          tokenOut: addresses.ARB,
          amountIn: "100000000",
        };
        const getResponse = await axios.get(addresses.kyberSwapUrl + `${qs.stringify(params)}`, {
          headers: {
            "x-client-id": "velvet_capital",
          },
        });

        const postResponse = await axios.post(addresses.kyberSwapPostUrl, {
          routeSummary: getResponse.data.data.routeSummary,
          sender: kyberSwapHandler.address,
          recipient: kyberSwapHandler.address,
          slippageTolerance: 300,
        });

        await ERC20.attach(addresses.USDCe).transfer(kyberSwapHandler.address, "100000000");

        const balanceBefore = await ERC20.attach(addresses.ARB).balanceOf(owner.address);

        await kyberSwapHandler.swap(
          addresses.USDCe,
          addresses.ARB,
          "100000000",
          postResponse.data.data.data.toString(),
          owner.address,
        );

        const balanceAfter = await ERC20.attach(addresses.ARB).balanceOf(owner.address);
        expect(balanceAfter).to.be.greaterThan(balanceBefore);
      });

      it("Invest 2 WETH in 1st Index fund", async () => {
        var tokens = await indexSwap.getTokens();

        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex
          .connect(addr2)
          .callStatic.calculateSwapAmountsOffChain(indexAddress, "2000000000000000000");

        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length).sub(200);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: weth,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        const fund = await offChainIndex.connect(nonOwner).investInFundOffChain(
          {
            sellTokenAddress: weth,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
          },
          "2000000000000000000",
          ["200", "200", "200"],
          {
            value: "2000000000000000000",
          },
        );

        await fund.wait();

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Investment should fail when the sell token is wrong in the calldata but correct in the contract data", async () => {
        var tokens = await indexSwap.getTokens();

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000000000000000");

        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: addresses.USDCe,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        await expect(
          offChainIndex.connect(addr2).investInFundOffChain(
            {
              sellTokenAddress: weth,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "1000000000000000000",
            ["200", "200", "200"],
            {
              value: "1000000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(zeroExHandler, "SwapFailed");
      });

      it("Investment should fail when the sell token is passed as zero address to the invest function (correct calldata, wrong contract data)", async () => {
        var tokens = await indexSwap.getTokens();

        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        //Static call for return
        const result = await offChainIndex
          .connect(addr2)
          .callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000000000000000");

        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length).sub(200);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: weth,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }

        await expect(
          offChainIndex.connect(addr2).investInFundOffChain(
            {
              sellTokenAddress: "0x0000000000000000000000000000000000000000",
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "1000000000000000000",
            ["200", "200", "200"],
            {
              value: "1000000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(offChainIndex, "InvalidToken");
      });

      it("Investment should fail when the sell token is manipulated for the invest function (correct calldata, wrong contract data)", async () => {
        var tokens = await indexSwap.getTokens();

        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        //Static call for return
        const result = await offChainIndex
          .connect(addr2)
          .callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000000000000000");

        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length).sub(200);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: weth,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }

        await expect(
          offChainIndex.connect(addr2).investInFundOffChain(
            {
              sellTokenAddress: addresses.USDC,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "1000000000000000000",
            ["200", "200", "200"],
            {
              value: "1000000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(offChainIndex, "InvalidToken");
      });

      it("Investment should fail when the buy token amount is manipulated in the invest function (correct calldata, wrong contract data)", async () => {
        var tokens = await indexSwap.getTokens();

        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        //Static call for return
        const result = await offChainIndex
          .connect(addr2)
          .callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000000000000000");

        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length).sub(200);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: weth,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }

        buyTokenAmountContract[0] = BigNumber.from(buyTokenAmountContract[0]).add("3000000000000000000").toString();
        await expect(
          offChainIndex.connect(addr2).investInFundOffChain(
            {
              sellTokenAddress: weth,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "1000000000000000000",
            ["200", "200", "200"],
            {
              value: "1000000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      });

      it("should fail if offchainHandler is not valid", async () => {
        var tokens = await indexSwap1.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap1.totalSupply();
        const indexAddress = await indexFactory.getIndexList(1);
        //Static call for return
        const result = await offChainIndex1.callStatic.calculateSwapAmountsOffChain(
          indexAddress,
          "2000000000000000000",
        );
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: weth,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        await expect(
          offChainIndex1.connect(nonOwner).investInFundOffChain(
            {
              sellTokenAddress: weth,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: swapHandler.address,
            },
            "2000000000000000000",
            ["1000", "1000", "1000", "1000", "1000"],
            {
              value: "2000000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(offChainIndex, "OffHandlerNotEnabled");
      });

      it("Invest 1 weth in 1st Index fund should revert if weth value is greater than 0 and investment token is not weth", async () => {
        var tokens = await indexSwap.getTokens();

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000000000000000");

        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            let response: any;
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: weth,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        await expect(
          offChainIndex.connect(nonOwner).investInFundOffChain(
            {
              sellTokenAddress: addresses.USDCe,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "1000000000000000000",
            ["800", "800", "800"],
            {
              value: "1000000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(indexSwap, "InvalidToken");
      });

      it("withdraw should fail if user balance falls below min amount", async () => {
        // var tokens = await indexSwap.getTokens();
        const indexAddress = await indexFactory.getIndexList(0);
        //Mining the tx

        const amountIndexToken = await indexSwap.balanceOf(nonOwner.address);
        let AMOUNT = ethers.BigNumber.from(amountIndexToken); //1WETH
        AMOUNT = AMOUNT.sub("1000000000000000"); //1WETH
        await expect(
          offChainIndex.connect(nonOwner).redeemTokens({
            tokenAmount: AMOUNT.toString(),
            _lpSlippage: ["600", "600", "600"],
            token: weth,
          }),
        )
          .to.be.revertedWithCustomError(indexSwap, "BalanceCantBeBelowVelvetMinInvestAmount")
          .withArgs("3000000000000000000");
      });

      it("should withdraw fund and burn index token successfully for 1st Index, simultaneously for both user", async () => {
        // var tokens = await indexSwap.getTokens();
        var sellAmount;

        var allUnderlying: string[] = [];
        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];

        var sellTokensContract2 = [];
        var sellTokenAmountContract2 = [];
        var sellTokenSwapData2 = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        //Mining the tx

        const user2WETHBalanceBefore = await nonOwner.getBalance();
        const amountIndexToken2 = await indexSwap.balanceOf(nonOwner.address);

        const AMOUNT2 = ethers.BigNumber.from(amountIndexToken2); //1WETH
        sellAmount = await offChainIndex.connect(nonOwner).redeemTokens({
          tokenAmount: AMOUNT2,
          _lpSlippage: ["600", "600", "600"],
          token: weth,
        });
        await sellAmount.wait();

        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1WETH
        sellAmount = await offChainIndex.redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["600", "600", "600"],
          token: weth,
        });
        await sellAmount.wait();

        const abiCoder = ethers.utils.defaultAbiCoder;
        var userTokens = abiCoder.decode(["address[]"], (await offChainIndex.userWithdrawData(nonOwner.address))[3]);
        var tokens = userTokens[0];

        //Static call for return
        type Map2 = {
          [key: string]: BigNumber;
        };
        let m2: Map2 = {};
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          let getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          var result = await offChainIndex.getTokenAmounts(nonOwner.address, tokens[i]);
          for (var j = 0; j < result.length; j++) {
            m2[getUnderlyingTokens[j]] = BigNumber.from(m2[getUnderlyingTokens[j]] || 0).add(BigNumber.from(result[j]));
          }
        }
        for (let key in m2) {
          if (key != weth) {
            const params = {
              sellToken: key.toString(),
              buyToken: weth,
              sellAmount: m2[key].toString(),
              slippagePercentage: 1,
              gasPrice: "4000457106",
              gas: "350000",
            };
            const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });
            sellTokensContract.push(key);
            sellTokenSwapData.push(response.data.data.toString());
            sellTokenAmountContract.push(m2[key].toString());
          } else {
            sellTokensContract.push(key);
            sellTokenSwapData.push("0x");
            sellTokenAmountContract.push(m2[key].toString());
          }
        }
        const fund = await offChainIndex.connect(nonOwner).withdrawOffChain({
          sellTokenAddress: sellTokensContract,
          sellAmount: sellTokenAmountContract,
          buySwapData: sellTokenSwapData,
          offChainHandler: zeroExHandler.address,
        });

        await fund.wait();
        const user2WETHBalanceAfter = await nonOwner.getBalance();
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyBefore)).to.be.greaterThan(Number(indexSupplyAfter));
        for (let j = 0; j < sellTokensContract.length; j++) {
          expect(
            Number(await offChainIndex.userUnderlyingAmounts(nonOwner.address, sellTokensContract[j])),
          ).to.be.equal(Number(0));
        }
        expect(Number(user2WETHBalanceAfter)).to.be.greaterThan(Number(user2WETHBalanceBefore));

        const ownerBALANCEBefore = await owner.getBalance();
        await sellAmount.wait();

        var userTokens = abiCoder.decode(["address[]"], (await offChainIndex.userWithdrawData(owner.address))[3]);
        var tokens = userTokens[0];

        type Map = {
          [key: string]: BigNumber;
        };
        let m: Map = {};
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          let getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          var result = await offChainIndex.getTokenAmounts(owner.address, tokens[i]);
          for (var j = 0; j < result.length; j++) {
            m[getUnderlyingTokens[j]] = BigNumber.from(m[getUnderlyingTokens[j]] || 0).add(BigNumber.from(result[j]));
          }
        }

        const indexSupplyBefore2 = await indexSwap.totalSupply();
        for (let key in m) {
          if (key != weth) {
            const params = {
              sellToken: key.toString(),
              buyToken: weth,
              sellAmount: m[key].toString(),
              slippagePercentage: 1,
              gasPrice: "4000457106",
              gas: "350000",
            };
            const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });
            sellTokensContract2.push(key);
            sellTokenSwapData2.push(response.data.data.toString());
            sellTokenAmountContract2.push(m[key].toString());
          } else {
            sellTokensContract2.push(key);
            sellTokenSwapData2.push("0x");
            sellTokenAmountContract2.push(m[key].toString());
          }
        }

        const fund2 = await offChainIndex.connect(owner).withdrawOffChain({
          sellTokenAddress: sellTokensContract2,
          sellAmount: sellTokenAmountContract2,
          buySwapData: sellTokenSwapData2,
          offChainHandler: zeroExHandler.address,
        });

        await fund2.wait();
        const ownerBALANCEAFTER = await owner.getBalance();

        expect(Number(ownerBALANCEAFTER)).to.be.greaterThan(Number(ownerBALANCEBefore));
        for (let j = 0; j < sellTokensContract2.length; j++) {
          expect(Number(await offChainIndex.userUnderlyingAmounts(owner.address, sellTokensContract2[j]))).to.be.equal(
            Number(0),
          );
        }
      });

      it("addr2 should invest using offchain", async () => {
        var tokens = await indexSwap1.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap1.totalSupply();
        const indexAddress = await indexFactory.getIndexList(1);
        //Mining the tx
        sellAmount = await offChainIndex
          .connect(addr2)
          .calculateSwapAmountsOffChain(indexAddress, "2000000000000000000");
        await sellAmount.wait();
        //Static call for return
        const result = await offChainIndex
          .connect(addr2)
          .callStatic.calculateSwapAmountsOffChain(indexAddress, "2000000000000000000");
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: weth,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 0.01,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        const fund = await offChainIndex1.connect(addr2).investInFundOffChain(
          {
            sellTokenAddress: weth,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
          },
          "2000000000000000000",
          ["1000", "1000", "1000", "1000", "1000", "1000"],
          {
            value: "2000000000000000000",
          },
        );

        await fund.wait();

        const indexSupplyAfter = await indexSwap1.totalSupply();
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("addr2 should emergency withdraw", async () => {
        const amountIndexToken = await indexSwap1.balanceOf(addr2.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);
        var sellAmount;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap1.totalSupply();

        let balanceBefore = [];
        type Map = {
          [key: string]: number;
        };
        let m: Map = {};
        const tokens = indexSwap1.getTokens();
        for (let i = 0; i < tokens; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          let getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          for (var j = 0; j < getUnderlyingTokens.length; j++) {
            m[getUnderlyingTokens[j]] = 0;
          }
        }
        let i = 0;
        for (let key in m) {
          balanceBefore[i] = await ERC20.attach(key).balanceOf(addr2.address);
          i++;
        }
        sellAmount = await offChainIndex1.connect(addr2).redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["800", "800", "800", "800", "800"],
          token: weth,
        });
        await sellAmount.wait();

        await offChainIndex1.connect(addr2).triggerMultipleTokenWithdrawal();
        const indexSupplyAfter = await indexSwap1.totalSupply();
        let k = 0;
        for (let key in m) {
          let balanceAfter = await ERC20.attach(key).balanceOf(addr2.address);
          expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore[k]));
          expect(await ERC20.attach(key).balanceOf(offChainIndex1.address)).to.be.equal(0);
          k++;
        }
        expect(Number(indexSupplyBefore)).to.be.greaterThan(Number(indexSupplyAfter));
      });

      it("owner should invest using offchain", async () => {
        var tokens = await indexSwap.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        const indexAddress = await indexFactory.getIndexList(0);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "2134716274827482727");
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != weth) {
              const params = {
                sellToken: weth,
                buyToken: getUnderlyingTokens[j].toString(),
                sellAmount: buyVal.toString(),
                slippagePercentage: 1,
                gasPrice: "4000457106",
                gas: "350000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(2000);
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push(response.data.data.toString());
              buyTokenAmountContract.push(buyVal.toString());
            } else {
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenSwapData.push("0x");
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
        }
        const fund = await offChainIndex.connect(owner).investInFundOffChain(
          {
            sellTokenAddress: weth,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
          },
          "2134716274827482727",
          ["200", "200", "200", "200", "200", "200"],
          {
            value: "2134716274827482727",
          },
        );
        await fund.wait();
        const indexSupplyAfter = await indexSwap.totalSupply();
        const exchangeBalance = await provider.getBalance(exchange.address);
        expect(Number(exchangeBalance)).to.be.equal(0);
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("TriggerMultiple TokenWithdrawal withdraw should fail is protocol is paused and work if protocol is unpaused", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);
        var sellAmount;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();

        let balanceBefore = [];
        type Map = {
          [key: string]: number;
        };
        let m: Map = {};
        const tokens = indexSwap1.getTokens();
        for (let i = 0; i < tokens; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          let getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          for (var j = 0; j < getUnderlyingTokens.length; j++) {
            m[getUnderlyingTokens[j]] = 0;
          }
        }
        let i = 0;
        for (let key in m) {
          balanceBefore[i] = await ERC20.attach(key).balanceOf(addr2.address);
          i++;
        }
        sellAmount = await offChainIndex.connect(owner).redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["800", "800", "800", "800", "800"],
          token: weth,
        });
        await sellAmount.wait();

        await tokenRegistry.setProtocolPause(true);
        await expect(offChainIndex.triggerMultipleTokenWithdrawal()).to.be.revertedWithCustomError(
          offChainIndex,
          "ProtocolIsPaused",
        );
        await tokenRegistry.setProtocolPause(false);
        await offChainIndex.triggerMultipleTokenWithdrawal();
        const indexSupplyAfter = await indexSwap.totalSupply();
        let balanceAfter = [];
        let k = 0;
        for (let key in m) {
          let balanceAfter = await ERC20.attach(key).balanceOf(addr2.address);
          expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore[k]));
          expect(await ERC20.attach(key).balanceOf(offChainIndex.address)).to.be.equal(0);
          k++;
        }

        expect(Number(indexSupplyBefore)).to.be.greaterThan(Number(indexSupplyAfter));
      });

      it("Non owner should not triggerMultiple TokenWithdrawal withdraw", async () => {
        await expect(offChainIndex.connect(addr3).triggerMultipleTokenWithdrawal()).to.be.revertedWithCustomError(
          offChainIndex,
          "TokensNotRedeemed",
        );
      });

      it("Invest 1 WETH into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 WETH before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["800", "800", "800"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: addresses.WETH,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Withdraw and triggerMultipleWithdrawal should fail if the protocol is paused", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1WETH
        var sellAmount;

        var allUnderlying: string[] = [];
        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 WETH before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const ownerBalanceBefore = await owner.getBalance();
        //Mining the tx
        sellAmount = await offChainIndex.redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["800", "800", "800"],
          token: weth,
        });
        await sellAmount.wait();

        const abiCoder = ethers.utils.defaultAbiCoder;
        var userTokens = abiCoder.decode(["address[]"], (await offChainIndex.userWithdrawData(owner.address))[3]);
        var tokens = userTokens[0];
        type Map = {
          [key: string]: BigNumber;
        };
        let m: Map = {};
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          let getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          var result = await offChainIndex.getTokenAmounts(owner.address, tokens[i]);
          for (var j = 0; j < result.length; j++) {
            m[getUnderlyingTokens[j]] = BigNumber.from(m[getUnderlyingTokens[j]] || 0).add(BigNumber.from(result[j]));
          }
        }
        //Static call for return
        const config = await indexSwap1.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");

        for (let key in m) {
          if (key != weth) {
            await delay(2000);
            const params = {
              sellToken: key.toString(),
              buyToken: weth,
              sellAmount: m[key].toString(),
              slippagePercentage: 0.1,
              gasPrice: "2000457106",
              gas: "200000",
            };
            const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
              headers: {
                "0x-api-key": process.env.ZEROX_KEY,
              },
            });
            sellTokensContract.push(key);
            sellTokenSwapData.push(response.data.data.toString());
            sellTokenAmountContract.push(m[key].toString());
          } else {
            sellTokensContract.push(key);
            sellTokenSwapData.push("0x");
            sellTokenAmountContract.push(m[key].toString());
          }
        }
        await expect(
          offChainIndex.withdrawOffChain({
            sellTokenAddress: sellTokensContract,
            sellAmount: ["1000", "1000", "1000"],
            buySwapData: sellTokenSwapData,
            offChainHandler: zeroExHandler.address,
          }),
        ).to.be.revertedWithCustomError(offChainIndex, "InvalidSellAmount");

        await tokenRegistry.setProtocolPause(true);

        console.log("--------Withdrawing----------");

        await expect(
          offChainIndex.withdrawOffChain({
            sellTokenAddress: sellTokensContract,
            sellAmount: sellTokenAmountContract,
            buySwapData: sellTokenSwapData,
            offChainHandler: zeroExHandler.address,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "ProtocolIsPaused");

        await expect(offChainIndex.triggerMultipleTokenWithdrawal()).to.be.revertedWithCustomError(
          indexSwapLibrary,
          "ProtocolIsPaused",
        );
      });
    });
  });
});