import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import {
  tokenAddresses,
  IAddresses,
  RebalancingDeploy,
  venusHandler,
  baseHandler,
  beefyHandler,
  wombatHandler,
  indexSwapLibrary,
  accessController,
  pancakeLpHandler,
  priceOracle,
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
  IndexFactory,
  PancakeSwapHandler,
  ZeroExHandler,
  PancakeSwapLPHandler,
  OffChainRebalance__factory,
  ERC20Upgradeable,
  OffChainIndexSwap,
  IIndexSwap,
  IERC20Upgradeable,
  VelvetSafeModule,
  Exchange__factory
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";

var chai = require("chai");
const axios = require("axios");
const qs = require("qs");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for OffChainIndex", () => {
  let accounts;
  let indexSwap: any;
  let indexSwap1: any;
  let iaddress: IAddresses;
  let indexSwapContract: IndexSwap;
  let offChainIndexSwap: OffChainIndexSwap;
  let indexFactory: IndexFactory;
  let swapHandler: PancakeSwapHandler;
  let swapHandler1: PancakeSwapHandler;
  let lpHandler: PancakeSwapLPHandler;
  let exchange: any;
  let exchange1 : Exchange;
  let zeroExHandler: ZeroExHandler;
  let rebalancing: any;
  let rebalancing1: any;
  let velvetSafeModule: VelvetSafeModule;
  let gnosisSafeAddress: string;
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
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
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

      iaddress = await tokenAddresses();

      const ZeroExHandlerDefault = await ethers.getContractFactory("ZeroExHandler");
      zeroExHandler = await ZeroExHandlerDefault.deploy();
      await zeroExHandler.deployed();

      await tokenRegistry.initialize(
        "2500", // protocol fee
        "30", // protocolFeeBottomConstraint
        "1000", // max asset manager fee
        "3000", // max performance fee
        "500",
        "500",
        "3000000000000000000",
        "120000000000000000000000",
        nonOwner.address,
        addresses.WETH_Address,
        "1",
        15,
      );

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
        _whitelistedTokens: [],
        _publicPortfolio: true,
        _transferable: true,
        _transferableToPublic: true,
        _whitelistTokens: false,
      });

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

      const PancakeSwapHandler = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      const PancakeSwapHandler1 = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler1 = await PancakeSwapHandler1.deploy();
      await swapHandler1.deployed();

      swapHandler1.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

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
          addresses.vBTC_Address,
          addresses.vETH_Address,
          addresses.vBNB_Address,
          addresses.vDOGE_Address,
          addresses.vDAI_Address,
          addresses.Cake_BUSDLP_Address,
          addresses.Cake_WBNBLP_Address,
          addresses.MAIN_LP_BUSD,
          addresses.mooValasBUSD,
          addresses.MAIN_LP_DAI,
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
          [],
          [addresses.wombat_RewardToken],
        ],
        [true, true, true, true, true, true, false, false, false, false, false, false, false, false, false, false],
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
      await zeroExHandler.addOrUpdateProtocolSlippage("300");

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
        addresses.mooValasBUSD,
        addresses.MAIN_LP_BUSD,
        addresses.MAIN_LP_DAI,
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
            _velvetProtocolFee: "100",
            _maxInvestmentAmount: "120000000000000000000000",
            _minInvestmentAmount: "3000000000000000000",
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

      offChainRebalance = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo.offChainRebalancing);

      offChainRebalance1 = await ethers.getContractAt(OffChainRebalance__factory.abi, indexInfo1.offChainRebalancing);

      exchange = await ethers.getContractAt(Exchange__factory.abi, indexInfo.exchangeHandler);
      tokenRegistry.enableSwapHandlers([swapHandler.address]);
      await tokenRegistry.enablePermittedTokens(
        [iaddress.wbnbAddress, iaddress.busdAddress, iaddress.ethAddress, iaddress.btcAddress, iaddress.dogeAddress],
        [priceOracle.address, priceOracle.address, priceOracle.address, priceOracle.address, priceOracle.address],
      );

      // Granting owner index manager role to swap eth to token
      await accessController.grantRole(
        "0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16",
        owner.address,
      );

      console.log("indexSwap deployed to:", indexSwap.address);

      console.log("rebalancing:", rebalancing1.address);
    });

    describe("IndexFactory Contract", function () {
      const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
      it("Initialize IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([iaddress.wbnbAddress, addresses.vBTC_Address], [5000, 5000]);
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig.setPermittedTokens([
          iaddress.wbnbAddress,
          iaddress.btcAddress,
          iaddress.busdAddress,
          iaddress.ethAddress,
          iaddress.dogeAddress,
        ]);
      });

      it("should add pid", async () => {
        await pancakeLpHandler
          .connect(owner)
          .pidMap([addresses.Cake_BUSDLP_Address, addresses.Cake_WBNBLP_Address], [39, 0]);
      });
      it("Initialize 2nd IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap.attach(indexAddress);
        await index
          .connect(nonOwner)
          .initToken(
            [
              addresses.vBNB_Address,
              addresses.vETH_Address,
              addresses.Cake_BUSDLP_Address,
              iaddress.wbnbAddress,
              iaddress.dogeAddress,
            ],
            [3000, 3000, 2000, 1000, 1000],
          );
        const config = await indexSwap1.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await assetManagerConfig
          .connect(nonOwner)
          .setPermittedTokens([
            iaddress.wbnbAddress,
            iaddress.btcAddress,
            iaddress.busdAddress,
            iaddress.ethAddress,
            iaddress.dogeAddress,
          ]);
      });

      it("Invest 1 BNB into 1st fund ", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        await indexSwap.investInFund(
          {
            _slippage: ["300", "300"],
            _lpSlippage: ["200", "200"],
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
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.greaterThan(Number(CoolDownBefore));
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 2 BNB into Top10 2nd fund", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const indexSwap1 = indexSwap.attach(indexAddress);
        const indexSupplyBefore = await indexSwap1.totalSupply();

        await indexSwap1.connect(nonOwner).investInFund(
          {
            _slippage: ["300", "300", "300", "300", "300"],
            _lpSlippage: ["200", "200", "200", "200", "300"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: iaddress.wbnbAddress,
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

      it("Invest 2 BNB into Top10 2nd fund", async () => {
        const indexAddress = await indexFactory.getIndexList(1);
        const indexSwap1 = indexSwap.attach(indexAddress);
        const indexSupplyBefore = await indexSwap1.totalSupply();

        await indexSwap1.investInFund(
          {
            _slippage: ["300", "300", "300", "300", "300"],
            _lpSlippage: ["200", "200", "200", "200", "300"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler1.address,
            _token: iaddress.wbnbAddress,
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

      it("Invest 51.8 BUSD in 1st Index fund", async () => {
        var tokens = await indexSwap.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(nonOwner.address);
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(
          indexAddress,
          "51827592727492928772",
        );
        const busdtoken = ERC20.attach(iaddress.busdAddress);
        await swapHandler.swapETHToTokens("200", iaddress.busdAddress, nonOwner.address, {
          value: "100000000000000000000",
        });
        await busdtoken.connect(nonOwner).approve(offChainIndex.address, "1000000000000000000000");
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
          "51827592727492928772",
          ["200", "200", "200"],
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(nonOwner.address);
        expect(Number(CoolDownAfter)).to.be.greaterThan(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 1 BUSD in 1st Index fund should fail (under min amount)", async () => {
        var tokens = await indexSwap.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];

        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "10000000000000");
        const busdtoken = ERC20.attach(iaddress.busdAddress);
        var sellTokenAddress = busdtoken.address;
        const swapResult = await swapHandler.swapETHToTokens("200", iaddress.busdAddress, nonOwner.address, {
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
            "1000000000000000000",
            ["200", "200", "200"],
          ),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "WrongInvestmentAmount");
      });

      it("Invest 50 DOGE in 1st Index fund", async () => {
        var tokens = await indexSwap.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = iaddress.dogeAddress;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "5000000000");
        const dogeToken = ERC20.attach(iaddress.dogeAddress);
        await swapHandler
          .connect(owner)
          .swapETHToTokens("200", iaddress.dogeAddress, owner.address, {
            value: "1000000000000000000",
          });
        await dogeToken.approve(offChainIndex.address, "10000000000000000000");
        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
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
        const fund = await offChainIndex.investInFundOffChain(
          {
            sellTokenAddress: sellTokenAddress,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
          },
          "5000000000",
          ["500", "500", "500"],
        );

        await fund.wait();
        const indexSupplyAfter = await indexSwap.totalSupply();
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 50 DOGE in 2nd Index fund", async () => {
        var tokens = await indexSwap1.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = iaddress.dogeAddress;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const CoolDownBefore = await indexSwap1.lastWithdrawCooldown(owner.address);
        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(1);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "5000000000");
        const dogeToken = ERC20.attach(iaddress.dogeAddress);
        await swapHandler
          .connect(owner)
          .swapETHToTokens("200", iaddress.dogeAddress, owner.address, {
            value: "1000000000000000000",
          });
        await dogeToken.approve(offChainIndex.address, "10000000000000000000");
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
        const fund = await offChainIndex.investInFundOffChain(
          {
            sellTokenAddress: sellTokenAddress,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
          },
          "5000000000",
          ["800", "800", "800", "800", "800"],
        );

        await fund.wait();
        const indexSupplyAfter = await indexSwap1.totalSupply();
        const CoolDownAfter = await indexSwap1.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 50 DOGE should fail, if user input is incorrect in 2nd Index fund", async () => {
        var tokens = await indexSwap1.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = iaddress.dogeAddress;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const indexAddress = await indexFactory.getIndexList(1);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "5000000000");
        const dogeToken = ERC20.attach(iaddress.dogeAddress);
        await dogeToken.approve(offChainIndex.address, "10000000000000000000");
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
          offChainIndex.investInFundOffChain(
            {
              sellTokenAddress: sellTokenAddress,
              _buyToken: buyUnderlyingTokensContract,
              buyAmount: buyTokenAmountContract,
              _buySwapData: buyTokenSwapData,
              _offChainHandler: zeroExHandler.address,
            },
            "5000000000",
            ["200", "800", "200", "200", "200"],
          ),
        ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      });

      it("Invest 1 ETH should fail if user has sent wrong input in 2nd Index fund", async () => {
        var tokens = await indexSwap1.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = "0x2170Ed0880ac9A755fd29B2688956BD959F933F8";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexAddress = await indexFactory.getIndexList(1);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000000000000000");
        const ethToken = ERC20.attach(iaddress.ethAddress);
        // console.log("ethAddreess",iaddress.ethAddress);
        const swapResult = await swapHandler.connect(owner).swapETHToTokens("200", iaddress.ethAddress, owner.address, {
          value: "10000000000000000000",
        });
        await ethToken.approve(offChainIndex.address, "10000000000000000000");
        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
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
            "1000000000000000000",
            ["200", "200", "200"],
          ),
        ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      });

      it("Invest 1 ETH should fail if user tries to manipulate weight in 2nd Index", async () => {
        var tokens = await indexSwap1.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = "0x2170Ed0880ac9A755fd29B2688956BD959F933F8";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexAddress = await indexFactory.getIndexList(1);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000000000000000");
        const ethToken = ERC20.attach(iaddress.ethAddress);
        await ethToken.approve(offChainIndex.address, "10000000000000000000");
        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
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
            "1000000000000000000",
            ["200", "200", "200"],
          ),
        ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      });

      it("Invest 1 ETH should fail if user has sent wrong input in 1st Index fund", async () => {
        var tokens = await indexSwap.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = "0x2170Ed0880ac9A755fd29B2688956BD959F933F8";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000000000000000");
        const ethToken = ERC20.attach(iaddress.ethAddress);
        // console.log("ethAddreess",iaddress.ethAddress);
        const swapResult = await swapHandler.connect(owner).swapETHToTokens("200", iaddress.ethAddress, owner.address, {
          value: "10000000000000000000",
        });
        await ethToken.approve(offChainIndex.address, "10000000000000000000");
        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
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
            "1000000000000000000",
            ["200", "200", "200"],
          ),
        ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      });

      it("Invest 1 ETH should fail if user tries to manipulate weight", async () => {
        var tokens = await indexSwap.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = "0x2170Ed0880ac9A755fd29B2688956BD959F933F8";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "1000000000000000000");
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          let buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          if (i == 1) {
            buyVal = BigNumber.from("1000000000000000000").mul(70).div(100);
          } else {
            buyVal = BigNumber.from("1000000000000000000").mul(30).div(100);
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
            "1000000000000000000",
            ["200", "200", "200"],
          ),
        ).to.be.revertedWithCustomError(exchange, "InvalidBuyValues");
      });

      it("Invest 0.01 BTC in 1st Index fund", async () => {
        var tokens = await indexSwap.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex.callStatic.calculateSwapAmountsOffChain(indexAddress, "10000000000000000");
        const btcToken = ERC20.attach(iaddress.btcAddress);
        const swapResult = await swapHandler.connect(owner).swapETHToTokens("200", iaddress.btcAddress, owner.address, {
          value: "10000000000000000000",
        });
        await btcToken.approve(offChainIndex.address, "10000000000000000000");
        // I have - amount to buy, BuyTokenAddress, SellTokenAddress ,need to calculate swapData
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
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
                gasPrice: "3500457106",
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
        const fund = await offChainIndex.investInFundOffChain(
          {
            sellTokenAddress: sellTokenAddress,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
          },
          "10000000000000000",
          ["200", "200", "200"],
        );

        await fund.wait();
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 1 BNB into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);

        await indexSwap.investInFund(
          {
            _slippage: ["300", "300"],
            _lpSlippage: ["200", "200"],
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
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 10 BUSD in 2nd Index fund", async () => {
        var tokens = await indexSwap1.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        var sellTokenAddress = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap1.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Mining the tx
        sellAmount = await offChainIndex
          .connect(nonOwner)
          .calculateSwapAmountsOffChain(indexAddress, "10000000000000000000");
        await sellAmount.wait();
        //Static call for return
        const result = await offChainIndex
          .connect(nonOwner)
          .callStatic.calculateSwapAmountsOffChain(indexAddress, "10000000000000000000");
        const busdtoken = ERC20.attach(iaddress.busdAddress);
        const swapResult = await swapHandler
          .connect(owner)
          .swapETHToTokens("200", iaddress.busdAddress, nonOwner.address, {
            value: "1000000000000000000",
          });
        await busdtoken.connect(nonOwner).approve(offChainIndex.address, "10000000000000000000");
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
        const fund = await offChainIndex.connect(nonOwner).investInFundOffChain(
          {
            sellTokenAddress: sellTokenAddress,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
          },
          "10000000000000000000",
          ["200", "200", "200", "200", "300"],
        );

        await fund.wait();
        const indexSupplyAfter = await indexSwap1.totalSupply();
        // console.log(indexSupplyAfter);
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.1 BNB in 2nd Index fund", async () => {
        var tokens = await indexSwap1.getTokens();
        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap1.totalSupply();
        // console.log("2 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(1);
        const index = indexSwap1.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Mining the tx
        sellAmount = await offChainIndex
          .connect(nonOwner)
          .calculateSwapAmountsOffChain(indexAddress, "100000000000000000");
        await sellAmount.wait();
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
            if (getUnderlyingTokens[j] != wbnb) {
              const params = {
                sellToken: wbnb,
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
            sellTokenAddress: wbnb,
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

      it("Invest 1 BNB into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);

        const tokens = await indexSwap.getTokens();

        const v = await indexSwap.vault();

        await indexSwap.investInFund(
          {
            _slippage: ["300", "300"],
            _lpSlippage: ["200", "200"],
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
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("redeem should fail if a non-permitted and non-WETH token is passed as the out asset", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB
        var sellAmount;

        var allUnderlying: string[] = [];
        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        const ownerBalanceBefore = await owner.getBalance();
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
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB
        var sellAmount;

        var allUnderlying: string[] = [];
        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        const ownerBalanceBefore = await owner.getBalance();
        //Mining the tx
        sellAmount = await offChainIndex.redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["200", "200", "200", "200", "200"],
          token: wbnb,
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
        const assetManagerConfig = AssetManagerConfig.attach(config);

        for (let key in m) {
          if (key != wbnb) {
            await delay(2000);
            const params = {
              sellToken: key.toString(),
              buyToken: wbnb,
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
          tokens: [iaddress.wbnbAddress, addresses.Cake_BUSDLP_Address, addresses.vBNB_Address],
          _swapHandler: swapHandler.address,
          denorms: [2000, 6000, 2000],
          _slippageSell: ["200", "200"],
          _slippageBuy: ["200", "200", "200"],
          _lpSlippageSell: ["200", "200"],
          _lpSlippageBuy: ["200", "200", "200"],
        });

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

      it("Invest 1 BNB into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
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
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should revert if sellToken address length is manupilated and triggermultiple withdrawal", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB
        var sellAmount;

        var allUnderlying: string[] = [];
        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Mining the tx
        sellAmount = await offChainIndex.redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["200", "200", "200", "200", "200"],
          token: wbnb,
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
        const assetManagerConfig = AssetManagerConfig.attach(config);

        for (let key in m) {
          if (key != wbnb) {
            await delay(2000);
            const params = {
              sellToken: key.toString(),
              buyToken: wbnb,
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

      it("Invest 1 BNB into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 bnb before", indexSupplyBefore);
        await indexSwap.connect(owner).investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
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
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should Update Weights and Rebalance for 2nd Index", async () => {
        await rebalancing1
          .connect(nonOwner)
          .updateWeights(
            [4667, 1333, 2000, 1000, 1000],
            ["200", "200", "200", "200", "300"],
            ["200", "200", "200", "200", "300"],
            swapHandler.address,
          );
      });

      it("Invest 2 BNB in 2nd Index fund", async () => {
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
            if (getUnderlyingTokens[j] != wbnb) {
              const params = {
                sellToken: wbnb,
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
            sellTokenAddress: wbnb,
            _buyToken: buyUnderlyingTokensContract,
            buyAmount: buyTokenAmountContract,
            _buySwapData: buyTokenSwapData,
            _offChainHandler: zeroExHandler.address,
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

      it("Invest 2 BNB in 1st Index fund", async () => {
        var tokens = await indexSwap.getTokens();

        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
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
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != wbnb) {
              const params = {
                sellToken: wbnb,
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
            sellTokenAddress: wbnb,
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

      it("should fail if offchainHandler is not valid", async () => {
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
            if (getUnderlyingTokens[j] != wbnb) {
              const params = {
                sellToken: wbnb,
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
          offChainIndex.connect(nonOwner).investInFundOffChain(
            {
              sellTokenAddress: wbnb,
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
        ).to.be.revertedWithCustomError(indexSwapLibrary, "OffHandlerNotEnabled");
      });

      it("Invest 1 BNB in 1st Index fund should revert if bnb value is greater than 0 and investment token is not bnb", async () => {
        var tokens = await indexSwap.getTokens();

        var sellAmount;

        var buyUnderlyingTokensContract = [];
        var buyTokenAmountContract = [];
        var buyTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
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
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != wbnb) {
              const params = {
                sellToken: wbnb,
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
          offChainIndex.connect(nonOwner).investInFundOffChain(
            {
              sellTokenAddress: iaddress.busdAddress,
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
        ).to.be.revertedWithCustomError(indexSwap, "InvalidToken");
      });

      it("withdraw should fail if user balance falls below min amount", async () => {
        // var tokens = await indexSwap.getTokens();
        var sellAmount;

        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];

        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Mining the tx

        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        let AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB
        AMOUNT = AMOUNT.sub("10000000000000000"); //1BNB
        await expect(
          offChainIndex.redeemTokens({
            tokenAmount: AMOUNT.toString(),
            _lpSlippage: ["600", "600", "600"],
            token: wbnb,
          }),
        )
          .to.be.revertedWithCustomError(indexSwap, "BalanceCantBeBelowVelvetMinInvestAmount")
          .withArgs("3000000000000000000");
      });

      it("should withdraw fund and burn index token successfully for 1st Index ,Simultaneously for both user", async () => {
        // var tokens = await indexSwap.getTokens();
        var sellAmount;

        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];

        var sellTokensContract2 = [];
        var sellTokenAmountContract2 = [];
        var sellTokenSwapData2 = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Mining the tx

        const user2BNBBalanceBefore = await nonOwner.getBalance();
        const amountIndexToken2 = await indexSwap.balanceOf(nonOwner.address);

        const AMOUNT2 = ethers.BigNumber.from(amountIndexToken2); //1BNB
        sellAmount = await offChainIndex.connect(nonOwner).redeemTokens({
          tokenAmount: AMOUNT2,
          _lpSlippage: ["600", "600", "600"],
          token: wbnb,
        });
        await sellAmount.wait();

        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB
        sellAmount = await offChainIndex.redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["600", "600", "600"],
          token: wbnb,
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
          if (key != wbnb) {
            const params = {
              sellToken: key.toString(),
              buyToken: wbnb,
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
        const user2BNBBalanceAfter = await nonOwner.getBalance();
        const indexSupplyAfter = await indexSwap.totalSupply();

        expect(Number(indexSupplyBefore)).to.be.greaterThan(Number(indexSupplyAfter));
        for (let j = 0; j < sellTokensContract.length; j++) {
          expect(
            Number(await offChainIndex.userUnderlyingAmounts(nonOwner.address, sellTokensContract[j])),
          ).to.be.equal(Number(0));
        }
        expect(Number(user2BNBBalanceAfter)).to.be.greaterThan(Number(user2BNBBalanceBefore));

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
          if (key != wbnb) {
            const params = {
              sellToken: key.toString(),
              buyToken: wbnb,
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
        const index = indexSwap1.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
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
            if (getUnderlyingTokens[j] != wbnb) {
              const params = {
                sellToken: wbnb,
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
        const fund = await offChainIndex.connect(addr2).investInFundOffChain(
          {
            sellTokenAddress: wbnb,
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
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("addr2 should emergency withdraw", async () => {
        const amountIndexToken = await indexSwap1.balanceOf(addr2.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);
        var sellAmount;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap1.totalSupply();
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(1)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);

        let balanceBefore = [];
        for (let i = 0; i < indexSwap1.getTokens(); i++) {
          balanceBefore[i] = await ERC20.attach(indexSwap1.getTokens()[i]).balanceOf(addr2.address);
        }
        sellAmount = await offChainIndex.connect(addr2).redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["200", "200", "200", "200", "200"],
          token: wbnb,
        });
        await sellAmount.wait();

        await offChainIndex.connect(addr2).triggerMultipleTokenWithdrawal();
        const indexSupplyAfter = await indexSwap1.totalSupply();
        let balanceAfter = [];
        for (let i = 0; i < indexSwap1.getTokens(); i++) {
          balanceAfter[i] = await ERC20.attach(indexSwap1.getTokens()[i]).balanceOf(addr2.address);
          expect(Number(balanceAfter[i])).to.be.greaterThan(Number(balanceBefore[i]));
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
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        //Static call for return
        const result = await offChainIndex
          .connect(owner)
          .callStatic.calculateSwapAmountsOffChain(indexAddress, "2134716274827482727");
        for (let i = 0; i < tokens.length; i++) {
          const tokenInfo: [boolean, boolean, string, string[]] = await tokenRegistry.getTokenInformation(tokens[i]);
          const handlerAddress = tokenInfo[2];
          const handler = await ethers.getContractAt("IHandler", handlerAddress);
          const getUnderlyingTokens: string[] = await handler.getUnderlying(tokens[i]);
          const buyVal = BigNumber.from(result[i]).div(getUnderlyingTokens.length);
          for (let j = 0; j < getUnderlyingTokens.length; j++) {
            if (getUnderlyingTokens[j] != wbnb) {
              const params = {
                sellToken: wbnb,
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
            sellTokenAddress: wbnb,
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
        console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("TriggerMultiple TokenWithdrawal withdraw should fail is protocol is paused and work if protocol is unpaused", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken);
        var sellAmount;
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);

        let balanceBefore = [];
        for (let i = 0; i < indexSwap.getTokens(); i++) {
          balanceBefore[i] = await ERC20.attach(indexSwap.getTokens()[i]).balanceOf(owner.address);
        }
        sellAmount = await offChainIndex.connect(owner).redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["200", "200", "200", "200", "200"],
          token: wbnb,
        });
        await sellAmount.wait();

        await tokenRegistry.setProtocolPause(true);
        await expect(offChainIndex.connect(owner).triggerMultipleTokenWithdrawal()).to.be.revertedWithCustomError(
          offChainIndex,
          "ProtocolIsPaused",
        );
        await tokenRegistry.setProtocolPause(false);
        await offChainIndex.connect(owner).triggerMultipleTokenWithdrawal();
        const indexSupplyAfter = await indexSwap.totalSupply();
        let balanceAfter = [];
        for (let i = 0; i < indexSwap.getTokens(); i++) {
          balanceAfter[i] = await ERC20.attach(indexSwap.getTokens()[i]).balanceOf(owner.address);
          expect(Number(balanceAfter[i])).to.be.greaterThan(Number(balanceBefore[i]));
        }

        expect(Number(indexSupplyBefore)).to.be.greaterThan(Number(indexSupplyAfter));
      });

      it("Non owner should not triggerMultiple TokenWithdrawal withdraw", async () => {
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);

        await expect(offChainIndex.connect(addr3).triggerMultipleTokenWithdrawal()).to.be.revertedWithCustomError(
          offChainIndex,
          "TokensNotRedeemed",
        );
      });

      it("Invest 1 BNB into 1st Top10 fund", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);
        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["300", "300", "300"],
            _lpSlippage: ["200", "200", "200"],
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
        // console.log("diff", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Withdraw and triggerMultipleWithdrawal should fail if the protocol is paused", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB
        var sellAmount;

        var allUnderlying: string[] = [];
        var sellTokensContract = [];
        var sellTokenAmountContract = [];
        var sellTokenSwapData = [];
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");

        const indexSupplyBefore = await indexSwap.totalSupply();
        console.log("1 bnb before", indexSupplyBefore);
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        let offChainIndexAddress = (await indexFactory.IndexSwapInfolList(0)).offChainIndexSwap;
        const offChainIndex = offChainIndexSwap.attach(offChainIndexAddress);
        const ownerBalanceBefore = await owner.getBalance();
        //Mining the tx
        sellAmount = await offChainIndex.redeemTokens({
          tokenAmount: AMOUNT,
          _lpSlippage: ["800", "800", "800", "800", "800"],
          token: wbnb,
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
        const assetManagerConfig = AssetManagerConfig.attach(config);

        for (let key in m) {
          if (key != wbnb) {
            await delay(2000);
            const params = {
              sellToken: key.toString(),
              buyToken: wbnb,
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
