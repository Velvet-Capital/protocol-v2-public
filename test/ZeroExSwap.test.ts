import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";

import {
  tokenAddresses,
  IAddresses,
  indexSwapLibrary,
  accessController,
  baseHandler,
  venusHandler,
  wombatHandler,
  priceOracle,
  pancakeLpHandler,
} from "./Deployments.test";

import {
  IndexSwap,
  IndexSwap__factory,
  PriceOracle,
  IERC20Upgradeable__factory,
  IndexSwapLibrary,
  Exchange,
  TokenRegistry,
  Rebalancing__factory,
  Rebalancing,
  OffChainRebalance,
  IndexFactory,
  PancakeSwapHandler,
  ZeroExHandler,
  OffChainIndexSwap,
  PancakeSwapLPHandler,
  OffChainRebalance__factory,
  RebalanceAggregator__factory,
  ERC20Upgradeable,
  VelvetSafeModule,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";

var chai = require("chai");
const axios = require("axios");
const qs = require("qs");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for ZeroExSwap", () => {
  let accounts;
  let iaddress: IAddresses;
  let vaultAddress: string;
  let velvetSafeModule: VelvetSafeModule;
  let indexSwap: any;
  let indexSwap1: any;
  let metaAggregator: any;
  let indexSwapContract: IndexSwap;
  let indexFactory: IndexFactory;
  let swapHandler: PancakeSwapHandler;
  let swapHandler1: PancakeSwapHandler;
  let offChainIndexSwap: OffChainIndexSwap;
  let exchange: Exchange;
  let zeroExHandler: ZeroExHandler;
  let rebalancing: any;
  let rebalancing1: any;
  let offChainRebalance: any;
  let offChainRebalance1: any;
  let tokenRegistry: TokenRegistry;
  let txObject;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addrs: SignerWithAddress[];
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  describe.only("Tests for ZeroEx contract", () => {
    before(async () => {
      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, treasury, addr1, addr2, ...addrs] = accounts;

      const provider = ethers.getDefaultProvider();

      iaddress = await tokenAddresses();

      const ZeroExHandler = await ethers.getContractFactory("ZeroExHandler");
      zeroExHandler = await ZeroExHandler.deploy();
      await zeroExHandler.deployed();

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();
      await tokenRegistry.initialize(
        "3000000000000000000",
        "120000000000000000000000",
        treasury.address,
        addresses.WETH_Address,
      );

      await tokenRegistry.setCoolDownPeriod("1");

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      exchange = await Exchange.deploy();
      await exchange.deployed();

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

      const offChainIndex = await ethers.getContractFactory("OffChainIndexSwap", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const offChainIndexSwap = await offChainIndex.deploy();
      await offChainIndexSwap.deployed();

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
      const PancakeSwapHandler = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      const PancakeSwapHandler1 = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler1 = await PancakeSwapHandler1.deploy();
      await swapHandler1.deployed();

      swapHandler1.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      tokenRegistry.enableToken(
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
        ],
        [true, true, true, true, true, true, false, false, false, false, false, false, false, false],
      );

      zeroExHandler.init("0xdef1c0ded9bec7f1a1670819833240f027b25eff", priceOracle.address);
      await zeroExHandler.addOrUpdateProtocolSlippage("100");

      // Grant owner asset manager role
      await accessController.setupRole(
        "0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819",
        owner.address,
      );

      tokenRegistry.enableSwapHandlers([swapHandler1.address]);
      tokenRegistry.enableExternalSwapHandler(zeroExHandler.address);
      tokenRegistry.addNonDerivative(wombatHandler.address);

      let whitelistedTokens = [
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
            _outAsset: addresses.WETH_Address,
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
      const indexFactoryCreate = await indexFactory.createIndexNonCustodial({
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
      });

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

      console.log("indexSwapAddress1:", indexAddress1);

      rebalancing = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo.rebalancing);

      rebalancing1 = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo1.rebalancing);

      offChainRebalance = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo.offChainRebalancing);

      offChainRebalance1 = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo1.offChainRebalancing);

      metaAggregator = await ethers.getContractAt(RebalanceAggregator__factory.abi, indexInfo.metaAggregator);

      console.log("indexSwap deployed to:", indexSwap.address);

      console.log("rebalancing:", rebalancing1.address);
    });

    describe("ZeroEx Tests", function () {
      const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
      it("Initialize IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([iaddress.btcAddress, iaddress.ethAddress], [5000, 5000]);
      });

      it("should add pid", async () => {
        await pancakeLpHandler
          .connect(owner)
          .pidMap([addresses.Cake_BUSDLP_Address, addresses.Cake_WBNBLP_Address], [39, 2]);
      });

      it("should check if off chain handler is enabled or not", async () => {
        expect(await tokenRegistry.isOffChainHandlerEnabled(zeroExHandler.address));
      });

      it("Initialize 2nd IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap.attach(indexAddress);
        await index
          .connect(nonOwner)
          .initToken([iaddress.wbnbAddress, addresses.Cake_WBNBLP_Address, addresses.vETH_Address], [3000, 3000, 4000]);
      });

      it("Invest 1 BNB into Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const indexSwap1 = indexSwap.attach(indexAddress);
        const exchange = (await indexFactory.IndexSwapInfolList(1)).exchangeHandler;
        const indexSupplyBefore = await indexSwap1.totalSupply();
        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap1.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 1 BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();

        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
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

      it("Invest 1 BNB in first index fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();

        await indexSwap.investInFund(
          {
            _slippage: ["300", "300"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Should disable external swap handler", async () => {
        await expect(tokenRegistry.disableExternalSwapHandler(zeroExHandler.address));
      });

      // For Update Weight - Three Steps
      // Step 1 -  Enable Rebalance(Pull And Redeem Tokens From Vault and Update Weight)
      // Step 2 -  External Sell(Selling the Redeemed Tokens)
      // Step 3 -  External Rebalance(Buying amd Staking Tokens to Vault)

      // For Update Tokens - Three Steps
      // Step 1 -  Enable Rebalance and Update Record(Pull And Redeem Tokens From Vault and Update Weight and Records)
      // Step 2 -  External Sell(Selling the Redeemed Tokens)
      // Step 3 -  External Rebalance(Buying amd Staking Tokens to Vault)

      it("update weights should fail if any one weight is zero", async () => {
        const newWeights = [1000, 9000, 0];
        await expect(
          offChainRebalance1.connect(nonOwner).enableRebalance({
            _newWeights: newWeights,
            _lpSlippage: ["200", "200", "200"],
          }),
        ).to.be.revertedWithCustomError(indexSwap, "ZeroDenormValue");
      });

      it("update weights should fail if sum of weight is not 10000", async () => {
        const newWeights = [1000, 7000, 1000];
        await expect(
          offChainRebalance1.connect(nonOwner).enableRebalance({
            _newWeights: newWeights,
            _lpSlippage: ["200", "200", "200"],
          }),
        ).to.be.revertedWithCustomError(indexSwap1, "InvalidWeights");
      });

      it("Update Weights", async () => {
        await tokenRegistry.enableExternalSwapHandler(zeroExHandler.address);

        var tokens = await indexSwap1.getTokens();
        const newWeights = [1000, 2000, 7000];

        var sellTokens = [];
        var buyTokens = [];
        var sellAmount = [];
        var buyweight = [];

        var slicedBuyTokens = [];

        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var protocolFee = [];

        var swapCallData = [];

        var sumWeight = 0;

        const v = await indexSwap1.vault();

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        // 1. Enabling Token - Pulling from vault and redeeming the tokens
        const tx = await offChainRebalance1.connect(nonOwner).enableRebalance({
          _newWeights: newWeights,
          _lpSlippage: ["200", "200"],
        });

        var allUnderlying: string[] = [];
        const abiCoder = ethers.utils.defaultAbiCoder;

        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance1.updateWeightStateData(),
        );
        sellTokens = stateData[0];

        //Calculating SwapData
        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              sellTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(sellTokens[i]);

            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (!allUnderlying.includes(getUnderlyingTokens[j])) {
                if (getUnderlyingTokens[j] != wbnb) {
                  const bal = await ERC20.attach(getUnderlyingTokens[j]).balanceOf(offChainRebalance1.address);
                  const params = {
                    sellToken: getUnderlyingTokens[j].toString(),
                    buyToken: wbnb,
                    sellAmount: bal.toString(),
                    slippagePercentage: 0.1,
                    gasPrice: "2000457106",
                    gas: "200000",
                  };
                  const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                    headers: {
                      "0x-api-key": process.env.ZEROX_KEY,
                    },
                  });
                  await delay(500);
                  sellTokensContract.push(getUnderlyingTokens[j]);
                  sellTokenSwapData.push(response.data.data.toString());
                  sellTokenAmountContract.push(bal.toString());
                }
                allUnderlying.push(getUnderlyingTokens[j]);
              }
            }
          }
        }

        //Selling Token After Enabling(Pulled tokens)
        const tx2 = await offChainRebalance1.connect(nonOwner)._externalSell(sellTokenSwapData, zeroExHandler.address);

        const buyAmount = await ERC20.attach(wbnb).balanceOf(offChainRebalance1.address);
        //Creating Data To Buy Tokens
        buyTokens = stateData[1];
        buyweight = stateData[2];
        sumWeight = stateData[3];
        for (let i = 0; i < buyTokens.length; i++) {
          if (buyTokens[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              buyTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(buyTokens[i]);
            slicedBuyTokens.push(buyTokens[i]);
            var buyVal = BigNumber.from(buyAmount).mul(buyweight[i]).div(sumWeight);
            buyVal = BigNumber.from(buyVal).div(getUnderlyingTokens.length);
            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (getUnderlyingTokens[j] != wbnb) {
                const params = {
                  sellToken: wbnb,
                  buyToken: getUnderlyingTokens[j],
                  sellAmount: BigNumber.from(buyVal).toString(),
                  slippagePercentage: 0.1,
                  gasPrice: "2000457106",
                  gas: "200000",
                };

                const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });
                await delay(500);
                buyTokenSwapData.push(response.data.data.toString());
              } else {
                buyTokenSwapData.push("0x");
              }
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenAmountContract.push(BigNumber.from(buyVal).toString());
            }
          }
          protocolFee.push(BigNumber.from(0).toString());
        }
        tokens = await indexSwap1.getTokens();
        var balanceBeforeToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          if (handler.address == wombatHandler.address) {
            balanceBeforeToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceBeforeToken.push(await token2.balanceOf(v));
          }
        }

        // Rebalancing - Buying the tokens and staking it again to vault
        await offChainRebalance1.connect(nonOwner).externalRebalance(
          {
            _offChainHandler: zeroExHandler.address,
            _buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
          },
          ["200"],
        );

        await expect(
          offChainRebalance1.connect(nonOwner)._externalSell(sellTokenSwapData, zeroExHandler.address),
        ).to.be.revertedWithCustomError(offChainRebalance1, "InvalidExecution");
        var balanceAfterToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          if (handler.address == wombatHandler.address) {
            balanceAfterToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceAfterToken.push(await token2.balanceOf(v));
          }
          expect(Number(balanceAfterToken[i])).to.be.greaterThanOrEqual(Number(balanceBeforeToken[i]));
        }
      });

      it("print values after updating weights to [1000, 2000, 7000]", async () => {
        const vault = await indexSwap1.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const tokens = await indexSwap1.getTokens();
        let balancesInUsd = [];
        let total = 0;

        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          // TODO after price oracle merge we can get the lp price from the price oracle
          if (getUnderlyingTokens.length > 0) {
            balancesInUsd[i] = await handler.callStatic.getTokenBalanceUSD(vault, tokens[i]);
          } else {
            const balance = await ERC20.attach(tokens[i]).balanceOf(vault);
            balancesInUsd[i] = await priceOracle.getPriceTokenUSD18Decimals(tokens[i], balance);
          }

          total += Number(balancesInUsd[i]);
        }

        for (let i = 0; i < tokens.length; i++) {
          console.log(`Percentage token ${i} : `, (Number(balancesInUsd[i]) / Number(total)).toString());
        }
      });

      it("should revert if invalid slippage and _revert after enable Rebalance(1st Transaction)", async () => {
        await tokenRegistry.enableExternalSwapHandler(zeroExHandler.address);

        const _tokens = [addresses.vETH_Address, iaddress.wbnbAddress];
        const newWeights = [5500, 4500];

        const v = await indexSwap1.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        var balanceBefore = [];
        var tokens = await indexSwap1.getTokens();
        const tokenLengthBefore = tokens.length;
        for (let i = 0; i < tokens.length; i++) {
          balanceBefore[i] = await ERC20.attach(tokens[i]).balanceOf(v);
        }

        //Expected  To Revert
        await expect(
          offChainRebalance1.connect(nonOwner).enableRebalanceAndUpdateRecord(_tokens, newWeights, ["200", "200"]),
        ).to.be.revertedWithCustomError(offChainRebalance1, "InvalidSlippageLength");

        // 1. Enabling Token - Pulling from vault and redeeming the tokens
        const tx = await offChainRebalance1
          .connect(nonOwner)
          .enableRebalanceAndUpdateRecord(_tokens, newWeights, ["200", "200", "200"]);

        await offChainRebalance1.connect(nonOwner).revertEnableRebalancing(["200", "200", "200"]);
        var balanceAfter = [];
        var tokens = await indexSwap1.getTokens();
        const tokenLengthAfter = tokens.length;
        for (let i = 0; i < tokens.length; i++) {
          balanceAfter[i] = await ERC20.attach(tokens[i]).balanceOf(v);
          console.log("balanceBefore", balanceBefore[i]);
          console.log("balanceAfter", balanceAfter[i]);
          expect(Number(balanceBefore[i])).to.be.greaterThanOrEqual(Number(balanceAfter[i]));
        }
        expect(Number(tokenLengthBefore)).to.be.equal(Number(tokenLengthAfter));
      });

      it("should _revert after externalSell (2nd Transaction) + revertWithCustomError if InvalidExecution", async () => {
        var tokens = await indexSwap1.getTokens();
        const newTokens = [
          iaddress.busdAddress,
          addresses.Cake_WBNBLP_Address,
          addresses.vBNB_Address,
        ];
        const newWeights = [3000, 1000, 6000];

        var tokenSell = [];
        var tokenSellContract = [];
        var tokenSellAmountContract = [];
        var tokenSellSwapData = [];

        var sellTokens = [];

        var sellTokensContract = [];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const v = await indexSwap1.vault();

        // for(let i = 0 ; i < tokens.length; i++){
        //   console.log("token",tokens[i]);
        //   console.log("balanceBefore",await ERC20.attach(tokens[i]).balanceOf(v));
        // }
        const balanceBefore = await ERC20.attach(iaddress.wbnbAddress).balanceOf(v);
        //Enabling Rabalance and updating record - pull from vault,redeeming and updating token list and weight
        const tx1 = await offChainRebalance1
          .connect(nonOwner)
          .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["800", "800", "800"]);

        await expect(
          offChainRebalance1
            .connect(nonOwner)
            .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["800", "800", "800"]),
        ).to.be.revertedWithCustomError(offChainRebalance1, "InvalidExecution");

        const abiCoder = ethers.utils.defaultAbiCoder;

        var updateStateData = abiCoder.decode(["address[]"], await offChainRebalance1.updateTokenStateData());

        tokenSell = updateStateData[0];

        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance1.updateWeightStateData(),
        );
        sellTokens = stateData[0];

        for (let i = 0; i < tokenSell.length; i++) {
          sellTokensContract.push(tokenSell[i]);
        }
        for (let i = 0; i < sellTokens.length; i++) {
          sellTokensContract.push(sellTokens[i]);
        }

        //Calculating SwapData
        var allUnderlying: string[] = [];
        for (let i = 0; i < sellTokensContract.length; i++) {
          if (sellTokensContract[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              sellTokensContract[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(sellTokensContract[i]);

            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (!allUnderlying.includes(getUnderlyingTokens[j])) {
                if (getUnderlyingTokens[j] != wbnb) {
                  const bal = await ERC20.attach(getUnderlyingTokens[j]).balanceOf(offChainRebalance1.address);
                  const params = {
                    sellToken: getUnderlyingTokens[j].toString(),
                    buyToken: wbnb,
                    sellAmount: bal.toString(),
                    slippagePercentage: 0.05,
                  };
                  const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                    headers: {
                      "0x-api-key": process.env.ZEROX_KEY,
                    },
                  });
                  await delay(500);
                  tokenSellContract.push(getUnderlyingTokens[j]);
                  tokenSellSwapData.push(response.data.data.toString());
                  tokenSellAmountContract.push(bal.toString());
                }
                allUnderlying.push(getUnderlyingTokens[j]);
              }
            }
          }
        }

        //Selling Token After Enabling(Pulled tokens)
        const tx2 = await offChainRebalance1.connect(nonOwner)._externalSell(tokenSellSwapData, zeroExHandler.address);

        await offChainRebalance1.connect(nonOwner).revertSellTokens();
        const balanceAfter = await ERC20.attach(iaddress.wbnbAddress).balanceOf(v);
        var tokens = await indexSwap1.getTokens();
        // for(let i = 0 ; i < tokens.length; i++){
        //   console.log("token",tokens[i]);
        //   console.log("balanceAfter",await ERC20.attach(tokens[i]).balanceOf(v));
        // }
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
      });

      it("should revert enablePrimaryTokens", async () => {
        var tokens = await indexSwap.getTokens();
        const newWeights = [3000, 7000];

        var sellTokens = [];
        var swapAmounts = [];
        var buyTokens = [];
        var buyWeights = [];
        var sellTokenSwapData = [];
        var buyTokenSwapData = [];
        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var protocolFee = [];
        var sumWeight;
        var v = await indexSwap.vault();

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const data: [string[], string[]] = await offChainRebalance.callStatic.getSwapData(newWeights);

        sellTokens = data[0];
        swapAmounts = data[1];

        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmounts[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              sellTokenSwapData.push(response.data.data.toString());
            }
          }
        }
        const tokenLengthBefore = (await indexSwap.getTokens()).length;
        await offChainRebalance.enablePrimaryTokens(newWeights, sellTokenSwapData, zeroExHandler.address, [0, 0, 0]);

        await offChainRebalance.revertSellTokens();

        const tokenLengthAfter = (await indexSwap.getTokens()).length;
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          const balanceAfterToken = await token2.balanceOf(v);
          expect(balanceAfterToken).to.be.greaterThan(0);
        }
        expect(BigNumber.from(tokenLengthAfter)).to.be.equal(BigNumber.from(tokenLengthBefore).add(1));
      })

      it("should update weights", async () => {
        var tokens = await indexSwap.getTokens();
        const newWeights = [3000, 6000, 1000];

        var sellTokens = [];
        var swapAmounts = [];
        var buyTokens = [];
        var buyWeights = [];
        var sellTokenSwapData = [];
        var buyTokenSwapData = [];
        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var protocolFee = [];
        var sumWeight;
        var v = await indexSwap.vault();

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const data: [string[], string[]] = await offChainRebalance.callStatic.getSwapData(newWeights);

        sellTokens = data[0];
        swapAmounts = data[1];

        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmounts[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              sellTokenSwapData.push(response.data.data.toString());
            }
          }
        }
        await offChainRebalance.enablePrimaryTokens(newWeights, sellTokenSwapData, zeroExHandler.address, [0, 0, 0]);
        const buyAmount = await ERC20.attach(wbnb).balanceOf(offChainRebalance.address);
        const abiCoder = ethers.utils.defaultAbiCoder;
        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance.updateWeightStateData(),
        );
        buyTokens = stateData[1];
        buyWeights = stateData[2];
        sumWeight = stateData[3];
        for (let i = 0; i < buyTokens.length; i++) {
          if (buyTokens[i] != "0x0000000000000000000000000000000000000000") {
            var buyVal = BigNumber.from(buyAmount).mul(buyWeights[i]).div(sumWeight);
            if (buyTokens[i] != wbnb) {
              const params = {
                sellToken: wbnb,
                buyToken: buyTokens[i],
                sellAmount: BigNumber.from(buyVal).toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);

              buyTokenSwapData.push(response.data.data.toString());
            } else {
              buyTokenSwapData.push("0x");
            }
            buyUnderlyingTokensContract.push(buyTokens[i]);
            buyTokenAmountContract.push(BigNumber.from(buyVal).toString());
          }
          protocolFee.push(BigNumber.from(0).toString());
        }
        tokens = await indexSwap.getTokens();
        var balanceBeforeToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          balanceBeforeToken.push(await token2.balanceOf(v));
        }
        await offChainRebalance.externalRebalance(
          {
            _offChainHandler: zeroExHandler.address,
            _buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
          },
          ["200"],
        );
        var balanceAfterToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          balanceAfterToken.push(await token2.balanceOf(v));
        }
      });

      it("Invest 1 BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();

        const tokens = await indexSwap1.getTokens();

        const v = await indexSwap1.vault();

        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap1.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 1 BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();

        const tokens = await indexSwap1.getTokens();

        const v = await indexSwap1.vault();

        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap1.totalSupply();

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Should not update tokens if tokens is not approved", async () => {
        const newTokens = [
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
          addresses.BSwap_WBNB_LINKLP_Address,
        ];
        const newWeights = [3000, 1000, 6000];
        await expect(
          offChainRebalance1
            .connect(nonOwner)
            .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["200", "200", "200"]),
        ).to.be.reverted;
      });

      it("Should not update tokens if tokens is not whitelisted", async () => {
        const newTokens = [
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
          addresses.MAIN_LP_DAI,
        ];
        const newWeights = [3000, 1000, 6000];
        await expect(
          offChainRebalance1
            .connect(nonOwner)
            .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["200", "200", "200"]),
        ).to.be.reverted;
      });

      it("Should not update if any one weight is zero", async () => {
        const newTokens = [
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
          "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
        ];
        const newWeights = [3000, 7000, 0];
        await expect(
          offChainRebalance1
            .connect(nonOwner)
            .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["200", "200", "200"]),
        ).to.be.reverted;
      });

      it("Should not update if weight is not equal to 10000", async () => {
        const newTokens = [
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
          "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
        ];
        const newWeights = [3000, 6000, 500];
        await expect(
          offChainRebalance1
            .connect(nonOwner)
            .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["200", "200", "200"]),
        ).to.be.reverted;
      });

      it("print values before", async () => {
        const vault = await indexSwap1.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const tokens = await indexSwap1.getTokens();
        let balancesInUsd = [];
        let total = 0;

        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          // TODO after price oracle merge we can get the lp price from the price oracle
          if (getUnderlyingTokens.length > 0) {
            balancesInUsd[i] = await handler.callStatic.getTokenBalanceUSD(vault, tokens[i]);
          } else {
            const balance = await ERC20.attach(tokens[i]).balanceOf(vault);
            balancesInUsd[i] = await priceOracle.getPriceTokenUSD18Decimals(tokens[i], balance);
          }

          total += Number(balancesInUsd[i]);
        }

        for (let i = 0; i < tokens.length; i++) {
          console.log(`Percentage token ${i} : `, (Number(balancesInUsd[i]) / Number(total)).toString());
        }
      });

      it("Should Update Tokens", async () => {
        var tokens = await indexSwap1.getTokens();
        const newTokens = [
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
          "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
        ];
        const newWeights = [3000, 1000, 6000];

        var tokenSell = [];
        var tokenAmount = [];
        var tokenSellContract = [];
        var tokenSellAmountContract = [];
        var tokenSellSwapData = [];
        var protocolFee = [];

        var sellTokens = [];
        var newDenorms = [];
        var buyTokens = [];
        var buyweight = [];

        var slicedBuyTokens = [];

        var sellTokensContract = [];

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        var sumWeight = 0;

        const v = await indexSwap1.vault();

        //Enabling Rabalance and updating record - pull from vault,redeeming and updating token list and weight
        const tx1 = await offChainRebalance1
          .connect(nonOwner)
          .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["200", "200", "200"]);

        const abiCoder = ethers.utils.defaultAbiCoder;

        var updateStateData = abiCoder.decode(["address[]"], await offChainRebalance1.updateTokenStateData());

        tokenSell = updateStateData[0];

        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance1.updateWeightStateData(),
        );
        sellTokens = stateData[0];

        for (let i = 0; i < tokenSell.length; i++) {
          sellTokensContract.push(tokenSell[i]);
        }
        for (let i = 0; i < sellTokens.length; i++) {
          sellTokensContract.push(sellTokens[i]);
        }

        //Calculating SwapData
        var allUnderlying: string[] = [];
        for (let i = 0; i < sellTokensContract.length; i++) {
          if (sellTokensContract[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              sellTokensContract[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(sellTokensContract[i]);

            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (!allUnderlying.includes(getUnderlyingTokens[j])) {
                if (getUnderlyingTokens[j] != wbnb) {
                  const bal = await ERC20.attach(getUnderlyingTokens[j]).balanceOf(offChainRebalance1.address);
                  const params = {
                    sellToken: getUnderlyingTokens[j].toString(),
                    buyToken: wbnb,
                    sellAmount: bal.toString(),
                    slippagePercentage: 0.05,
                  };
                  const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                    headers: {
                      "0x-api-key": process.env.ZEROX_KEY,
                    },
                  });
                  await delay(500);
                  tokenSellContract.push(getUnderlyingTokens[j]);
                  tokenSellSwapData.push(response.data.data.toString());
                  tokenSellAmountContract.push(bal.toString());
                }
                allUnderlying.push(getUnderlyingTokens[j]);
              }
            }
          }
        }

        //Selling Token After Enabling(Pulled tokens)
        const tx2 = await offChainRebalance1.connect(nonOwner)._externalSell(tokenSellSwapData, zeroExHandler.address);
        const buyAmount = await ERC20.attach(wbnb).balanceOf(offChainRebalance1.address);
        buyTokens = stateData[1];
        buyweight = stateData[2];
        sumWeight = stateData[3];
        for (let i = 0; i < buyTokens.length; i++) {
          if (buyTokens[i] != "0x0000000000000000000000000000000000000000") {
            slicedBuyTokens.push(buyTokens[i]);
            protocolFee.push(BigNumber.from(0).toString());
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              buyTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(buyTokens[i]);

            var buyVal = BigNumber.from(buyAmount).mul(buyweight[i]).div(sumWeight);

            buyVal = BigNumber.from(buyVal).div(getUnderlyingTokens.length);
            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (getUnderlyingTokens[j] != wbnb) {
                const params = {
                  sellToken: wbnb,
                  buyToken: getUnderlyingTokens[j],
                  sellAmount: BigNumber.from(buyVal).toString(),
                  slippagePercentage: 0.05,
                };
                const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });

                buyTokenSwapData.push(response.data.data.toString());
              } else {
                buyTokenSwapData.push("0x");
              }
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenAmountContract.push(BigNumber.from(buyVal).toString());
            }
          }
        }

        tokens = await indexSwap1.getTokens();
        var balanceBeforeToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          if (handler.address == wombatHandler.address) {
            balanceBeforeToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceBeforeToken.push(await token2.balanceOf(v));
          }
        }

        // Rebalancing - Buying the tokens and staking it again to vault
        await offChainRebalance1.connect(nonOwner).externalRebalance(
          {
            _offChainHandler: zeroExHandler.address,
            _buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
          },
          ["200", "200"],
        );
        var balanceAfterToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          // var balanceAfterToken = [];
          if (handler.address == wombatHandler.address) {
            balanceAfterToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceAfterToken.push(await token2.balanceOf(v));
          }
          expect(Number(balanceAfterToken[i])).to.be.greaterThanOrEqual(Number(balanceBeforeToken[i]));
        }
      });

      it("print values after", async () => {
        const vault = await indexSwap1.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const tokens = await indexSwap1.getTokens();
        let balancesInUsd = [];
        let total = 0;

        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          // TODO after price oracle merge we can get the lp price from the price oracle
          if (getUnderlyingTokens.length > 0) {
            balancesInUsd[i] = await handler.callStatic.getTokenBalanceUSD(vault, tokens[i]);
          } else {
            const balance = await ERC20.attach(tokens[i]).balanceOf(vault);
            balancesInUsd[i] = await priceOracle.getPriceTokenUSD18Decimals(tokens[i], balance);
          }

          total += Number(balancesInUsd[i]);
        }

        for (let i = 0; i < tokens.length; i++) {
          console.log(`Percentage token ${i} : `, (Number(balancesInUsd[i]) / Number(total)).toString());
        }
      });

      it("should fail to revert back if all transaction is completed", async () => {
        await expect(offChainRebalance1.connect(nonOwner).revertSellTokens()).to.be.revertedWithCustomError(
          offChainRebalance1,
          "InvalidExecution",
        );
      });

      it("print values before updating tokens to wbnb", async () => {
        const vault = await indexSwap.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const tokens = await indexSwap.getTokens();
        let balancesInUsd = [];
        let total = 0;

        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          // TODO after price oracle merge we can get the lp price from the price oracle
          if (getUnderlyingTokens.length > 0) {
            balancesInUsd[i] = await handler.callStatic.getTokenBalanceUSD(vault, tokens[i]);
          } else {
            const balance = await ERC20.attach(tokens[i]).balanceOf(vault);
            balancesInUsd[i] = await priceOracle.getPriceTokenUSD18Decimals(tokens[i], balance);
          }

          total += Number(balancesInUsd[i]);
        }

        for (let i = 0; i < tokens.length; i++) {
          console.log(`Percentage token ${i} : `, (Number(balancesInUsd[i]) / Number(total)).toString());
        }
      });

      it("should update portfolio to new tokens", async () => {
        const newTokens = [iaddress.wbnbAddress];
        const newWeights = [10000];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        var tokenSell = [];
        var sellTokens = [];
        var sellAmount = [];
        var swapAmount = [];
        var tokenSellSwapData = [];
        var buyTokens = [];
        var buyWeights = [];
        var sumWeight;

        const data: [string[], string[], string[], string[]] = await metaAggregator.callStatic.getUpdateTokenData(
          newTokens,
          newWeights,
        );
        tokenSell = data[0];
        sellTokens = data[1];
        sellAmount = data[2];
        swapAmount = data[3];
        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }

        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            if (tokenSell[i] != wbnb) {
              const params = {
                sellToken: tokenSell[i].toString(),
                buyToken: wbnb,
                sellAmount: sellAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        await offChainRebalance.enableAndUpdatePrimaryTokens(
          newTokens,
          newWeights,
          [0, 0, 0, 0, 0, 0],
          tokenSellSwapData,
          zeroExHandler.address,
        );

        const abiCoder = ethers.utils.defaultAbiCoder;
        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance.updateWeightStateData(),
        );

        buyTokens = stateData[1];
        buyWeights = stateData[2];
        sumWeight = stateData[3];

        const buyAmount = await ERC20.attach(wbnb).balanceOf(offChainRebalance.address);
        var tokens = await indexSwap.getTokens();
        const v = await indexSwap.vault();
        var balanceBeforeToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          balanceBeforeToken.push(await token2.balanceOf(v));
        }

        await offChainRebalance.externalRebalance(
          {
            _offChainHandler: zeroExHandler.address,
            _buyAmount: [BigNumber.from(buyAmount)],
            _buySwapData: ["0x"],
          },
          ["200", "200", "200"],
        );
        var balanceAfterToken = [];
        var tokens = await indexSwap.getTokens();
        for (let i = 0; i < tokens.length; i++) {
          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          balanceAfterToken.push(await token2.balanceOf(v));
          expect(Number(balanceAfterToken[i])).to.be.greaterThanOrEqual(Number(balanceBeforeToken[i]));
        }
      });

      it("print values after updating tokens to wbnb", async () => {
        const vault = await indexSwap.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const tokens = await indexSwap.getTokens();
        let balancesInUsd = [];
        let total = 0;

        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          // TODO after price oracle merge we can get the lp price from the price oracle
          if (getUnderlyingTokens.length > 0) {
            balancesInUsd[i] = await handler.callStatic.getTokenBalanceUSD(vault, tokens[i]);
          } else {
            const balance = await ERC20.attach(tokens[i]).balanceOf(vault);
            balancesInUsd[i] = await priceOracle.getPriceTokenUSD18Decimals(tokens[i], balance);
          }

          total += Number(balancesInUsd[i]);
        }

        for (let i = 0; i < tokens.length; i++) {
          console.log(`Percentage token ${i} : `, (Number(balancesInUsd[i]) / Number(total)).toString());
        }
      });

      it("should update tokens", async () => {
        const newTokens = [iaddress.wbnbAddress, iaddress.btcAddress, iaddress.ethAddress];
        const newWeights = [3000, 1000, 6000];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        var tokenSell = [];
        var sellTokens = [];
        var sellAmount = [];
        var swapAmount = [];
        var tokenSellSwapData = [];
        var buyTokens = [];
        var buyWeights = [];
        var buyTokenSwapData = [];
        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var sumWeight;

        const data: [string[], string[], string[], string[]] = await metaAggregator.callStatic.getUpdateTokenData(
          newTokens,
          newWeights,
        );
        tokenSell = data[0];
        sellTokens = data[1];
        sellAmount = data[2];
        swapAmount = data[3];

        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            if (tokenSell[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: tokenSell[i].toString(),
                buyToken: wbnb,
                sellAmount: sellAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        await offChainRebalance.enableAndUpdatePrimaryTokens(
          newTokens,
          newWeights,
          [0, 0, 0, 0, 0, 0],
          tokenSellSwapData,
          zeroExHandler.address,
        );
        const abiCoder = ethers.utils.defaultAbiCoder;
        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance.updateWeightStateData(),
        );

        buyTokens = stateData[1];
        buyWeights = stateData[2];
        sumWeight = stateData[3];

        const buyAmount = await ERC20.attach(wbnb).balanceOf(offChainRebalance.address);

        for (let i = 0; i < buyTokens.length; i++) {
          var buyVal = BigNumber.from(buyAmount).mul(buyWeights[i]).div(sumWeight);
          if (buyTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (buyTokens[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: wbnb,
                buyToken: buyTokens[i],
                sellAmount: BigNumber.from(buyVal).toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };
              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              buyTokenSwapData.push(response.data.data.toString());
            } else {
              buyTokenSwapData.push("0x");
            }
            buyUnderlyingTokensContract.push(buyTokens[i]);
            buyTokenAmountContract.push(BigNumber.from(buyVal).toString());
          }
        }

        const tokens = await indexSwap.getTokens();
        const v = await indexSwap.vault();
        var balanceBeforeToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          balanceBeforeToken.push(await token2.balanceOf(v));
        }

        await offChainRebalance.externalRebalance(
          {
            _offChainHandler: zeroExHandler.address,
            _buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
          },
          ["200", "200", "200"],
        );
        var balanceAfterToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          balanceAfterToken.push(await token2.balanceOf(v));
          expect(Number(balanceAfterToken[i])).to.be.greaterThanOrEqual(Number(balanceBeforeToken[i]));
        }
      });

      it("should update tokens should fail if update token data is manipulated", async () => {
        const newTokens = [iaddress.wbnbAddress, iaddress.btcAddress];
        // before: 30,10,60 (wbnb, btc, eth)
        const newWeights = [9500, 500];
        const newWeightsManipulated = [4000, 6000];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        var tokenSell = [];
        var sellTokens = [];
        var sellAmount = [];
        var swapAmount = [];
        var tokenSellSwapData = [];
        var buyTokens = [];
        var buyWeights = [];
        var buyTokenSwapData = [];
        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var sumWeight;

        /*
          the tx will fail because we're supposed to sell 5 BTC according to the new weights BUT with the manipulated weights we're not
          creating any calldata to sell 5 BTC so the tx will fail
         */
        const data: [string[], string[], string[], string[]] = await metaAggregator.callStatic.getUpdateTokenData(
          newTokens,
          newWeightsManipulated,
        );
        tokenSell = data[0];
        sellTokens = data[1];
        sellAmount = data[2];
        swapAmount = data[3];

        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            if (tokenSell[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: tokenSell[i].toString(),
                buyToken: wbnb,
                sellAmount: sellAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        await expect(
          offChainRebalance.enableAndUpdatePrimaryTokens(
            newTokens,
            newWeights,
            [0, 0, 0, 0, 0, 0],
            tokenSellSwapData,
            zeroExHandler.address,
          ),
        ).to.be.revertedWithCustomError(zeroExHandler, "SwapFailed");
      });

      it("should update tokens should fail if update token data is manipulated", async () => {
        const newTokens = [iaddress.wbnbAddress, iaddress.btcAddress];
        // before: 30,10,60 (wbnb, btc, eth)
        const newWeights = [4000, 6000];
        const newWeightsManipulated = [9500, 500];

        // tokenSellRemove eth 60
        // tokenSellUpdate: wbnb 0, btc 5
        // tokenSellUpdateSupposed: wbnb 0, btc 0
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        var tokenSell = [];
        var sellTokens = [];
        var sellAmount = [];
        var swapAmount = [];
        var tokenSellSwapData = [];
        var buyTokens = [];
        var buyWeights = [];
        var buyTokenSwapData = [];
        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var sumWeight;

        /* 
          the tx will fail - we're creating calldata for btc but we're not using it BUT we're only increasing the index in 
          OffChainRebalance._swap if address != 0 but since the new weights (non manipulated) don't result into selling BTC
          the if statement won't be entered and the index won't be increased; we're passing the same array from the frontend 
          for removing tokens and updating weights, that's why increasing the index is important (the wrong calldata for selling 
          removed tokens is being used)
        */
        const data: [string[], string[], string[], string[]] = await metaAggregator.callStatic.getUpdateTokenData(
          newTokens,
          newWeightsManipulated,
        );
        tokenSell = data[0];
        sellTokens = data[1];
        sellAmount = data[2];
        swapAmount = data[3];

        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            if (tokenSell[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: tokenSell[i].toString(),
                buyToken: wbnb,
                sellAmount: sellAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        await expect(
          offChainRebalance.enableAndUpdatePrimaryTokens(
            newTokens,
            newWeights,
            [0, 0, 0, 0, 0, 0],
            tokenSellSwapData,
            zeroExHandler.address,
          ),
        ).to.be.revertedWithCustomError(zeroExHandler, "SwapFailed");
      });

      it("Invest 1 BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
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

      it("Invest 1 BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 1 BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();

        const tokens = await indexSwap1.getTokens();

        const v = await indexSwap1.vault();

        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
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

      it("Should add one more token", async () => {
        var tokens = await indexSwap1.getTokens();
        var oldWeights = await offChainRebalance1.getCurrentWeights();
        var newTokens = [
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
          "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        ];
        var newWeights = [3000, 1000, 2000, 4000];

        var sellTokens = [];
        var newDenorms = [];
        var buyTokens = [];
        var sellAmount = [];
        var buyweight = [];

        var slicedBuyTokens = [];

        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];
        var protocolFee = [];

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        var sumWeight = 0;

        const v = await indexSwap1.vault();

        var j = 0;

        // 1. Enabling Token - Pulling from vault and redeeming the tokens
        const tx1 = await offChainRebalance1
          .connect(nonOwner)
          .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["200", "200", "200", "200"]);

        const abiCoder = ethers.utils.defaultAbiCoder;

        var allUnderlying: string[] = [];

        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance1.updateWeightStateData(),
        );
        sellTokens = stateData[0];

        //Calculating SwapData
        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              sellTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(sellTokens[i]);

            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (!allUnderlying.includes(getUnderlyingTokens[j])) {
                if (getUnderlyingTokens[j] != wbnb) {
                  const bal = await ERC20.attach(getUnderlyingTokens[j]).balanceOf(offChainRebalance1.address);
                  const params = {
                    sellToken: getUnderlyingTokens[j].toString(),
                    buyToken: wbnb,
                    sellAmount: bal.toString(),
                    slippagePercentage: 0.1,
                    gasPrice: "2000457106",
                    gas: "200000",
                  };
                  const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                    headers: {
                      "0x-api-key": process.env.ZEROX_KEY,
                    },
                  });
                  await delay(500);
                  sellTokensContract.push(getUnderlyingTokens[j]);
                  sellTokenSwapData.push(response.data.data.toString());
                  sellTokenAmountContract.push(bal.toString());
                }
                allUnderlying.push(getUnderlyingTokens[j]);
              }
            }
          }
        }

        //Selling Token After Enabling(Pulled tokens)
        const tx2 = await offChainRebalance1.connect(nonOwner)._externalSell(sellTokenSwapData, zeroExHandler.address);

        const buyAmount = (await ERC20.attach(wbnb).balanceOf(offChainRebalance1.address)).toBigInt();

        buyTokens = stateData[1];
        buyweight = stateData[2];
        sumWeight = stateData[3];

        //Creating Data To Buy Tokens
        for (let i = 0; i < buyTokens.length; i++) {
          if (buyTokens[i] != "0x0000000000000000000000000000000000000000") {
            slicedBuyTokens.push(buyTokens[i]);
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              buyTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(buyTokens[i]);

            var buyVal = BigNumber.from(buyAmount).mul(buyweight[i]).div(sumWeight);

            buyVal = BigNumber.from(buyVal).div(getUnderlyingTokens.length);
            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (getUnderlyingTokens[j] != wbnb) {
                const params = {
                  sellToken: wbnb,
                  buyToken: getUnderlyingTokens[j],
                  sellAmount: BigNumber.from(buyVal).toString(),
                  slippagePercentage: 0.1,
                  gasPrice: "2000457106",
                  gas: "200000",
                };
                const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });
                await delay(500);
                buyTokenSwapData.push(response.data.data.toString());
              } else {
                buyTokenSwapData.push("0x");
              }
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenAmountContract.push(BigNumber.from(buyVal).toString());
            }
          }
          protocolFee.push(BigNumber.from(0).toString());
        }

        tokens = await indexSwap1.getTokens();
        var balanceBeforeToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          if (handler.address == wombatHandler.address) {
            balanceBeforeToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceBeforeToken.push(await token2.balanceOf(v));
          }
        }

        // Rebalancing - Buying the tokens and staking it again to vault
        await offChainRebalance1.connect(nonOwner).externalRebalance(
          {
            _offChainHandler: zeroExHandler.address,
            _buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
          },
          ["200", "200", "200", "200"],
        );
        var balanceAfterToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          // var balanceAfterToken = [];
          if (handler.address == wombatHandler.address) {
            balanceAfterToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceAfterToken.push(await token2.balanceOf(v));
          }
          expect(Number(balanceAfterToken[i])).to.be.greaterThanOrEqual(Number(balanceBeforeToken[i]));
        }

        const blockNumBefore = await ethers.provider.getBlockNumber();
      });

      it("print values after adding one more token ([3000, 1000, 2000, 4000])", async () => {
        const vault = await indexSwap1.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const tokens = await indexSwap1.getTokens();
        let balancesInUsd = [];
        let total = 0;

        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          // TODO after price oracle merge we can get the lp price from the price oracle
          if (getUnderlyingTokens.length > 0) {
            balancesInUsd[i] = await handler.callStatic.getTokenBalanceUSD(vault, tokens[i]);
          } else {
            const balance = await ERC20.attach(tokens[i]).balanceOf(vault);
            balancesInUsd[i] = await priceOracle.getPriceTokenUSD18Decimals(tokens[i], balance);
          }

          total += Number(balancesInUsd[i]);
        }

        for (let i = 0; i < tokens.length; i++) {
          console.log(`Percentage token ${i} : `, (Number(balancesInUsd[i]) / Number(total)).toString());
        }
      });

      it("Invest 1 BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);

        const tokens = await indexSwap1.getTokens();

        const v = await indexSwap1.vault();

        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300", "300", "300"],
            _lpSlippage: ["200", "200", "200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
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

      it("Should remove one token", async () => {
        var tokens = await indexSwap1.getTokens();
        const newTokens = [
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        ];

        /*var oldTokens = [
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0", -- NEW (lp token)
          "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        ];*/
        var newWeights = [3000, 3000, 4000];

        var tokenSell = [];
        var tokenSellContract = [];
        var tokenSellAmountContract = [];
        var tokenSellSwapData = [];
        var protocolFee = [];

        var sellTokens = [];
        var buyTokens = [];
        var buyweight = [];

        var slicedBuyTokens = [];

        var sellTokensContract = [];

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        var sumWeight = 0;

        const v = await indexSwap1.vault();

        //Enabling Rabalance and updating record - pull from vault,redeeming and updating token list and weight
        const tx1 = await offChainRebalance1
          .connect(nonOwner)
          .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["200", "200", "200", "200"]);

        const abiCoder = ethers.utils.defaultAbiCoder;
        var updateStateData = abiCoder.decode(["address[]"], await offChainRebalance1.updateTokenStateData());

        tokenSell = updateStateData[0];

        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance1.updateWeightStateData(),
        );
        sellTokens = stateData[0];

        for (let i = 0; i < tokenSell.length; i++) {
          sellTokensContract.push(tokenSell[i]);
        }
        for (let i = 0; i < sellTokens.length; i++) {
          sellTokensContract.push(sellTokens[i]);
        }

        //Calculating SwapData
        var allUnderlying: string[] = [];
        for (let i = 0; i < sellTokensContract.length; i++) {
          if (sellTokensContract[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              sellTokensContract[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(sellTokensContract[i]);

            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (!allUnderlying.includes(getUnderlyingTokens[j])) {
                if (getUnderlyingTokens[j] != wbnb) {
                  const bal = await ERC20.attach(getUnderlyingTokens[j]).balanceOf(offChainRebalance1.address);
                  const params = {
                    sellToken: getUnderlyingTokens[j].toString(),
                    buyToken: wbnb,
                    sellAmount: bal.toString(),
                    slippagePercentage: 0.05,
                  };
                  const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                    headers: {
                      "0x-api-key": process.env.ZEROX_KEY,
                    },
                  });
                  await delay(500);
                  tokenSellContract.push(getUnderlyingTokens[j]);
                  tokenSellSwapData.push(response.data.data.toString());
                  tokenSellAmountContract.push(bal.toString());
                }
                allUnderlying.push(getUnderlyingTokens[j]);
              }
            }
          }
        }

        //Selling Token After Enabling(Pulled tokens)
        const tx2 = await offChainRebalance1.connect(nonOwner)._externalSell(tokenSellSwapData, zeroExHandler.address);

        const buyAmount = (await ERC20.attach(wbnb).balanceOf(offChainRebalance1.address)).toBigInt();

        buyTokens = stateData[1];
        buyweight = stateData[2];
        sumWeight = stateData[3];
        for (let i = 0; i < buyTokens.length; i++) {
          if (buyTokens[i] != "0x0000000000000000000000000000000000000000") {
            slicedBuyTokens.push(buyTokens[i]);
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              buyTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(buyTokens[i]);

            var buyVal = BigNumber.from(buyAmount).mul(buyweight[i]).div(sumWeight);

            buyVal = BigNumber.from(buyVal).div(getUnderlyingTokens.length);
            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (getUnderlyingTokens[j] != wbnb) {
                const params = {
                  sellToken: wbnb,
                  buyToken: getUnderlyingTokens[j],
                  sellAmount: buyVal.toString(),
                  slippagePercentage: 0.1,
                  gasPrice: "2000457106",
                  gas: "200000",
                };
                const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });
                await delay(500);
                buyTokenSwapData.push(response.data.data.toString());
              } else {
                buyTokenSwapData.push("0x");
              }
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
          protocolFee.push(BigNumber.from(0).toString());
        }

        tokens = await indexSwap1.getTokens();
        var balanceBeforeToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          if (handler.address == wombatHandler.address) {
            balanceBeforeToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceBeforeToken.push(await token2.balanceOf(v));
          }
        }

        // Rebalancing - Buying the tokens and staking it again to vault
        await offChainRebalance1.connect(nonOwner).externalRebalance(
          {
            _offChainHandler: zeroExHandler.address,
            _buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
          },
          ["200", "200"],
        );
        var balanceAfterToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          // var balanceAfterToken = [];
          if (handler.address == wombatHandler.address) {
            balanceAfterToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceAfterToken.push(await token2.balanceOf(v));
          }
          expect(Number(balanceAfterToken[i])).to.be.greaterThanOrEqual(Number(balanceBeforeToken[i]));
        }

        // const zeroExH = await ethers.getContractFactory("ZeroExHandler");

        const blockNumBefore = await ethers.provider.getBlockNumber();
      });

      it("Invest 1 BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);

        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
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

      it("Should Update Tokens and replace two tokens for vETH and MAIN_LP_BUSD", async () => {
        var tokens = await indexSwap1.getTokens();
        var oldWeights = await offChainRebalance1.getCurrentWeights();
        const newTokens = [
          "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          addresses.vBNB_Address,
          addresses.Cake_WBNBLP_Address,
        ];
        const newWeights = [6000, 1000, 3000];

        var tokenSell = [];
        var tokenAmount = [];
        var tokenSellContract = [];
        var tokenSellAmountContract = [];
        var tokenSellSwapData = [];

        var sellTokens = [];
        var newDenorms = [];
        var buyTokens = [];
        var sellAmount = [];
        var buyweight = [];
        var newOldWeights = [];
        var protocolFee = [];

        var slicedBuyTokens = [];

        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        var sumWeight = 0;

        const v = await indexSwap1.vault();

        var j = 0;
        //Enabling Rabalance and updating record - pull from vault,redeeming and updating token list and weight
        const tx1 = await offChainRebalance1
          .connect(nonOwner)
          .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["800", "800", "800"]);

        const abiCoder = ethers.utils.defaultAbiCoder;

        var updateStateData = abiCoder.decode(["address[]"], await offChainRebalance1.updateTokenStateData());

        tokenSell = updateStateData[0];

        //Calculating SwapData
        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              tokenSell[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(tokenSell[i]);

            var allUnderlying: string[] = [];
            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (!allUnderlying.includes(getUnderlyingTokens[j])) {
                if (getUnderlyingTokens[j] != wbnb) {
                  const bal = await ERC20.attach(getUnderlyingTokens[j]).balanceOf(offChainRebalance1.address);
                  const params = {
                    sellToken: getUnderlyingTokens[j].toString(),
                    buyToken: wbnb,
                    sellAmount: bal.toString(),
                    slippagePercentage: 0.1,
                    gasPrice: "2000457106",
                    gas: "200000",
                  };
                  const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                    headers: {
                      "0x-api-key": process.env.ZEROX_KEY,
                    },
                  });
                  await delay(500);
                  tokenSellContract.push(getUnderlyingTokens[j]);
                  tokenSellSwapData.push(response.data.data.toString());
                  tokenSellAmountContract.push(bal.toString());
                }
                allUnderlying.push(getUnderlyingTokens[j]);
              }
            }
          }
        }

        var oldWeights = await offChainRebalance1.getCurrentWeights();
        var allUnderlying: string[] = [];

        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance1.updateWeightStateData(),
        );
        sellTokens = stateData[0];
        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              sellTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(sellTokens[i]);

            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (!allUnderlying.includes(getUnderlyingTokens[j])) {
                if (getUnderlyingTokens[j] != wbnb) {
                  const bal = await ERC20.attach(getUnderlyingTokens[j]).balanceOf(offChainRebalance1.address);
                  const params = {
                    sellToken: getUnderlyingTokens[j].toString(),
                    buyToken: wbnb,
                    sellAmount: bal.toString(),
                    slippagePercentage: 0.1,
                    gasPrice: "2000457106",
                    gas: "200000",
                  };
                  const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                    headers: {
                      "0x-api-key": process.env.ZEROX_KEY,
                    },
                  });
                  await delay(500);
                  sellTokensContract.push(getUnderlyingTokens[j]);
                  sellTokenSwapData.push(response.data.data.toString());
                  sellTokenAmountContract.push(bal.toString());
                }
                allUnderlying.push(getUnderlyingTokens[j]);
              }
            }
          }
        }

        for (let i = 0; i < tokenSellContract.length; i++) {
          sellTokensContract.push(tokenSellContract[i]);
          sellTokenSwapData.push(tokenSellSwapData[i]);
        }

        //Selling Token After Enabling(Pulled tokens)
        const tx2 = await offChainRebalance1.connect(nonOwner)._externalSell(sellTokenSwapData, zeroExHandler.address);
        const buyAmount = (await ERC20.attach(wbnb).balanceOf(offChainRebalance1.address)).toBigInt();
        buyTokens = stateData[1];
        buyweight = stateData[2];
        sumWeight = stateData[3];
        for (let i = 0; i < buyTokens.length; i++) {
          if (buyTokens[i] != "0x0000000000000000000000000000000000000000") {
            slicedBuyTokens.push(buyTokens[i]);
            protocolFee.push(BigNumber.from(0).toString());
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              buyTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            var getUnderlyingTokens: string[] = await handler.getUnderlying(buyTokens[i]);
            var buyVal = BigNumber.from(buyAmount).mul(buyweight[i]).div(sumWeight);
            buyVal = BigNumber.from(buyVal).div(getUnderlyingTokens.length);
            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (getUnderlyingTokens[j] != wbnb) {
                const params = {
                  sellToken: wbnb,
                  buyToken: getUnderlyingTokens[j],
                  sellAmount: buyVal.toString(),
                  slippagePercentage: 0.1,
                  gasPrice: "2000457106",
                  gas: "200000",
                };
                const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });
                await delay(500);
                buyTokenSwapData.push(response.data.data.toString());
              } else {
                buyTokenSwapData.push("0x");
              }
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
          protocolFee.push(BigNumber.from(0).toString());
        }

        tokens = await indexSwap1.getTokens();
        var balanceBeforeToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          if (handler.address == wombatHandler.address) {
            balanceBeforeToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceBeforeToken.push(await token2.balanceOf(v));
          }
        }

        // Rebalancing - Buying the tokens and staking it again to vault
        await offChainRebalance1.connect(nonOwner).externalRebalance(
          {
            _offChainHandler: zeroExHandler.address,
            _buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
          },
          ["200", "200", "200"],
        );
        var balanceAfterToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          if (handler.address == wombatHandler.address) {
            balanceAfterToken.push(await handler.getTokenBalance(v, token2.address));
          } else {
            balanceAfterToken.push(await token2.balanceOf(v));
          }
          expect(Number(balanceAfterToken[i])).to.be.greaterThanOrEqual(Number(balanceBeforeToken[i]));
        }
        const blockNumBefore = await ethers.provider.getBlockNumber();
      });
      it("Invest 1 BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap1.totalSupply();
        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap1.totalSupply();
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should fail if we call wrong revert function", async () => {
        await tokenRegistry.enableExternalSwapHandler(zeroExHandler.address);

        var tokens = await indexSwap1.getTokens();
        const newWeights = [500, 4500, 5000];

        const v = await indexSwap1.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        var balanceBefore = [];
        for (let i = 0; i < tokens.length; i++) {
          balanceBefore[i] = await ERC20.attach(tokens[i]).balanceOf(v);
        }

        await expect(
          offChainRebalance1.connect(nonOwner).revertEnableRebalancing(["200", "200", "200"]),
        ).to.be.revertedWithCustomError(offChainRebalance1, "InvalidExecution");

        await expect(
          offChainRebalance1.connect(nonOwner).revertEnableRebalancingByUser(["200", "200", "200"]),
        ).to.be.revertedWithCustomError(offChainRebalance1, "FifteenMinutesNotExcedeed");

        // 1. Enabling Token - Pulling from vault and redeeming the tokens
        const tx = await offChainRebalance1.connect(nonOwner).enableRebalance({
          _newWeights: newWeights,
          _lpSlippage: ["200", "200", "200", "200", "200"],
        });

        await expect(offChainRebalance1.connect(nonOwner).revertSellTokens()).to.be.revertedWithCustomError(
          offChainRebalance1,
          "InvalidExecution",
        );
        var balanceAfter = [];
        for (let i = 0; i < tokens.length; i++) {
          balanceAfter[i] = await ERC20.attach(tokens[i]).balanceOf(v);
          expect(Number(balanceBefore[i])).to.be.greaterThanOrEqual(Number(balanceAfter[i]));
        }

        await ethers.provider.send("evm_increaseTime", [1000]);
        await offChainRebalance1.connect(nonOwner).revertEnableRebalancingByUser(["200", "200", "200"]);
      });

      it("print values before reverting", async () => {
        const vault = await indexSwap.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const tokens = await indexSwap.getTokens();
        let balancesInUsd = [];
        let total = 0;

        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          // TODO after price oracle merge we can get the lp price from the price oracle
          if (getUnderlyingTokens.length > 0) {
            balancesInUsd[i] = await handler.callStatic.getTokenBalanceUSD(vault, tokens[i]);
          } else {
            const balance = await ERC20.attach(tokens[i]).balanceOf(vault);
            balancesInUsd[i] = await priceOracle.getPriceTokenUSD18Decimals(tokens[i], balance);
          }

          total += Number(balancesInUsd[i]);
        }

        for (let i = 0; i < tokens.length; i++) {
          console.log(`Percentage token ${i} : `, (Number(balancesInUsd[i]) / Number(total)).toString());
        }
      });

      it("non-assetManager should revert if 15minutes of Pause is passed", async () => {
        const newTokens = [iaddress.wbnbAddress, iaddress.btcAddress];
        const newWeights = [4000, 6000];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        var tokenSell = [];
        var sellTokens = [];
        var sellAmount = [];
        var swapAmount = [];
        var tokenSellSwapData = [];
        const data: [string[], string[], string[], string[]] = await metaAggregator.callStatic.getUpdateTokenData(
          newTokens,
          newWeights,
        );
        tokenSell = data[0];
        sellTokens = data[1];
        sellAmount = data[2];
        swapAmount = data[3];
        const v = await indexSwap.vault();
        const balanceBefore = await ERC20.attach(iaddress.wbnbAddress).balanceOf(v);
        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            if (tokenSell[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: tokenSell[i].toString(),
                buyToken: wbnb,
                sellAmount: sellAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        await offChainRebalance.enableAndUpdatePrimaryTokens(
          newTokens,
          newWeights,
          [0, 0, 0, 0, 0, 0],
          tokenSellSwapData,
          zeroExHandler.address,
        );

        let tokens = await indexSwap.getTokens();
        for (let i = 0; i < tokens; i++) {
          console.log("balance of contract", await ERC20.attach(tokens[i]).balanceOf(offChainRebalance.address));
          console.log("balance of vault", await ERC20.attach(tokens[i]).balanceOf(v));
        }
        await ethers.provider.send("evm_increaseTime", [1900]);
        await offChainRebalance.connect(addr2).revertSellByUser();
        const balanceAfter = await ERC20.attach(iaddress.wbnbAddress).balanceOf(v);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
      });

      it("print values after reverting", async () => {
        const vault = await indexSwap.vault();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const tokens = await indexSwap.getTokens();
        let balancesInUsd = [];
        let total = 0;
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);

          // TODO after price oracle merge we can get the lp price from the price oracle
          if (getUnderlyingTokens.length > 0) {
            balancesInUsd[i] = await handler.callStatic.getTokenBalanceUSD(vault, tokens[i]);
          } else {
            const balance = await ERC20.attach(tokens[i]).balanceOf(vault);
            balancesInUsd[i] = await priceOracle.getPriceTokenUSD18Decimals(tokens[i], balance);
          }

          total += Number(balancesInUsd[i]);
        }

        for (let i = 0; i < tokens.length; i++) {
          console.log(`Percentage token ${i} : `, (Number(balancesInUsd[i]) / Number(total)).toString());
        }
      });

      it("non-assetManager should not be able revert if 15minutes of Pause is not passed", async () => {
        const newTokens = [iaddress.wbnbAddress, iaddress.btcAddress, iaddress.ethAddress];
        const newWeights = [3000, 2000, 5000];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        var tokenSell = [];
        var sellTokens = [];
        var sellAmount = [];
        var swapAmount = [];
        var tokenSellSwapData = [];

        const data: [string[], string[], string[], string[]] = await metaAggregator.callStatic.getUpdateTokenData(
          newTokens,
          newWeights,
        );
        tokenSell = data[0];
        sellTokens = data[1];
        sellAmount = data[2];
        swapAmount = data[3];
        const v = await indexSwap.vault();
        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(params)}`, {
                "0x-api-key": process.env.ZEROX_KEY,
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            if (tokenSell[i] != wbnb) {
              await delay(1000);
              const params = {
                sellToken: tokenSell[i].toString(),
                buyToken: wbnb,
                sellAmount: sellAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(`https://bsc.api.0x.org/swap/v1/quote?${qs.stringify(params)}`, {
                "0x-api-key": process.env.ZEROX_KEY,
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        await offChainRebalance.enableAndUpdatePrimaryTokens(
          newTokens,
          newWeights,
          [0, 0, 0, 0, 0, 0],
          tokenSellSwapData,
          zeroExHandler.address,
        );

        let tokens = await indexSwap.getTokens();
        for (let i = 0; i < tokens; i++) {
          console.log("balance of contract", await ERC20.attach(tokens[i]).balanceOf(offChainRebalance.address));
          console.log("balance of vault", await ERC20.attach(tokens[i]).balanceOf(v));
        }
        await expect(offChainRebalance.connect(addr2).revertSellByUser()).to.be.revertedWithCustomError(
          offChainRebalance,
          "FifteenMinutesNotExcedeed",
        );
        await offChainRebalance.revertSellTokens();
      });

      it("it should fail if assetmanager tries to execute 3rd transacton after 1st", async () => {
        const newTokens = ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", addresses.vBNB_Address, iaddress.ethAddress];
        const newWeights = [6000, 1000, 3000];

        var tokenSell = [];
        var tokenAmount = [];
        var tokenSellContract = [];
        var tokenSellAmountContract = [];
        var tokenSellSwapData = [];

        var sellTokens = [];
        var newDenorms = [];
        var buyTokens = [];
        var sellAmount = [];
        var buyweight = [];
        var newOldWeights = [];
        var protocolFee = [];

        var slicedBuyTokens = [];

        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        var sumWeight = 0;

        const v = await indexSwap1.vault();

        var j = 0;

        //Should revert is length does not match
        await expect(
          offChainRebalance1
            .connect(nonOwner)
            .enableRebalanceAndUpdateRecord(newTokens, ["5000", "5000"], ["200", "200", "200"]),
        ).to.be.revertedWithCustomError(offChainRebalance1, "LengthsDontMatch");

        //Enabling Rabalance and updating record - pull from vault,redeeming and updating token list and weight
        const tx1 = await offChainRebalance1
          .connect(nonOwner)
          .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["200", "200", "200"]);

        const abiCoder = ethers.utils.defaultAbiCoder;

        var updateStateData = abiCoder.decode(["address[]"], await offChainRebalance1.updateTokenStateData());

        tokenSell = updateStateData[0];

        //Calculating SwapData
        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              tokenSell[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(tokenSell[i]);

            var allUnderlying: string[] = [];
            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (!allUnderlying.includes(getUnderlyingTokens[j])) {
                if (getUnderlyingTokens[j] != wbnb) {
                  const bal = await ERC20.attach(getUnderlyingTokens[j]).balanceOf(offChainRebalance1.address);
                  const params = {
                    sellToken: getUnderlyingTokens[j].toString(),
                    buyToken: wbnb,
                    sellAmount: bal.toString(),
                    slippagePercentage: 0.1,
                    gasPrice: "2000457106",
                    gas: "200000",
                  };
                  const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                    headers: {
                      "0x-api-key": process.env.ZEROX_KEY,
                    },
                  });
                  await delay(500);
                  tokenSellContract.push(getUnderlyingTokens[j]);
                  tokenSellSwapData.push(response.data.data.toString());
                  tokenSellAmountContract.push(bal.toString());
                }
                allUnderlying.push(getUnderlyingTokens[j]);
              }
            }
          }
        }

        var oldWeights = await offChainRebalance1.getCurrentWeights();
        var allUnderlying: string[] = [];

        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance1.updateWeightStateData(),
        );
        sellTokens = stateData[0];
        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              sellTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            const getUnderlyingTokens: string[] = await handler.getUnderlying(sellTokens[i]);

            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (!allUnderlying.includes(getUnderlyingTokens[j])) {
                if (getUnderlyingTokens[j] != wbnb) {
                  const bal = await ERC20.attach(getUnderlyingTokens[j]).balanceOf(offChainRebalance1.address);
                  const params = {
                    sellToken: getUnderlyingTokens[j].toString(),
                    buyToken: wbnb,
                    sellAmount: bal.toString(),
                    slippagePercentage: 0.1,
                    gasPrice: "2000457106",
                    gas: "200000",
                  };
                  const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                    headers: {
                      "0x-api-key": process.env.ZEROX_KEY,
                    },
                  });
                  await delay(500);
                  sellTokensContract.push(getUnderlyingTokens[j]);
                  sellTokenSwapData.push(response.data.data.toString());
                  sellTokenAmountContract.push(bal.toString());
                }
                allUnderlying.push(getUnderlyingTokens[j]);
              }
            }
          }
        }

        for (let i = 0; i < tokenSellContract.length; i++) {
          sellTokensContract.push(tokenSellContract[i]);
          sellTokenSwapData.push(tokenSellSwapData[i]);
        }
        const buyAmount = (await ERC20.attach(wbnb).balanceOf(offChainRebalance1.address)).toBigInt();
        buyTokens = stateData[1];
        buyweight = stateData[2];
        sumWeight = stateData[3];
        for (let i = 0; i < buyTokens.length; i++) {
          if (buyTokens[i] != "0x0000000000000000000000000000000000000000") {
            slicedBuyTokens.push(buyTokens[i]);
            protocolFee.push(BigNumber.from(0).toString());
            const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(
              buyTokens[i],
            );
            const handlerAddress = tokenInfo[2];
            const handler = await ethers.getContractAt("IHandler", handlerAddress);
            var getUnderlyingTokens: string[] = await handler.getUnderlying(buyTokens[i]);
            var buyVal = BigNumber.from(buyAmount).mul(buyweight[i]).div(sumWeight);
            buyVal = BigNumber.from(buyVal).div(getUnderlyingTokens.length);
            for (let j = 0; j < getUnderlyingTokens.length; j++) {
              if (getUnderlyingTokens[j] != wbnb) {
                const params = {
                  sellToken: wbnb,
                  buyToken: getUnderlyingTokens[j],
                  sellAmount: buyVal.toString(),
                  slippagePercentage: 0.1,
                  gasPrice: "2000457106",
                  gas: "200000",
                };
                const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                  headers: {
                    "0x-api-key": process.env.ZEROX_KEY,
                  },
                });
                await delay(500);
                buyTokenSwapData.push(response.data.data.toString());
              } else {
                buyTokenSwapData.push("0x");
              }
              buyUnderlyingTokensContract.push(getUnderlyingTokens[j]);
              buyTokenAmountContract.push(buyVal.toString());
            }
          }
          protocolFee.push(BigNumber.from(0).toString());
        }

        // Rebalancing - Buying the tokens and staking it again to vault
        await expect(
          offChainRebalance1.connect(nonOwner).externalRebalance(
            {
              _offChainHandler: zeroExHandler.address,
              _buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
            },
            ["200", "200", "200"],
          ),
        ).to.be.revertedWithCustomError(offChainRebalance1, "InvalidExecution");
      });

      it("non assetManager should not be able to update portfolio to new tokens", async () => {
        const newTokens = [iaddress.wbnbAddress];
        const newWeights = [10000];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        var tokenSell = [];
        var sellTokens = [];
        var sellAmount = [];
        var swapAmount = [];
        var tokenSellSwapData = [];
        var buyTokens = [];
        var buyWeights = [];
        var sumWeight;

        const data: [string[], string[], string[], string[]] = await metaAggregator.callStatic.getUpdateTokenData(
          newTokens,
          newWeights,
        );
        tokenSell = data[0];
        sellTokens = data[1];
        sellAmount = data[2];
        swapAmount = data[3];
        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }

        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            if (tokenSell[i] != wbnb) {
              const params = {
                sellToken: tokenSell[i].toString(),
                buyToken: wbnb,
                sellAmount: sellAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        await offChainRebalance.enableAndUpdatePrimaryTokens(
          newTokens,
          newWeights,
          [0, 0, 0, 0, 0, 0],
          tokenSellSwapData,
          zeroExHandler.address,
        );

        await expect(metaAggregator.redeem("1", "200", iaddress.wbnbAddress)).to.be.revertedWithCustomError(metaAggregator,"AlreadyOngoingOperation");

        const abiCoder = ethers.utils.defaultAbiCoder;
        var stateData = abiCoder.decode(
          ["address[]", "address[]", "uint[]", "uint"],
          await offChainRebalance.updateWeightStateData(),
        );

        buyTokens = stateData[1];
        buyWeights = stateData[2];
        sumWeight = stateData[3];

        const buyAmount = await ERC20.attach(wbnb).balanceOf(offChainRebalance.address);
        var tokens = await indexSwap.getTokens();
        const v = await indexSwap.vault();
        var balanceBeforeToken = [];
        for (let i = 0; i < tokens.length; i++) {
          const token2 = await ethers.getContractAt("VBep20Interface", tokens[i]);
          balanceBeforeToken.push(await token2.balanceOf(v));
        }

        await expect(
          offChainRebalance.connect(nonOwner).externalRebalance(
            {
              _offChainHandler: zeroExHandler.address,
              _buyAmount: [BigNumber.from(buyAmount)],
              _buySwapData: ["0x"],
            },
            ["200", "200", "200"],
          ),
        ).to.be.revertedWithCustomError(offChainRebalance, "CallerNotAssetManager");

        await offChainRebalance.revertSellTokens();
      });

      it("should revert if AlreadyOngoingOperation", async () => {
        const tokens = await indexSwap.getTokens();
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const sToken = tokens[0];
        const bToken = addresses.vETH_Address;
        const sAmount = await ERC20.attach(sToken).balanceOf(await indexSwap.vault());
        const tx = await metaAggregator.redeem(sAmount, "200", sToken);

        const newTokens = [iaddress.busdAddress];
        const newWeights = [10000];
        await expect(offChainRebalance
          .enableRebalanceAndUpdateRecord(newTokens, newWeights, ["200"])).to.be.revertedWithCustomError(offChainRebalance,"AlreadyOngoingOperation");
        var tokenSell = [];
        var sellTokens = [];
        var sellAmount = [];
        var swapAmount = [];
        var tokenSellSwapData = [];
        var buyTokens = [];
        var buyWeights = [];
        var sumWeight;

        const data: [string[], string[], string[], string[]] = await metaAggregator.callStatic.getUpdateTokenData(
          newTokens,
          newWeights,
        );
        tokenSell = data[0];
        sellTokens = data[1];
        sellAmount = data[2];
        swapAmount = data[3];
        for (let i = 0; i < sellTokens.length; i++) {
          if (sellTokens[i] != "0x0000000000000000000000000000000000000000") {
            if (sellTokens[i] != wbnb) {
              const params = {
                sellToken: sellTokens[i].toString(),
                buyToken: wbnb,
                sellAmount: swapAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }

        for (let i = 0; i < tokenSell.length; i++) {
          if (tokenSell[i] != "0x0000000000000000000000000000000000000000") {
            if (tokenSell[i] != wbnb) {
              const params = {
                sellToken: tokenSell[i].toString(),
                buyToken: wbnb,
                sellAmount: sellAmount[i].toString(),
                slippagePercentage: 0.1,
                gasPrice: "2000457106",
                gas: "200000",
              };

              const response = await axios.get(addresses.zeroExUrl + `${qs.stringify(params)}`, {
                headers: {
                  "0x-api-key": process.env.ZEROX_KEY,
                },
              });
              await delay(500);
              tokenSellSwapData.push(response.data.data.toString());
            }
          }
        }
        await expect(offChainRebalance.enableAndUpdatePrimaryTokens(
          newTokens,
          newWeights,
          [0, 0, 0, 0, 0, 0],
          tokenSellSwapData,
          zeroExHandler.address,
        )).to.be.revertedWithCustomError(offChainRebalance,"AlreadyOngoingOperation");
      });
    });
  });
});
