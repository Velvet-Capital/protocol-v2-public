import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";
import {
  tokenAddresses,
  indexSwapLibrary,
  baseHandler,
  accessController,
  venusHandler,
  wombatHandler,
  beefyHandler,
  pancakeLpHandler,
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
  MockPriceOracle,
  IERC20Upgradeable__factory,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";
import { MerkleTree } from "merkletreejs";
import { BigNumber } from "ethers";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for Mock Fee", () => {
  let accounts;
  let mockPriceOracle: MockPriceOracle;
  let priceOracle: PriceOracle;
  let indexSwap: any;
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
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  let velvetTreasuryBalance = 0;
  let assetManagerTreasuryBalance = 0;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];
  const wbnbInstance = new ethers.Contract(
    addresses.WETH_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  const busdInstance = new ethers.Contract(addresses.BUSD, IERC20Upgradeable__factory.abi, ethers.getDefaultProvider());
  const dogeInstance = new ethers.Contract(
    addresses.DOGE_Address,
    IERC20Upgradeable__factory.abi,
    ethers.getDefaultProvider(),
  );
  describe.only("Tests for Mock Fee", () => {
    before(async () => {
      const PriceOracle = await ethers.getContractFactory("MockPriceOracle");
      mockPriceOracle = await PriceOracle.deploy();
      await mockPriceOracle.deployed();

      const PriceOracle2 = await ethers.getContractFactory("PriceOracle");
      priceOracle = await PriceOracle2.deploy();
      await priceOracle.deployed();

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

      const tx = await mockPriceOracle._addFeed(
        [
          wbnbInstance.address,
          busdInstance.address,
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
          busdInstance.address,
          dogeInstance.address,
        ],
        [
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          wbnbInstance.address,
          "0x0000000000000000000000000000000000000348",
        ],
        [
          "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
          "0xcBb98864Ef56E9042e7d2efef76141f15731B82f",
          "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
          "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf",
          "0x87Ea38c9F24264Ec1Fff41B04ec94a97Caf99941",
          "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8",
        ],
      );

      await priceOracle._addFeed(
        [
          wbnbInstance.address,
          busdInstance.address,
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
          busdInstance.address,
          dogeInstance.address,
        ],
        [
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          wbnbInstance.address,
          "0x0000000000000000000000000000000000000348",
        ],
        [
          "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
          "0xcBb98864Ef56E9042e7d2efef76141f15731B82f",
          "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
          "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf",
          "0x87Ea38c9F24264Ec1Fff41B04ec94a97Caf99941",
          "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8",
        ],
      );
      const wbnbPrice = await priceOracle.getPrice(wbnbInstance.address, "0x0000000000000000000000000000000000000348");
      const busdPrice = await priceOracle.getPrice(busdInstance.address, "0x0000000000000000000000000000000000000348");
      const dogePrice = await priceOracle.getPrice(dogeInstance.address, "0x0000000000000000000000000000000000000348");
      const normalPrice = await priceOracle.getPrice(
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "0x0000000000000000000000000000000000000348",
      );
      console.log("wbnbPrice", wbnbPrice);
      await mockPriceOracle.setMockData(wbnbInstance.address, wbnbPrice);
      await mockPriceOracle.setMockData(busdInstance.address, busdPrice);
      await mockPriceOracle.setMockData(dogeInstance.address, dogePrice);
      await mockPriceOracle.setMockData("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", normalPrice);

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
          "10000000000000000",
          "500000000000000000000",
          treasury.address,
          addresses.WETH_Address,
          "1",
        ],
        { kind: "uups" },
      );

      tokenRegistry = TokenRegistry.attach(registry.address);

      const PancakeSwapHandler = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, mockPriceOracle.address);

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
        [mockPriceOracle.address, mockPriceOracle.address, mockPriceOracle.address],
        [busdInstance.address, wbnbInstance.address, dogeInstance.address],
        [baseHandler.address, baseHandler.address, baseHandler.address],
        [[addresses.base_RewardToken], [addresses.base_RewardToken], [addresses.base_RewardToken]],
        [true, true, true],
      );
      registry1.wait();
      tokenRegistry.enableSwapHandlers([swapHandler.address, swapHandler1.address]);

      await tokenRegistry.enablePermittedTokens(
        [busdInstance.address, wbnbInstance.address, dogeInstance.address],
        [mockPriceOracle.address, mockPriceOracle.address, mockPriceOracle.address],
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
            _priceOracle: mockPriceOracle.address,
            _tokenRegistry: tokenRegistry.address,
            _velvetProtocolFee: "100",
            _maxInvestmentAmount: "500000000000000000000",
            _minInvestmentAmount: "10000000000000000",
          },
        ],
        { kind: "uups" },
      );

      indexFactory = IndexFactory.attach(indexFactoryInstance.address);

      let whitelistedTokens = [busdInstance.address, wbnbInstance.address, dogeInstance.address];

      await assetManagerConfig.init({
        _managementFee: "200",
        _performanceFee: "2500",
        _entryFee: "100",
        _exitFee: "100",
        _minInvestmentAmount: "10000000000000000",
        _maxInvestmentAmount: "500000000000000000000",
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
        maxIndexInvestmentAmount: "500000000000000000000",
        minIndexInvestmentAmount: "10000000000000000",
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

      const indexAddress = await indexFactory.getIndexList(0);
      indexInfo = await indexFactory.IndexSwapInfolList(0);

      indexSwap = await ethers.getContractAt(IndexSwap__factory.abi, indexAddress);

      const accessController0Addr = await indexSwap.accessController();
      accessController0 = accessController.attach(accessController0Addr);

      rebalancing = await ethers.getContractAt(Rebalancing__factory.abi, indexInfo.rebalancing);
      feeModule0 = FeeModule.attach(indexInfo.feeModule);
      console.log("indexSwap deployed to:", indexSwap.address);
    });

    describe("IndexFactory Contract", function () {
      it("should revert back if the custodial is true and no address is passed in _owner", async () => {
        await expect(
          indexFactory.connect(nonOwner).createIndexCustodial(
            {
              name: "INDEXLY",
              symbol: "IDX",
              maxIndexInvestmentAmount: "500000000000000000000",
              minIndexInvestmentAmount: "10000000000000000",
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
              maxIndexInvestmentAmount: "500000000000000000000",
              minIndexInvestmentAmount: "10000000000000000",
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

      it("Initialize 1st IndexFund Tokens", async () => {
        const indexAddress = await indexFactory.getIndexList(0);
        const index = indexSwap.attach(indexAddress);
        await index.initToken([busdInstance.address, wbnbInstance.address], [5000, 5000]);
      });

      it("Calculate fees should return fee values", async () => {
        const res = await feeModule0.callStatic.calculateFees();

        expect(Number(res._protocolFee)).to.be.equal(Number(0));
        expect(Number(res._managementFee)).to.be.equal(Number(0));
        expect(Number(res._performanceFee)).to.be.equal(Number(0));
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "1000000000000000000",
            _swapHandler: swapHandler.address,
            _token: wbnbInstance.address,
          },
          {
            value: "1000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: wbnbInstance.address,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["100", "100"],
            _lpSlippage: ["200", "200"],
            _to: owner.address,
            _tokenAmount: "2000000000000000000",
            _swapHandler: swapHandler.address,
            _token: wbnbInstance.address,
          },
          {
            value: "2000000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        console.log("DIFFFFF ", BigNumber.from(indexSupplyAfter).sub(BigNumber.from(indexSupplyBefore)));
        console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Should charge fees for index 1", async () => {
        await mockPriceOracle.setMockData(wbnbInstance.address, "9991338725841");
        await mockPriceOracle.setMockData(busdInstance.address, "99990059");
        await mockPriceOracle.setMockData(dogeInstance.address, "67419341");
        await mockPriceOracle.setMockData("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", "31361000000");

        const indexSupplyBefore = await indexSwap.totalSupply();
        const assetManagerBalanceBefore = await indexSwap.balanceOf(assetManagerTreasury.address);
        const velvetBalanceBefore = await indexSwap.balanceOf(treasury.address);

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
        let performanceFeeMinted = 0;

        let result = await receipt.events?.filter((x) => {
          return x.event == "FeesToBeMinted";
        });

        let performanceResult = await receipt.events?.filter((x) => {
          return x.event == "PerformanceFeeCalculated";
        });

        if (result && result[0].args) {
          protocolFeeMinted = Number(result[0].args["protocolFee"]);
          managementFeeMinted = Number(result[0].args["managerFee"]);
        }

        if (performanceResult && performanceResult[0].args) {
          performanceFeeMinted = Number(performanceResult[0].args["performanceFee"]);
        }

        if (protocolFeeMinted != 0 && managementFeeMinted != 0) {
          let procotolFeePercentage = (protocolFeeMinted / (protocolFeeMinted + managementFeeMinted)) * 100;
          let managementFeePercentage = (managementFeeMinted / (protocolFeeMinted + managementFeeMinted)) * 100;

          // should be 75%/25% but sometimes it's around 24.999
          expect(procotolFeePercentage).to.be.greaterThan(24);
          expect(managementFeePercentage).to.be.lessThan(76);
          expect(managementFeePercentage).to.be.greaterThan(0);
          expect(performanceFeeMinted).to.be.greaterThan(0);
        }
      });

      it("Should charge fees for index 1", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        const assetManagerBalanceBefore = await indexSwap.balanceOf(assetManagerTreasury.address);
        const velvetBalanceBefore = await indexSwap.balanceOf(treasury.address);

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
        let performanceFeeMinted = 0;

        let result = await receipt.events?.filter((x) => {
          return x.event == "FeesToBeMinted";
        });

        let performanceResult = await receipt.events?.filter((x) => {
          return x.event == "PerformanceFeeCalculated";
        });

        if (result && result[0].args) {
          protocolFeeMinted = Number(result[0].args["protocolFee"]);
          managementFeeMinted = Number(result[0].args["managerFee"]);
        }

        if (performanceResult && performanceResult[0].args) {
          performanceFeeMinted = Number(performanceResult[0].args["performanceFee"]);
        }

        if (protocolFeeMinted != 0 && managementFeeMinted != 0) {
          let procotolFeePercentage = (protocolFeeMinted / (protocolFeeMinted + managementFeeMinted)) * 100;
          let managementFeePercentage = (managementFeeMinted / (protocolFeeMinted + managementFeeMinted)) * 100;

          // should be 75%/25% but sometimes it's around 24.999
          expect(procotolFeePercentage).to.be.greaterThan(0);
          expect(managementFeePercentage).to.be.greaterThan(0);
          expect(performanceFeeMinted).to.be.equal(0);
        }
      });
    });
  });
});
