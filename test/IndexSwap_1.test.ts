import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";

import {
  tokenAddresses,
  IAddresses,
  RebalancingDeploy,
  indexSwapLibrary,
  baseHandler,
  venusHandler,
  wombatHandler,
  apeSwapLPHandler,
  biSwapLPHandler,
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
  Exchange__factory,
  AccessController__factory,
  RebalanceAggregator__factory,
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
  let metaAggregator: any;
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
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for MixedIndex ", () => {
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
        ],
        [
          iaddress.busdAddress,
          iaddress.btcAddress,
          iaddress.ethAddress,
          iaddress.wbnbAddress,
          iaddress.dogeAddress,
          iaddress.daiAddress,
          addresses.Cake_BUSDLP_Address,
          addresses.Cake_WBNBLP_Address,
          addresses.MAIN_LP_BUSD,
          addresses.MAIN_LP_DAI,
          addresses.SIDE_LP_BUSD,
          addresses.LP_BNBx,
          addresses.BSwap_WBNB_BUSDLP_Address,
          addresses.ApeSwap_ETH_BTCB_Address,
          addresses.BSwap_BTC_WBNBLP_Address,
          addresses.ApeSwap_WBNB_BUSD_Address,
        ],
        [
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          baseHandler.address,
          pancakeLpHandler.address,
          pancakeLpHandler.address,
          wombatHandler.address,
          wombatHandler.address,
          wombatHandler.address,
          wombatHandler.address,
          biSwapLPHandler.address,
          apeSwapLPHandler.address,
          biSwapLPHandler.address,
          apeSwapLPHandler.address,
        ],
        [
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.biswap_RewardToken],
          [addresses.apeSwap_RewardToken],
          [addresses.biswap_RewardToken],
          [addresses.apeSwap_RewardToken],
        ],
        [true, true, true, true, true, true, false, false, false, false, false, false, false, false, false, false],
      );
      registry1.wait();
      tokenRegistry.enableSwapHandlers([swapHandler.address]);
      tokenRegistry.addNonDerivative(wombatHandler.address);

      let whitelistedTokens = [
        iaddress.wbnbAddress,
        iaddress.busdAddress,
        iaddress.ethAddress,
        iaddress.daiAddress,
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
        addresses.ApeSwap_ETH_BTCB_Address,
        addresses.ibBNB_Address,
        addresses.ibBUSD_Address,
        addresses.ibBTCB_Address,
        addresses.MAIN_LP_DAI,
        addresses.MAIN_LP_BUSD,
        addresses.mooBTCBUSDLP,
        addresses.LP_BNBx,
      ];
      await tokenRegistry.enablePermittedTokens(
        [iaddress.busdAddress, iaddress.wbnbAddress, iaddress.ethAddress, iaddress.daiAddress],
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
            _velvetProtocolFee: "100",
            _maxInvestmentAmount: "120000000000000000000000",
            _minInvestmentAmount: "3000000000000000000",
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
        await expect(
          indexSwap.initToken(
            [addresses.BSwap_WBNB_BUSDLP_Address, addresses.ApeSwap_ETH_BTCB_Address, addresses.Cake_BUSDLP_Address],
            [100, 1000, 100],
          ),
        )
          .to.be.revertedWithCustomError(indexSwap, "InvalidWeights")
          .withArgs("10000");
      });

      it("Initialize should fail if the number of tokens exceed the max limit set during deployment (current = 15)", async () => {
        await expect(
          indexSwap.initToken(
            [
              iaddress.wbnbAddress,
              iaddress.busdAddress,
              iaddress.ethAddress,
              iaddress.daiAddress,
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
            ],
            [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 2000, 3000, 2000, 2000],
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
              iaddress.wbnbAddress,
              iaddress.busdAddress,
              iaddress.ethAddress,
              iaddress.daiAddress,
              iaddress.btcAddress,
              iaddress.dogeAddress,
              addresses.vETH_Address,
              addresses.vBTC_Address,
              addresses.vBNB_Address,
              addresses.vDAI_Address,
              addresses.vDOGE_Address,
              addresses.vLINK_Address,
            ],
            [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 4000, 5000],
          ),
        ).to.be.revertedWithCustomError(indexSwap, "TokenCountOutOfLimit");
      });

      it("Initialize IndexFund Tokens", async () => {
        await indexSwap.initToken(
          [addresses.BSwap_BTC_WBNBLP_Address, addresses.ApeSwap_ETH_BTCB_Address, addresses.Cake_WBNBLP_Address],
          [5000, 2000, 3000],
        );
      });

      it("should add pid", async () => {
        await pancakeLpHandler.connect(owner).pidMap([addresses.Cake_WBNBLP_Address], [0]);
        await apeSwapLPHandler.connect(owner).pidMap([addresses.ApeSwap_WBNB_BUSD_Address], [0]);
      });

      it("should remove pid", async () => {
        await apeSwapLPHandler.connect(owner).removePidMap([addresses.ApeSwap_WBNB_BUSD_Address], [0]);
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

      it("Invest 0.1 BNB should not revert , if investing token is not initialized", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        console.log("indexSupplyBefore", indexSupplyBefore);
        console.log("owner address",owner.address);
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200", "200"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log(indexSupplyAfter);
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.greaterThan(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 10BUSD should revert , if investing token is not initialized", async () => {
        await expect(
          indexSwap.investInFund({
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["200", "200", "200"],
            _tokenAmount: "10000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.busdAddress,
          }),
        ).to.be.revertedWithCustomError(indexSwapLibrary, "InvalidToken");
      });

      it("asset manager should be able to add token which is approved in registry", async () => {
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

      it("Invest 0.1BNB into Top10 fund should fail if LP slippage is invalid", async () => {
        await expect(
          indexSwap.investInFund(
            {
              _slippage: ["500", "500", "500"],
              _lpSlippage: ["2800", "2800", "2800"],
              _tokenAmount: "100000000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.wbnbAddress,
            },
            {
              value: "100000000000000000",
            },
          ),
        ).to.be.revertedWithCustomError(biSwapLPHandler, "InvalidLPSlippage");
      });

      it("Invest 0.1BNB into Top10 fund", async () => {

        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("0.1bnb before", indexSupplyBefore);
        console.log("owner address",owner.address);
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100", "100"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log("0.1bnb after:", indexSupplyAfter);
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });



      it("Invest 10BUSD into Top10 fund", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const CoolDownBefore = await indexSwap.lastWithdrawCooldown(owner.address);
        const busdtoken = ERC20.attach(iaddress.busdAddress);
        const ethtoken = ERC20.attach(iaddress.ethAddress);
        const btctoken = ERC20.attach(iaddress.btcAddress);
        const wbnbtoken = ERC20.attach(iaddress.wbnbAddress);
        // console.log("swap start");
        const swapResult = await swapHandler
          .connect(owner)
          .swapETHToTokens("200", iaddress.busdAddress, owner.address, {
            value: "1000000000000000000",
          });

        // console.log("swap done");
        await busdtoken.approve(indexSwap.address, "10000000000000000000");
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("10busd before", indexSupplyBefore);
        // console.log("vault eth balance before", await ethtoken.balanceOf(indexSwap.vault()));
        // console.log("vault bnb balance before", await wbnbtoken.balanceOf(indexSwap.vault()));
        await indexSwap.investInFund({
          _slippage: ["200", "200", "200"],
          _lpSlippage: ["800", "800", "800"],
          _tokenAmount: "10000000000000000000",
          _swapHandler: swapHandler.address,
          _token: iaddress.busdAddress,
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        const CoolDownAfter = await indexSwap.lastWithdrawCooldown(owner.address);
        expect(Number(CoolDownAfter)).to.be.equal(Number(CoolDownBefore));
        // console.log("10BUSD After", indexSupplyAfter);
        // console.log("vault eth balance after", await ethtoken.balanceOf(indexSwap.vault()));
        // console.log("vault bnb balance after", await wbnbtoken.balanceOf(indexSwap.vault()));

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.00001 BNB into Top10 fund should fail", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("0.00001bnb before:", indexSupplyBefore);
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
        // console.log("0.00001bnb after:", indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("2bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["500", "500", "500"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log("2bnb after:", indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("should return false if both of the token in pool is not bnb", async () => {
        expect(await exchange.callStatic.isWETH(addresses.MAIN_LP_BUSD, wombatHandler.address)).to.be.false;
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("1bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["700", "700", "700"],
            _lpSlippage: ["800", "800", "800"],
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        //console.log("1bnb after", indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        // console.log("1bnb after:", indexSupplyAfter);
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
          .to.be.revertedWithCustomError(rebalancing, "InvalidWeights")
          .withArgs("10000");
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights(
          [3333, 5667, 1000],
          ["500", "500", "500"],
          ["800", "800", "800"],
          swapHandler.address,
        );
      });

      it("updateTokens should revert if total Weights not equal 10,000", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        await expect(
          rebalancing.updateTokens({
            tokens: [addresses.MAIN_LP_BUSD, addresses.LP_BNBx, addresses.MAIN_LP_DAI, addresses.Cake_BUSDLP_Address],
            _swapHandler: swapHandler.address,
            denorms: [2000, 5000, 1000, 1000],
            _slippageSell: ["200", "200", "200"],
            _slippageBuy: ["200", "200", "200", "200"],
            _lpSlippageSell: ["200", "200", "200"],
            _lpSlippageBuy: ["200", "200", "200", "200"],
          }),
        )
          .to.be.revertedWithCustomError(rebalancing, "InvalidWeights")
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
        const token = await ethers.getContractAt("VBep20Interface", addresses.Cake_BUSDLP_Address);

        await rebalancing.connect(nonOwner).updateTokens({
          tokens: [
            addresses.MAIN_LP_BUSD,
            addresses.LP_BNBx,
            addresses.BSwap_BTC_WBNBLP_Address,
            addresses.Cake_BUSDLP_Address,
          ],
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
        const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(
          indexSwap.withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["200", "800", "200", "200"],
            _lpSlippage: ["200", "200", "200", "200"],
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
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
        const AMOUNT = ethers.BigNumber.from(updateAmount.toString()); //

        await expect(
          indexSwap.connect(nonOwner).withdrawFund({
            tokenAmount: AMOUNT,
            _slippage: ["200", "800", "200", "200"],
            _lpSlippage: ["200", "200", "200", "200"],
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
            _slippage: ["200", "800", "200", "200"],
            _lpSlippage: ["200", "200", "200", "200"],
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
            _slippage: ["200", "800", "200", "200"],
            _lpSlippage: ["200", "200", "200", "200"],
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
        // console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB
        // console.log(AMOUNT);

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["400", "800", "400", "400"],
          _lpSlippage: ["700", "700", "700", "700"],
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
            _slippage: ["300", "300", "300", "300"],
            _lpSlippage: ["200", "200", "200", "200"],
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
            _slippage: ["300", "300", "300", "300"],
            _lpSlippage: ["200", "200", "200", "200"],
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
            _slippage: ["300", "300", "300", "300"],
            _lpSlippage: ["800", "800", "800", "800"],
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
            _slippage: ["700", "700", "700", "700"],
            _lpSlippage: ["800", "800", "800", "800"],
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

      it("should withdraw fund in ETH and burn index token successfully", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        // console.log(amountIndexToken, "amountIndexToken");
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const ethtoken = ERC20.attach(iaddress.ethAddress);
        const balanceBefore = await ethtoken.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["700", "900", "700", "700"],
          _lpSlippage: ["200", "200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.ethAddress,
        });

        const balanceAfter = await ethtoken.balanceOf(owner.address);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));

        expect(txObject.confirmations).to.equal(1);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("0.1bnb before:", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["700", "900", "700", "700"],
            _lpSlippage: ["800", "800", "800", "800"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log("0.1bnb after:", indexSupplyAfter);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("0.1bnb before:", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["700", "900", "700", "700"],
            _lpSlippage: ["800", "800", "800", "800"],
            _tokenAmount: "100000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "100000000000000000",
          },
        );

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log("0.1bnb after:", indexSupplyAfter);
      });

      it("should withdraw tokens directly instead of BNB", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["200", "800", "200", "200"],
          _lpSlippage: ["800", "800", "800", "800"],
          isMultiAsset: true,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });
      });
    });
  });
});
