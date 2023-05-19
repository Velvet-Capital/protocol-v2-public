/* 
This is a generic test file that checks the working of multiple mixed portfolios having tokens from the following protocols:
  - Venus
  - Alpaca
  - Liqee
  - PancakeSwap Liquidity Provider
  - BiSwap Liquidity Provider
  - ApeSwap (lending, LP)

All the config for the test is referred from the 'config/generic.json' file of this repository.

To create more test portfolios for similar handlers, one would only need to add the correct addresses and data points to the 'config/generic.json' file.

Also, while populating the 'config/generic.json' file for a new portfolio, the index (positioning) of tokens having underlying bnb or non-bnb has to be taken care of. (0 --> BNB, 1 --> non-BNB)
*/

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
} from "./Deployments.test";

import {
  IndexSwap,
  IERC20Upgradeable__factory,
  Exchange,
  Rebalancing,
  Vault,
  PriceOracle,
  AssetManagerConfig,
  PancakeSwapHandler,
  TokenRegistry,
  VelvetSafeModule,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";
import { arrayBuffer } from "stream/consumers";

import Safe, { SafeFactory, SafeAccountConfig, ContractNetworksConfig } from "@gnosis.pm/safe-core-sdk";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import { SafeTransactionDataPartial, GnosisSafeContract, SafeVersion } from "@gnosis.pm/safe-core-sdk-types";


var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

const ps = require("prompt-sync");
const userInput = ps();

let genericJson = require("../config/generic.json");

describe.only("Tests for Handler", () => {
  let iaddress: IAddresses;
  let accounts;
  let priceOracle: PriceOracle;
  let indexSwap: IndexSwap;
  let exchange: Exchange;
  let rebalancing: Rebalancing;
  let velvetSafeModule: VelvetSafeModule;
  let tokenRegistry: TokenRegistry;
  let swapHandler: PancakeSwapHandler;
  let assetManagerConfig: AssetManagerConfig;
  let txObject;
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  let owner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let treasury: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  let handlerVariable = new Array();
  let handlerIteration = new Array();
  let handlerMap = new Map();
  let tokenInstanceVariable = new Array();
  let rebalanceInstanceVariable = new Array();
  let tokenIteration = new Array();
  let rewardTokenIteration = new Array();

  let newSafeAddress:any;

  // console.log(
  //   "\n<----------------------------------------------------------------------->"
  // );
  // console.log(
  //   " Portfolio-1 (1 Venus token, 2 Alpaca tokens) \n Portfolio-2 (2 Venus tokens, 1 Alpaca token \n Portfolio-3 (1 Venus token, 2 Liqee tokens) \n Portfolio-4 (2 Venus tokens, 1 Liqee token) \n Portfolio-5 (2 Alpaca tokens, 1 Liqee token) \n Portfolio-6 (1 Alpaca token, 2 Liqee tokens)  \n Portfolio-7 (3 BiSwapLP tokens) \n Portfolio-8 (2 BiSwapLP tokens, 1 Venus token) \n Portfolio-9 (3 ApeSwap-Ola tokens) \n Portfolio-10 (1 ApeSwap-Ola token, 1 Alpaca token, 1 Liqee token) \n Portfolio-11 (2 Beefy tokens, 1 Liqee token)"
  // );
  // console.log(
  //   "<----------------------------------------------------------------------->\n"
  // );
  // let numInput = userInput(
  //   "Enter the number for the corresponding portfolio: "
  // );

  // By default, the tests are running for the 11th portfolio. For custom testing, changes should be made accordingly.
  let numInput = 11;

  console.log("Tests running for:", genericJson[numInput - 1].portfolioName);

  const tokenObject = genericJson[numInput - 1].tokens;
  const rebalanceObject = genericJson[numInput - 1].rebalancing;

  describe("Tests for ExchangeHandler contract", () => {
    before(async () => {
      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      priceOracle = await PriceOracle.deploy();
      await priceOracle.deployed();

      const ZeroExHandler = await ethers.getContractFactory("ZeroExHandler");
      const zeroExHandler = await ZeroExHandler.deploy();
      await zeroExHandler.deployed();

      iaddress = await tokenAddresses(priceOracle, false);

      zeroExHandler.init(iaddress.wbnbAddress, "0xdef1c0ded9bec7f1a1670819833240f027b25eff");

      const IndexOperations = await ethers.getContractFactory("IndexOperations", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const indexOperations = await IndexOperations.deploy();
      await indexOperations.deployed();

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();

      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, addr1, addr2, treasury, ...addrs] = accounts;

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

      const PancakeSwapHandler = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      // Collection of all tokens from the portfolio
      for (let i = 0; i < tokenObject.length; i++) {
        tokenIteration.push(tokenObject[i].tokenAddress);
      }
      for (let i = 0; i < rebalanceObject.length; i++) {
        tokenIteration.push(rebalanceObject[i].tokenAddress);
      }

      // reward tokens
      for (let i = 0; i < tokenObject.length; i++) {
        rewardTokenIteration.push(tokenObject[i].rewardTokens);
      }
      for (let i = 0; i < rebalanceObject.length; i++) {
        rewardTokenIteration.push(rebalanceObject[i].rewardTokens);
      }

      // // Handler array creation
      for (let i = 0; i < tokenObject.length; i++) {
        handlerIteration.push(tokenObject[i].handler);
      }
      for (let i = 0; i < rebalanceObject.length; i++) {
        handlerIteration.push(rebalanceObject[i].handler);
      }

      for (let i = 0; i < handlerIteration.length; i++) {
        handlerMap.set(handlerIteration[i], "0x");
      }

      for (let i = 0; i < handlerIteration.length; i++) {
        const HandlerName = handlerIteration[i];
        const deployHandler = await ethers.getContractFactory(HandlerName);
        const instance = await deployHandler.deploy();
        await instance.deployed();
        if (handlerMap.get(HandlerName) == "0x") {
          handlerMap.set(HandlerName, instance.address);
        }
      }
      for (let i = 0; i < handlerIteration.length; i++) {
        handlerVariable.push(handlerMap.get(handlerIteration[i]));
      }

      // Get token instances for the underlying portfolio tokens
      for (let i = 0; i < tokenObject.length; i++) {
        if (tokenObject[i].underlyingInstances.address != "") {
          tokenInstanceVariable.push(
            new ethers.Contract(
              tokenObject[i].underlyingInstances.address,
              IERC20Upgradeable__factory.abi,
              ethers.getDefaultProvider(),
            ),
          );
        }
      }
      for (let i = 0; i < rebalanceObject.length; i++) {
        if (rebalanceObject[i].underlyingInstances.address != "") {
          rebalanceInstanceVariable.push(
            new ethers.Contract(
              rebalanceObject[i].underlyingInstances.address,
              IERC20Upgradeable__factory.abi,
              ethers.getDefaultProvider(),
            ),
          );
        }
      }

      // Add token instance feed to the price oracle
      const ConstantOracleAddresses = genericJson[numInput - 1].constantAddresses;
      let aggregatorCheck = new Map();

      for (let i = 0; i < tokenObject.length; i++) {
        if (tokenObject[i].underlyingInstances.address != "") {
          if (!aggregatorCheck.has(tokenInstanceVariable[i].address)) {
            await priceOracle._addFeed(
              [tokenInstanceVariable[i].address],
              [genericJson[numInput - 1].quote],
              [tokenObject[i].underlyingInstances.priceOracle],
            );
            aggregatorCheck.set(tokenInstanceVariable[i].address, "0x");
          }
        }
      }

      for (let i = 0; i < rebalanceObject.length; i++) {
        if (rebalanceObject[i].underlyingInstances.address != "") {
          if (!aggregatorCheck.has(rebalanceInstanceVariable[i].address)) {
            await priceOracle._addFeed(
              [rebalanceInstanceVariable[i].address],
              [genericJson[numInput - 1].quote],
              [rebalanceObject[i].underlyingInstances.priceOracle],
            );
            aggregatorCheck.set(rebalanceInstanceVariable[i].address, "0x");
          }
        }
      }

      for (let i = 0; i < ConstantOracleAddresses.length; i++) {
        await priceOracle._addFeed(
          [ConstantOracleAddresses[i].address],
          [genericJson[numInput - 1].quote],
          [ConstantOracleAddresses[i].priceOracle],
        );
      }

      // Enable the tokens in the registry
      var priceOracles = [];
      var tokens = [];
      var handlers = [];
      var bools = [];
      var rewardTokens = [];

      for (let i = 0; i < tokenIteration.length; i++) {
        priceOracles.push(priceOracle.address);
        tokens.push(tokenIteration[i]);
        handlers.push(handlerVariable[i]);
        bools.push(false);
        rewardTokens.push(rewardTokenIteration[i]);
      }
      await tokenRegistry.enableToken(priceOracles, tokens, handlers, rewardTokens, bools);
      tokenRegistry.enableSwapHandlers([swapHandler.address]);

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
        _whitelistedTokens: [],
        _publicPortfolio: true,
        _transferable: true,
        _transferableToPublic: true,
        _whitelistTokens: false,
      });

      const IndexSwap = await ethers.getContractFactory("IndexSwap", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
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

      indexSwap = await IndexSwap.deploy();
      await indexSwap.deployed();
      indexSwap.init({
        _name: genericJson[numInput - 1].indexName,
        _symbol: genericJson[numInput - 1].indexSymbol,
        _vault: newSafeAddress,
        _module: velvetSafeModule.address,
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

    describe("IndexSwap Contract", function () {
      it("should check Index token name and symbol", async () => {
        expect(await indexSwap.name()).to.eq("INDEXLY");
        expect(await indexSwap.symbol()).to.eq("IDX");
      });

      it("initialize should revert if total weights not equal 10,000", async () => {
        let tokens = [];
        for (let i = 0; i < tokenObject.length; i++) {
          tokens.push(tokenObject[i].tokenAddress);
        }
        const weights = [100, 1000];
        await expect(indexSwap.initToken(tokens, weights))
          .to.be.revertedWithCustomError(indexSwap, "InvalidWeights")
          .withArgs("10000");
      });

      it("Initialize IndexFund Tokens", async () => {
        let tokens = [];
        let weights = [];
        for (let i = 0; i < tokenObject.length; i++) {
          tokens.push(tokenObject[i].tokenAddress);
          weights.push(tokenObject[i].weight);
        }
        await indexSwap.initToken(tokens, weights);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        const VBep20Interface = await ethers.getContractAt("VBep20Interface", addresses.vETH_Address);
        const vETHBalanceBefore = await VBep20Interface.balanceOf(newSafeAddress);

        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.1bnb before", indexSupplyBefore);

        await indexSwap.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
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

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
      });

      it("Invest 0.00001 BNB into Top10 fund should fail", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.2bnb before", indexSupplyBefore);
        await expect(
          indexSwap.investInFund(
            {
              _slippage: ["200", "200"],
              _lpSlippage: ["200", "200"],
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
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
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

      it("should return true if token is bnb", async () => {
        expect(await exchange.isWETH(tokenObject[0].tokenAddress, handlerVariable[0])).to.be.true;
      });

      it("should return false if token is not bnb", async () => {
        expect(await exchange.isWETH(tokenObject[1].tokenAddress, handlerVariable[1])).to.be.false;
      });

      it("Invest 1BNB into Top10 fund", async () => {
        const indexSupplyBefore = await indexSwap.totalSupply();
        //console.log("0.1bnb before", indexSupplyBefore);
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200"],
            _lpSlippage: ["200", "200"],
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

        expect(Number(indexSupplyAfter)).to.be.greaterThan(Number(indexSupplyBefore));
        // console.log(indexSupplyAfter);

        const VBep20Interface = await ethers.getContractAt("VBep20Interface", addresses.vETH_Address);
        const vETHBalanceAfter = await VBep20Interface.balanceOf(newSafeAddress);
      });

      it("should be able to claim tokens for portfolio tokens ", async () => {
        let tokens = [];
        for (let i = 0; i < tokenObject.length; i++) {
          tokens.push(tokenObject[i].tokenAddress);
        }
        const _exchange = await indexSwap.claimTokens(tokens);
      });

      it("non owner should not be able to pull from vault", async () => {
        await expect(
          exchange
            .connect(nonOwner)
            ._pullFromVault(tokenObject[1].tokenAddress, "10000", nonOwner.address),
        ).to.be.revertedWithCustomError(exchange, "CallerNotIndexManager");
      });

      it("should pull from vault", async () => {
        const token = await ethers.getContractAt("VBep20Interface", tokenObject[0].tokenAddress);
        const balanceBefore = await token.balanceOf(nonOwner.address);
        // console.log(balanceBefore);
        await exchange
          .connect(owner)
          ._pullFromVault(tokenObject[0].tokenAddress, "10000", nonOwner.address);

        const balanceAfter = await token.balanceOf(nonOwner.address);
        // console.log(balance);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
      });

      it("non owner should not be able to swap eth to protocol token", async () => {
        await expect(
          exchange.connect(nonOwner)._swapETHToToken(
            {
              _token: tokenObject[1].tokenAddress,
              _to: addr1.address,
              _slippage: "100",
              _lpSlippage: "200",
              _swapHandler: swapHandler.address,
            },
            {
              value: "100000",
            },
          ),
        ).to.be.revertedWithCustomError(exchange, "CallerNotIndexManager");
      });

      it("should be able to swap eth to protocol token and send it to user", async () => {
        const token = await ethers.getContractAt("VBep20Interface", tokenObject[1].tokenAddress);
        const balanceBefore = await token.balanceOf(addr1.address);
        // console.log(balanceBefore);
        const swapResult = await exchange.connect(owner)._swapETHToToken(
          {
            _token: tokenObject[1].tokenAddress,
            _to: addr1.address,
            _slippage: "200",
            _lpSlippage: "200",
            _swapHandler: swapHandler.address,
          },
          {
            value: "1000000000000000",
          },
        );
        const balanceAfter = await token.balanceOf(addr1.address);
        // console.log(balance);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
      });

      it("non owner should not be able to swap protocol token to eth", async () => {
        await expect(
          exchange.connect(nonOwner)._swapTokenToETH({
            _token: tokenObject[1].tokenAddress,
            _swapAmount: "1000000000",
            _to: addr1.address,
            _slippage: "100",
            _lpSlippage: "200",
            _swapHandler: swapHandler.address,
          }),
        ).to.be.revertedWithCustomError(exchange, "CallerNotIndexManager");
      });

      it("should be able to swap eth to protocol token and send it to vault", async () => {
        const token = await ethers.getContractAt("VBep20Interface", tokenObject[1].tokenAddress);
        const balanceBefore = await token.balanceOf(newSafeAddress);
        // console.log(balanceBefore);
        const swapResult = await exchange.connect(owner)._swapETHToToken(
          {
            _token: tokenObject[1].tokenAddress,
            _to: newSafeAddress,
            _slippage: "200",
            _lpSlippage: "200",
            _swapHandler: swapHandler.address,
          },
          {
            value: "10000000000000000",
          },
        );
        const balanceAfter = await token.balanceOf(newSafeAddress);
        // console.log(balance);
        expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
      });

      it("should be able to swap token to eth", async () => {
        const token = await ethers.getContractAt("VBep20Interface", tokenObject[1].tokenAddress);
        const balanceBefore = await addr2.getBalance();
        // token.connect(owner).approve(.address, approve_amount);

        await exchange
          .connect(owner)

          ._pullFromVault(tokenObject[1].tokenAddress, "100000000", exchange.address);
        // console.log("handler balance", await token.balanceOf(exchange.address));

        const swapResult = await exchange.connect(owner)._swapTokenToETH({
          _token: tokenObject[1].tokenAddress,
          _swapAmount: "100000000",
          _to: addr2.address,
          _slippage: "200",
          _lpSlippage: "200",
          _swapHandler: swapHandler.address,
        });
        const balanceAfter = await addr2.getBalance();
        expect(Number(balanceAfter)).to.be.greaterThanOrEqual(Number(balanceBefore));
      });

      it("Investment should fail when contract is paused", async () => {
        await rebalancing.setPause(true);
        await expect(
          indexSwap.investInFund(
            {
              _slippage: ["200", "200"],
              _lpSlippage: ["200", "200"],
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
        await expect(rebalancing.updateWeights([6667, 3330], ["200", "200"], ["200", "200"], swapHandler.address))
          .to.be.revertedWithCustomError(rebalancing, "InvalidWeights")
          .withArgs("10000");
      });

      it("should Update Weights and Rebalance", async () => {
        const VBep20Interface = await ethers.getContractAt("VBep20Interface", addresses.vETH_Address);

        await rebalancing.updateWeights([6667, 3333], ["200", "200"], ["200", "200"], swapHandler.address);

        const vETHBalance = await VBep20Interface.balanceOf(newSafeAddress);
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([5000, 5000], ["200", "200"], ["200", "200"], swapHandler.address);
      });

      it("should Update Weights and Rebalance", async () => {
        await rebalancing.updateWeights([3333, 6667], ["200", "200"], ["200", "200"], swapHandler.address);
      });

      it("updateTokens should revert if total Weights not equal 10,000", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        await expect(
          rebalancing.updateTokens({
            tokens: tokenIteration,
            _swapHandler: swapHandler.address,
            denorms: [1000, 1000, 7000],
            _slippageSell: ["200", "200"],
            _slippageBuy: ["200", "200", "200"],
            _lpSlippageSell: ["200", "200"],
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

      it("new asset manager should update tokens", async () => {
        // current = BUSD:ETH = 1:2
        // target = ETH:DAI:WBNB = 1:3:1
        // let beforeTokenXBalance;
        // let beforeVaultValue;

        let rebalanceWeights = [];
        for (let i = 0; i < tokenObject.length; i++) {
          rebalanceWeights.push(tokenObject[i].rebalanceWeight);
        }
        for (let i = 0; i < rebalanceObject.length; i++) {
          rebalanceWeights.push(rebalanceObject[i].weight);
        }

        await rebalancing.connect(nonOwner).updateTokens({
          tokens: tokenIteration,
          _swapHandler: swapHandler.address,
          denorms: rebalanceWeights,
          _slippageSell: ["200", "200"],
          _slippageBuy: ["200", "200", "200"],
          _lpSlippageSell: ["200", "200"],
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
            _slippage: ["200", "200", "200"],
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
            _slippage: ["200", "200", "200"],
            _lpSlippage: ["200", "200", "200"],
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
            _slippage: ["200", "200", "200"],
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
            _slippage: ["200", "200", "200"],
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
          _slippage: ["200", "200", "200"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: false,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });
        expect(txObject.confirmations).to.equal(1);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200", "200"],
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
        // console.log(indexSupplyAfter);
      });

      it("Invest 0.1BNB into Top10 fund", async () => {
        await indexSwap.investInFund(
          {
            _slippage: ["200", "200", "200"],
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
        // console.log(indexSupplyAfter);
      });

      it("should withdraw tokens directly instead of BNB", async () => {
        const amountIndexToken = await indexSwap.balanceOf(owner.address);
        const AMOUNT = ethers.BigNumber.from(amountIndexToken); //1BNB

        txObject = await indexSwap.withdrawFund({
          tokenAmount: AMOUNT,
          _slippage: ["200", "200", "200"],
          _lpSlippage: ["200", "200", "200"],
          isMultiAsset: true,
          _swapHandler: swapHandler.address,
          _token: iaddress.wbnbAddress,
        });
      });
    });
  });
});
