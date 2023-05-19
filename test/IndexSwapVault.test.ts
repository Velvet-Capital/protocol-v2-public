import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";
import {
  tokenAddresses,
  IAddresses,
  RebalancingDeploy,
  indexSwapLibrary,
  accessController,
  baseHandler,
  venusHandler,
  wombatHandler,
  beefyLPHandler,
  alpacaHandler,
  biSwapLPHandler,
  apeSwapLendingHandler,
  rebalanceLibrary,
} from "./Deployments.test";

import {
  AssetManagerConfig,
  Exchange,
  IndexSwap,
  PancakeSwapHandler,
  PancakeSwapLPHandler,
  PriceOracle,
  RebalanceLibrary,
  Rebalancing,
  SlippageControl,
  TokenRegistry,
  Vault,
  VelvetSafeModule,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";

import Safe, { SafeFactory, SafeAccountConfig, ContractNetworksConfig } from "@gnosis.pm/safe-core-sdk";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import { SafeTransactionDataPartial, GnosisSafeContract, SafeVersion } from "@gnosis.pm/safe-core-sdk-types";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for MixedIndex", () => {
  let iaddress: IAddresses;
  let accounts;
  let newSafeAddress: string;
  let velvetSafeModule: VelvetSafeModule;
  let tokenRegistry: TokenRegistry;
  let assetManagerConfig: AssetManagerConfig;
  let exchange: Exchange;
  let priceOracle: PriceOracle;
  let indexSwap: IndexSwap;
  let rebalancing: Rebalancing;
  let swapHandler: PancakeSwapHandler;
  let lpHandler: PancakeSwapLPHandler;
  let slippageController: SlippageControl;
  let txObject;
  let owner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let treasury: SignerWithAddress;
  let addrs: SignerWithAddress[];
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  let zeroAddress = "0x0000000000000000000000000000000000000000";
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for MixedIndex with Vault safe", () => {
    before(async () => {
      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      priceOracle = await PriceOracle.deploy();
      await priceOracle.deployed();

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();

      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, addr1, addr2, treasury, ...addrs] = accounts;

      iaddress = await tokenAddresses(priceOracle, true);

      const ZeroExHandler = await ethers.getContractFactory("ZeroExHandler");
      const zeroExHandler = await ZeroExHandler.deploy();
      await zeroExHandler.deployed();

      zeroExHandler.init(iaddress.wbnbAddress, "0xdef1c0ded9bec7f1a1670819833240f027b25eff");

      const IndexOperations = await ethers.getContractFactory("IndexOperations", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const indexOperations = await IndexOperations.deploy();
      await indexOperations.deployed();

      await tokenRegistry.initialize(
        "100",
        "1000",
        "1000",
        "10000000000000000",
        "500000000000000000000",
        treasury.address,
        addresses.WETH_Address,
        indexOperations.address,
        "1",
      );

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      exchange = await Exchange.deploy();
      await exchange.deployed();

      const PancakeSwapHandler = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      const LpHandler = await ethers.getContractFactory("PancakeSwapLPHandler");
      lpHandler = await LpHandler.connect(owner).deploy();
      await lpHandler.deployed();
      lpHandler.addOrUpdateProtocolSlippage("700");

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
          addresses.Cake_BUSDLP_Address,
          addresses.Cake_WBNBLP_Address,
          addresses.MAIN_LP_BUSD,
          addresses.mooBTCBUSDLP,
          addresses.MAIN_LP_DAI,
          addresses.oBNB,
          addresses.BSwap_WBNB_BUSDLP_Address,
          addresses.mooBTCBUSDLP,
          addresses.ibBNB_Address,
          addresses.ibBNB_Address,
          addresses.vBNB_Address,
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
          lpHandler.address,
          lpHandler.address,
          wombatHandler.address,
          beefyLPHandler.address,
          wombatHandler.address,
          apeSwapLendingHandler.address,
          biSwapLPHandler.address,
          beefyLPHandler.address,
          alpacaHandler.address,
          alpacaHandler.address,
          venusHandler.address,
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
          [addresses.cake_RewardToken],
          [addresses.cake_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.base_RewardToken],
          [addresses.apeSwap_RewardToken],
          [addresses.wombat_RewardToken],
          [addresses.apeSwap_RewardToken],
          [addresses.biswap_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.base_RewardToken],
          [addresses.venus_RewardToken],
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
      registry.wait();
      tokenRegistry.enableSwapHandlers([swapHandler.address]);
      await tokenRegistry.enablePermittedTokens(
        [iaddress.wbnbAddress, iaddress.busdAddress, iaddress.ethAddress, iaddress.daiAddress],
        [priceOracle.address, priceOracle.address, priceOracle.address, priceOracle.address],
      );

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
        addresses.qBNB,
        addresses.qETH,
        addresses.qUSX,
        addresses.qFIL,
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
        addresses.MAIN_LP_DAI,
        addresses.MAIN_LP_BUSD,
        addresses.mooBTCBUSDLP,
      ];

      const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
      assetManagerConfig = await AssetManagerConfig.deploy();
      await assetManagerConfig.deployed();

      await assetManagerConfig.init({
        _managementFee: "100",
        _performanceFee: "10",
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
      console.log("VelvetSafeModule deployed to: ", velvetSafeModule.address);

      const ethAdapter = new EthersAdapter({
        ethers,
        signer: owner,
      });

      const id = await ethAdapter.getChainId();
      const contractNetworks: ContractNetworksConfig = {
        [id]: {
          multiSendAddress: addresses.MULTI_SEND_ADDRESS,
          safeMasterCopyAddress: addresses.SAFE_MASTER_COPY_ADDRESS,
          safeProxyFactoryAddress: addresses.SAFE_PROXY_FACTORY_ADDRESS,
        },
      };

      const safeFactory = await SafeFactory.create({
        ethAdapter,
        contractNetworks,
        isL1SafeMasterCopy: true,
      });

      const owners = [owner.address];
      const threshold = 1;
      const safeAccountConfig: SafeAccountConfig = {
        owners,
        threshold,
      };

      const safeSdk: Safe = await safeFactory.deploySafe({ safeAccountConfig });
      newSafeAddress = safeSdk.getAddress();
      let safeAddress = newSafeAddress;
      console.log("Gnosis Safe deployed to: ", newSafeAddress);

      let ABI = ["function enableModule(address module)"];
      let abiEncode = new ethers.utils.Interface(ABI);
      let txData = abiEncode.encodeFunctionData("enableModule", [velvetSafeModule.address]);

      const transaction: SafeTransactionDataPartial = {
        to: newSafeAddress,
        value: "0",
        data: txData,
        operation: 0,
        safeTxGas: 0,
        baseGas: 0,
        gasPrice: 0,
        gasToken: "0x0000000000000000000000000000000000000000",
        refundReceiver: "0x0000000000000000000000000000000000000000",
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      const txHash = await safeSdk.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      const executeTxResponse = await safeSdk.executeTransaction(safeTransaction);
      await executeTxResponse.transactionResponse?.wait();

      await exchange.init(accessController.address, velvetSafeModule.address, priceOracle.address, tokenRegistry.address);
      const abiEncoder = ethers.utils.defaultAbiCoder;
      await velvetSafeModule.setUp(abiEncoder.encode(["address","address","address"],[newSafeAddress,exchange.address,addresses.gnosisMultisendLibrary]));

      const IndexSwap = await ethers.getContractFactory("IndexSwap", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });

      indexSwap = await IndexSwap.deploy();
      await indexSwap.deployed();
      indexSwap.init({
        _name: "INDEXLY",
        _symbol: "IDX",
        _vault: newSafeAddress,
        _module: newSafeAddress,
        _oracle: priceOracle.address,
        _accessController: accessController.address,
        _tokenRegistry: tokenRegistry.address,
        _exchange: exchange.address,
        _iAssetManagerConfig: assetManagerConfig.address,
        _feeModule: feeModule.address,
      });

      feeModule.init(indexSwap.address, assetManagerConfig.address, tokenRegistry.address, accessController.address);

      rebalancing = await RebalancingDeploy(
        indexSwap.address,
        indexSwapLibrary.address,
        tokenRegistry.address,
        exchange.address,
        accessController,
        owner.address,
        priceOracle,
        assetManagerConfig,
        feeModule,
        indexOperations.address,
      );
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
            [addresses.qFIL, addresses.BSwap_WBNB_BUSDLP_Address, addresses.mooBTCBUSDLP],
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
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        await indexSwap.initToken(
          [iaddress.busdAddress, addresses.BSwap_WBNB_BUSDLP_Address, addresses.mooBTCBUSDLP],
          [5000, 2500, 2500],
        );
      });

      it("should confirm that the correct tokens are initialised", async () => {
        expect(await indexSwap.getTokens()).to.deep.equal([
          iaddress.busdAddress,
          addresses.BSwap_WBNB_BUSDLP_Address,
          addresses.mooBTCBUSDLP,
        ]);
      });

      it("should confirm that the correct tokens are initialised", async () => {
        await expect(
          lpHandler.connect(owner).pidMap([addresses.Cake_BUSDLP_Address], [39, 0]),
        ).to.be.revertedWithCustomError(lpHandler, "InvalidLength");
      });

      it("should add pid", async () => {
        await lpHandler.connect(owner).pidMap([addresses.Cake_BUSDLP_Address], [39]);
      });

      it("should delete pid", async () => {
        await lpHandler.connect(owner).pidMap([addresses.Cake_WBNBLP_Address], [0]);

        await expect(lpHandler.connect(owner).removePidMap([addresses.Cake_WBNBLP_Address], [0]));
      });

      it("should check if a token is enabled or not in the registry", async () => {
        await expect(tokenRegistry.isEnabled(addresses.oBNB));
      });

      it("should disable a token in the registry", async () => {
        await expect(tokenRegistry.disableToken(addresses.vDAI_Address));
      });

      it("should reiterate the WETH address of the token registry", async () => {
        await expect(tokenRegistry.updateWETH(addresses.WETH_Address));
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
        await expect(tokenRegistry.disablePermittedTokens([])).to.be.revertedWithCustomError(
          tokenRegistry,
          "InvalidLength",
        );
      });

      it("should disable a permitted token in TokenRegistry", async () => {
        await expect(tokenRegistry.disablePermittedTokens([iaddress.linkAddress]));
      });

      it("isPermitted function from TokenRegistry should not return output for zero address", async () => {
        await expect(tokenRegistry.isPermitted(zeroAddress)).to.be.revertedWithCustomError(
          tokenRegistry,
          "InvalidTokenAddress",
        );
      });

      it("should update an enabled token's data in the TokenRegistry", async () => {
        let tokenInfo1 = await tokenRegistry.getTokenInformation(addresses.Cake_WBNBLP_Address);
        let oldHandlerAddress = tokenInfo1.handler;

        const LpHandler2 = await ethers.getContractFactory("PancakeSwapLPHandler");
        const lpHandler2 = await LpHandler2.connect(owner).deploy();
        await lpHandler2.deployed();
        lpHandler2.addOrUpdateProtocolSlippage("700");

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

      it("asset manager should not be able to add token which is not approved in registry", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);
        await expect(assetManagerConfig.setPermittedTokens([iaddress.btcAddress])).to.be.revertedWithCustomError(
          assetManagerConfig,
          "TokenNotPermitted",
        );
      });

      it("asset manager should not be able to delete a zero address as permitted token", async () => {
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

      it("isTokenPermitted should not return output for asset manager config", async () => {
        const config = await indexSwap.iAssetManagerConfig();
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig = AssetManagerConfig.attach(config);

        await expect(assetManagerConfig.isTokenPermitted(zeroAddress)).to.be.revertedWithCustomError(
          assetManagerConfig,
          "InvalidTokenAddress",
        );
      });

      it("Invest 0.01 BNB should not revert, if investing token is not initialized", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200", "200"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
            _tokenAmount: "10000000000000000",
            _swapHandler: swapHandler.address,
            _token: iaddress.wbnbAddress,
          },
          {
            value: "10000000000000000",
          },
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 10BUSD should not revert, if investing token is not initialized", async () => {
        await expect(
          indexSwap.investInFund({
            _slippage: ["200", "200", "200"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
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

      it("Invest 1BNB into Top10 fund", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );
        const indexSupplyBefore = await indexSwap.totalSupply();
        await indexSwap.investInFund(
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
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 10BUSD into Top10 fund", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
        const busdtoken = ERC20.attach(iaddress.busdAddress);
        const ethtoken = ERC20.attach(iaddress.ethAddress);
        const btctoken = ERC20.attach(iaddress.btcAddress);
        const wbnbtoken = ERC20.attach(iaddress.wbnbAddress);
        const swapResult = await exchange.connect(owner)._swapETHToToken(
          {
            _token: iaddress.busdAddress,
            _to: owner.address,
            _slippage: "200",
            _lpSlippage: "200",
            _swapHandler: swapHandler.address,
          },
          {
            value: "10000000000000000000",
          },
        );
        await busdtoken.approve(indexSwap.address, "10000000000000000000");
        const indexSupplyBefore = await indexSwap.totalSupply();
        // console.log("10busd before", indexSupplyBefore);
        await indexSwap.investInFund({
          _slippage: ["300", "300", "300"],
          _lpSlippage: ["200", "200", "200"],
          _to: nonOwner.address,
          _tokenAmount: "10000000000000000000",
          _swapHandler: swapHandler.address,
          _token: iaddress.busdAddress,
        });
        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log("10BUSD After", indexSupplyAfter);

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
              _to: owner.address,
              _tokenAmount: "10000000000000",
              _swapHandler: swapHandler.address,
              _token: iaddress.wbnbAddress,
            },
            {
              value: "10000000000000",
            },
          ),
        )
          .to.be.revertedWithCustomError(indexSwapLibrary, "WrongInvestmentAmount")
          .withArgs("10000000000000000", "500000000000000000000");

        const indexSupplyAfter = await indexSwap.totalSupply();
        // console.log(indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
      });

      it("Invest 2BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.2bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200", "200"],
            _lpSlippage: ["200", "200", "200"],
            _to: owner.address,
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

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
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
        );
        const indexSupplyAfter = await indexSwap.totalSupply();
        //console.log("1bnb after", indexSupplyAfter);

        expect(Number(indexSupplyAfter)).to.be.greaterThanOrEqual(Number(indexSupplyBefore));
        // console.log(indexSupplyAfter);

        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );
        const vETHBalanceAfter = await VBep20Interface.balanceOf(newSafeAddress);
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

      it("should be able to claim tokens for portfolio tokens ", async () => {
        const _exchange = await indexSwap.claimTokens([
          addresses.BSwap_WBNB_BUSDLP_Address,
          addresses.vETH_Address,
          addresses.oBNB,
          addresses.mooBTCBUSDLP,
        ]);
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

      it("should Update Weights and Rebalance", async () => {
        const VBep20Interface = await ethers.getContractAt(
          "VBep20Interface",
          "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
        );

        await tokenRegistry.enableSwapHandlers([swapHandler.address]);

        await rebalancing.updateWeights(
          [4667, 3333, 2000],
          ["200", "200", "200"],
          ["200", "200", "200"],
          swapHandler.address,
        );

        const vETHBalance = await VBep20Interface.balanceOf(newSafeAddress);
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
            tokens: [addresses.ibBNB_Address, addresses.vBTC_Address, addresses.vBNB_Address],
            _swapHandler: swapHandler.address,
            denorms: [2000, 6000, 1000],
            _slippageSell: ["200", "200", "200"],
            _slippageBuy: ["200", "200", "200"],
            _lpSlippageSell: ["200", "200", "200"],
            _lpSlippageBuy: ["200", "200", "200"],
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
            tokens: [addresses.ibBNB_Address, addresses.vBTC_Address, addresses.vBNB_Address],
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
            tokens: [addresses.ibBNB_Address, addresses.vBTC_Address, addresses.vBNB_Address],
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
            tokens: [addresses.qFIL, addresses.vBTC_Address, addresses.vBNB_Address],
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

      it("should get token balance from the rebalance contract", async () => {
        await expect(rebalancing.getTokenBalance(addresses.vBTC_Address));
      });

      it("new asset manager should update tokens", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        let beforeTokenXBalance;
        let beforeVaultValue;
        await tokenRegistry.enableSwapHandlers([swapHandler.address]);

        await rebalancing.connect(nonOwner).updateTokens({
          tokens: [addresses.ibBNB_Address, addresses.vBTC_Address, addresses.vBNB_Address],
          _swapHandler: swapHandler.address,
          denorms: [2000, 6000, 2000],
          _slippageSell: ["200", "200", "200"],
          _slippageBuy: ["200", "200", "200"],
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
          "TenMinutesPassOrRebalancingHasToBeCalled",
        );
      });

      it("should unpause", async () => {
        await ethers.provider.send("evm_increaseTime", [600]);
        await rebalancing.connect(addr1).setPause(false);
      });

      it("when withdraw fund more then balance", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const updateAmount = parseInt(amountIndexToken.toString()) + 1;
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
        ).to.be.revertedWithCustomError(indexSwap, "InvalidSlippageLength");
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
          .withArgs("10000000000000000");
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
          .withArgs("10000000000000000");
      });

      it("should withdraw fund and burn index token successfully", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        //console.log(amountIndexToken, "amountIndexToken");
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["200", "200", "300"],
          _lpSlippage: ["200", "200", "200"],
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
        const busdtoken = ERC20.attach(iaddress.busdAddress);
        const balanceBefore = await busdtoken.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB
        console.log("balanceBefore", balanceBefore);
        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["500", "900", "500"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.busdAddress,
        });

        const balanceAfter = await busdtoken.balanceOf(owner.address);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));

        expect(txObject.confirmations).to.equal(1);
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

      // it("should claims tokens to reward vault", async () => {
      //   await ethers.provider.send("evm_increaseTime", [31556926]);
      //   const ERC20 = await ethers.getContractFactory("ERC20Upgradeable");
      //   const tokens = [
      //     addresses.oBNB,
      //     addresses.BSwap_WBNB_BUSDLP_Address,
      //     addresses.mooBTCBUSDLP,
      //     addresses.ibBNB_Address,
      //     addresses.vBTC_Address,
      //     addresses.vBNB_Address,
      //     addresses.MAIN_LP_BUSD,
      //     addresses.Cake_BUSDLP_Address,
      //     iaddress.busdAddress,
      //     iaddress.btcAddress,
      //     addresses.vETH_Address,
      //   ];
      //   for (let i = 0; i < tokens.length; i++) {
      //     let rewardTokens = (await tokenRegistry.getTokenInformation(tokens[i])).rewardTokens;
      //     for (let j = 0; j < rewardTokens.length; j++) {
      //       if (rewardTokens[j] != zeroAddress) {
      //         console.log("rewardTokens",rewardTokens[j]);
      //         let balanceBefore = await ERC20.attach(rewardTokens[j]).balanceOf(rewardVault.address);
      //         let vaultBefore =  await ERC20.attach(rewardTokens[j]).balanceOf(newSafeAddress);
      //         console.log("balanceBefore", balanceBefore);
      //         console.log("vaultBefore", vaultBefore);
      //       }
      //     }
      //   }
      //   await indexSwap.claimTokens(tokens);
      //   console.log("---------------AFTER CLAIMING---------------");
      //   for (let i = 0; i < tokens.length; i++) {
      //     let rewardTokens = (await tokenRegistry.getTokenInformation(tokens[i])).rewardTokens;
      //     for (let j = 0; j < rewardTokens.length; j++) {
      //       if (rewardTokens[j] != zeroAddress) {
      //         console.log("rewardTokens",rewardTokens[j]);
      //         let balanceAfter = await ERC20.attach(rewardTokens[j]).balanceOf(rewardVault.address);
      //         let vaultAfter =  await ERC20.attach(rewardTokens[j]).balanceOf(newSafeAddress);
      //         console.log("balanceAfter", balanceAfter);
      //         console.log("vaultAfter", vaultAfter);
      //       }
      //     }
      //   }
      // });
    });
  });
});
