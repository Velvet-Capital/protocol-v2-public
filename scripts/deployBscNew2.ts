import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import {
  IndexSwap,
  // IndexSwapV2,
  IndexSwap__factory,
  Exchange,
  // ExchangeV2,
  // TokenRegistryV2,
  Rebalancing__factory,
  AccessController,
  IndexFactory,
  // IndexFactoryV2,
  PancakeSwapHandler,
  VelvetSafeModule,
  PriceOracle,
  AssetManagerConfig,
  TokenRegistry,
  OneInchHandler,
} from "../typechain";

import {
  inputData,
  priceOracleInfo,
  tokenRegistryTokenInfo,
  tokenRegistryTokenInfo3April,
  tokenRegistryInfo3April2,
  alpacaTokens,
  apeswapLendingTokens,
  apeswapLPTokens,
  liqeeTokens,
  venusTokens,
  allTokenList,
  beefyTokens,
  allTokenListUnfiltered,
  permittedTokens,
  rewardTokens,
  pancakeLPTokens,
} from "../scripts/deploymentInputs";
const fs = require("fs");

const userInputData = inputData;
const priceOracleData = priceOracleInfo;

const deployedAddress: any = {};

async function deploy() {
  try {
    const [deployer, acc1, acc2, acc3, acc4, acc5] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Deployer Balance: ", await ethers.provider.getBalance(deployer.address));

    console.log(userInputData);

    console.log("---------------------- DEPLOYMENT STARTED---------------------");

    //Deploy IndexSwapLibrary
    const IndexSwapLibraryDefault = await ethers.getContractFactory("IndexSwapLibrary");
    const indexSwapLibrary = await IndexSwapLibraryDefault.deploy();
    await indexSwapLibrary.deployed();
    console.log("Deployed IndexSwapLibrary at: ", indexSwapLibrary.address);
    deployedAddress.IndexSwapLibrary = indexSwapLibrary.address;

    //     //Deploy FeeLibrary
    const FeeLibrary = await ethers.getContractFactory("FeeLibrary");
    const feeLibrary = await FeeLibrary.deploy();
    await feeLibrary.deployed();
    console.log("Deployed FeeLibrary at: ", feeLibrary.address);
    deployedAddress.FeeLibrary = feeLibrary.address;

    //     //Deploy RebalanceLibrary
    const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary", {
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });
    const rebalanceLibrary = await RebalanceLibrary.deploy();
    await rebalanceLibrary.deployed();
    console.log("Deployed RebalanceLibrary at: ", rebalanceLibrary.address);
    deployedAddress.RebalanceLibrary = feeLibrary.address;

    // ------------------------------------------------------------------------------------------------------------------------ //
    //     //Deploying Base Contracts

    const OffChainRebalance = await ethers.getContractFactory("OffChainRebalance", {
      //Deploy BaseOffChainRebalance
      libraries: {
        RebalanceLibrary: rebalanceLibrary.address,
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });
    const offChainRebalanceDefault = await OffChainRebalance.deploy();
    await offChainRebalanceDefault.deployed();
    console.log("Deployed BaseOffChainRebalance at: ", offChainRebalanceDefault.address);
    deployedAddress.BaseOffChainRebalance = offChainRebalanceDefault.address;

    const RebalanceAggregator = await ethers.getContractFactory("RebalanceAggregator", {
      //Deploy BaseRebalanceAggregator
      libraries: {
        RebalanceLibrary: rebalanceLibrary.address,
      },
    });
    const rebalanceAggregatorDefault = await RebalanceAggregator.deploy();
    await rebalanceAggregatorDefault.deployed();
    console.log("Deployed BaseRebalanceAggregator at: ", rebalanceAggregatorDefault.address);
    deployedAddress.BaseRebalanceAggregator = rebalanceAggregatorDefault.address;

    const Exchange = await ethers.getContractFactory("Exchange", {
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    }); //Deploy BaseExchange
    const exchangeDefault = await Exchange.deploy();
    await exchangeDefault.deployed();
    console.log("Deployed BaseExchange at: ", exchangeDefault.address);
    deployedAddress.BaseExchange = exchangeDefault.address;

    const IndexSwap = await ethers.getContractFactory("IndexSwap", {
      //Deploy BaseIndexSwap
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });
    const indexSwapDefault = await IndexSwap.deploy();
    await indexSwapDefault.deployed();
    console.log("Deployed BaseIndexSwap at: ", indexSwapDefault.address);
    deployedAddress.BaseIndexSwap = indexSwapDefault.address;

    const Rebalancing = await ethers.getContractFactory("Rebalancing", {
      //Deploy BaseRebalancing
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
        RebalanceLibrary: rebalanceLibrary.address,
      },
    });
    const rebalancingDefault = await Rebalancing.deploy();
    await rebalancingDefault.deployed();
    console.log("Deployed BaseRebalancing at: ", rebalancingDefault.address);
    deployedAddress.BaseRebalance = rebalancingDefault.address;

    const AssetManagerConfigDefault = await ethers.getContractFactory("AssetManagerConfig"); //Deploy BaseAssetManagerConfig
    const assetManagerConfigDefault = await AssetManagerConfigDefault.deploy();
    await assetManagerConfigDefault.deployed();
    console.log("Deployed baseAssetManagerConfig at: ", assetManagerConfigDefault.address);
    deployedAddress.BaseAssetManagerConfig = assetManagerConfigDefault.address;

    const FeeModule = await ethers.getContractFactory("FeeModule", {
      //Deploy FeeModule
      libraries: {
        FeeLibrary: feeLibrary.address,
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });
    const feeModuleDefault = await FeeModule.deploy();
    await feeModuleDefault.deployed();
    console.log("Deployed FeeModule at: ", feeModuleDefault.address);
    deployedAddress.BaseFeeModule = feeModuleDefault.address;

    const offChainIndex = await ethers.getContractFactory("OffChainIndexSwap", {
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });
    const offChainIndexSwapDefault = await offChainIndex.deploy();
    await offChainIndexSwapDefault.deployed();
    console.log("Deployed OffChainIndexSwap at: ", offChainIndexSwapDefault.address);
    deployedAddress.BaseOffChainIndexSwap = offChainIndexSwapDefault.address;

    const VelvetSafeModule = await ethers.getContractFactory("VelvetSafeModule");
    const velvetSafeModule = await VelvetSafeModule.deploy();
    await velvetSafeModule.deployed();
    console.log("Deployed OffChainIndexSwap at: ", velvetSafeModule.address);
    deployedAddress.VelvetSafeModule = velvetSafeModule.address;

    // ------------------------------------------------------------------------------------------------------------------------ //
    // Deploy Price Oracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();
    await priceOracle.deployed();
    console.log("Deployed PriceOracle at: ", priceOracle.address);
    deployedAddress.PriceOracle = priceOracle.address;
    const priceOracleContract = await PriceOracle.attach(priceOracle.address);

    await initPriceOracle(deployedAddress, priceOracleData);
    // ------------------------------------------------------------------------------------------------------------------------ //
    //Deploy SwapHandler
    const PancakeSwapHandler = await ethers.getContractFactory("PancakeSwapHandler");
    const swapHandler = await PancakeSwapHandler.deploy();
    await swapHandler.deployed();
    console.log("Deployed SwapHandler at: ", swapHandler.address);
    deployedAddress.SwapHandler = swapHandler.address;
    const swapHandlerContract = await PancakeSwapHandler.attach(swapHandler.address);
    const tx5 = await swapHandlerContract.init(inputData.pancakeSwapRouterAddress, priceOracle.address);
    tx5.wait(2);
    // ------------------------------------------------------------------------------------------------------------------------ //
    //Deploy Handlers

    const BaseHandler = await ethers.getContractFactory("BaseHandler"); //Deploy Base Handler
    const baseHandler = await BaseHandler.deploy();
    await baseHandler.deployed();
    console.log("Deployed BaseHandler at: ", baseHandler.address);
    deployedAddress.BaseHandler = baseHandler.address;

    const VenusHandler = await ethers.getContractFactory("VenusHandler"); //Deploy Venus Handler
    const venusHandler = await VenusHandler.deploy();
    await venusHandler.deployed();
    console.log("Deployed VenusHandler at: ", venusHandler.address);
    deployedAddress.VenusHandler = venusHandler.address;

    const AlpacaHandler = await ethers.getContractFactory("AlpacaHandler"); //Deploy Alpaca Handler
    const alpacaHandler = await AlpacaHandler.deploy();
    await alpacaHandler.deployed();
    console.log("Deployed AlpacaHandler at: ", alpacaHandler.address);
    deployedAddress.AlpacaHandler = alpacaHandler.address;

    const PancakeSwapLPHandler = await ethers.getContractFactory("PancakeSwapLPHandler"); //Deploy PancakeSwapLP Handler
    const pancakeSwapLPHandler = await PancakeSwapLPHandler.deploy(priceOracle.address);
    await pancakeSwapLPHandler.deployed();
    console.log("Deployed PancakeSwapLPHandler at: ", pancakeSwapLPHandler.address, priceOracle.address);
    deployedAddress.PancakeSwapLPHandler = pancakeSwapLPHandler.address;

    const BiSwapLPHandler = await ethers.getContractFactory("BiSwapLPHandler"); //Deploy BiSwapLP Handler
    const biSwapLPHandler = await BiSwapLPHandler.deploy(priceOracle.address);
    await biSwapLPHandler.deployed();
    console.log("Deployed BiswapLPHandler at: ", biSwapLPHandler.address);
    deployedAddress.BiSwapLPHandler = biSwapLPHandler.address;

    const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler"); //Deploy ApeSwapLP Handler
    const apeSwapLPHandler = await ApeSwapLPHandler.deploy(priceOracle.address);
    await apeSwapLPHandler.deployed();
    console.log("Deployed ApeSwapLPHandler at: ", apeSwapLPHandler.address);
    deployedAddress.ApeSwapLPHandler = apeSwapLPHandler.address;

    const WombatHandler = await ethers.getContractFactory("WombatHandler"); //Deploy Wombat Handler
    const wombatHandler = await WombatHandler.deploy();
    await wombatHandler.deployed();
    console.log("Deployed WombatHandler at: ", wombatHandler.address);
    deployedAddress.WombatHandler = wombatHandler.address;

    const ApeSwapLendingHandler = await ethers.getContractFactory("ApeSwapLendingHandler"); //Deploy ApeSwapLending Handler
    const apeSwapLendingHandler = await ApeSwapLendingHandler.deploy();
    await apeSwapLendingHandler.deployed();
    console.log("Deployed ApeSwapLendingHandler at: ", apeSwapLendingHandler.address);
    deployedAddress.ApeSwapLendingHandler = apeSwapLendingHandler.address;

    const BeefyHandler = await ethers.getContractFactory("BeefyHandler"); //Deploy Beefy Handler
    const beefyHandler = await BeefyHandler.deploy();
    await beefyHandler.deployed();
    console.log("Deployed BeefyLPHandler at: ", beefyHandler.address);
    deployedAddress.BeefyHandler = beefyHandler.address;

    const BeefyLPHandler = await ethers.getContractFactory("BeefyLPHandler"); //Deploy Beefy Handler
    const beefyLPHandler = await BeefyLPHandler.deploy(pancakeSwapLPHandler.address, priceOracle.address);
    await beefyLPHandler.deployed();
    console.log("Deployed BeefyLPHandler at: ", beefyLPHandler.address);
    deployedAddress.BeefyLPHandler = beefyLPHandler.address;

    const ZeroExSwapHandler = await ethers.getContractFactory("ZeroExHandler");
    const zeroExHandler = await ZeroExSwapHandler.deploy();
    await zeroExHandler.deployed();
    console.log("Deployed ZeroExSwapHandler at: ", zeroExHandler.address);
    deployedAddress.ZeroExSwapHandler = zeroExHandler.address;
    const tx = await zeroExHandler.attach(zeroExHandler.address).init("0xdef1c0ded9bec7f1a1670819833240f027b25eff");
    tx.wait(2);

    const OneInchSwapHandler = await ethers.getContractFactory("OneInchHandler");
    const oneInchHandler = await OneInchSwapHandler.deploy();
    await oneInchHandler.deployed();
    console.log("Deployed OneInchSwapHandler at: ", oneInchHandler.address);
    deployedAddress.OneInchSwapHandler = oneInchHandler.address;

    const tx2 = await oneInchHandler.attach(oneInchHandler.address).init("0x1111111254EEB25477B68fb85Ed929f73A960582");
    tx2.wait(2);

    const ParaswapHandler = await ethers.getContractFactory("ParaswapHandler");
    const paraswapHandler = await ParaswapHandler.deploy();
    await paraswapHandler.deployed();
    console.log("Deployed ParaswapHandler at: ", paraswapHandler.address);
    deployedAddress.ParaswapHandler = paraswapHandler.address;

    const tx3 = await paraswapHandler
      .attach(paraswapHandler.address)
      .init("0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57", "0x216B4B4Ba9F3e719726886d34a177484278Bfcae");
    tx3.wait(2);
    // ------------------------------------------------------------------------------------------------------------------------ //

    // Deploy Token Registry

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    const tokenRegistry = await upgrades.deployProxy(
      TokenRegistry,
      [
        inputData.protocolFee,
        inputData._protocolFeeBottomConstraint,
        inputData.maxAssetManagerFee,
        inputData.maxPerformanceFee,
        inputData._maxEntryFee,
        inputData._maxExitFee,
        inputData.minInvestmentAmount,
        inputData.maxInvestmentAmount,
        inputData.velvetTreasury,
        inputData.wBNB,
        inputData.cooldownPeriod,
      ],
      { kind: "uups" },
    );
    await tokenRegistry.deployed();
    console.log("Deployed TokenRegistry at: ", tokenRegistry.address);
    deployedAddress.TokenRegistry = tokenRegistry.address;

    await initTokenRegistry(deployedAddress);

    await initLPHandler(deployedAddress); // Set LP slippage for the handlers
    // ------------------------------------------------------------------------------------------------------------------------ //
    await delay(1000);

    // ------------------------------------------------------------------------------------------------------------------------ //
    const IndexFactory = await ethers.getContractFactory("IndexFactory");
    const indexFactory = await upgrades.deployProxy(
      IndexFactory,
      [
        {
          _indexSwapLibrary: indexSwapLibrary.address,
          _baseIndexSwapAddress: indexSwapDefault.address,
          _baseRebalancingAddres: rebalancingDefault.address,
          _baseOffChainRebalancingAddress: offChainRebalanceDefault.address,
          _baseRebalanceAggregatorAddress: rebalanceAggregatorDefault.address,
          _baseExchangeHandlerAddress: exchangeDefault.address,
          _baseAssetManagerConfigAddress: assetManagerConfigDefault.address,
          _baseOffChainIndexSwapAddress: offChainIndexSwapDefault.address,
          _feeModuleImplementationAddress: feeModuleDefault.address,
          _baseVelvetGnosisSafeModuleAddress: velvetSafeModule.address,
          _gnosisSingleton: inputData.gnosisSingleton,
          _gnosisFallbackLibrary: inputData.gnosisFallbackLibrary,
          _gnosisMultisendLibrary: inputData.gnosisMultisendLibrary,
          _gnosisSafeProxyFactory: inputData.gnosisSafeProxyFactory,
          _priceOracle: priceOracle.address,
          _tokenRegistry: tokenRegistry.address,
          _velvetProtocolFee: "100",
          _maxInvestmentAmount: "120000000000000000000000",
          _minInvestmentAmount: "3000000000000000000",
        },
      ],
      { kind: "uups" },
    );
    await indexFactory.deployed();
    console.log("Deployed IndexFactory at: ", indexFactory.address);
    deployedAddress.IndexFactory = indexFactory.address;
    // console.log("The deployed contracts are: ", deployedAddress);

    fs.writeFileSync("scripts/deploymentData.json", JSON.stringify(deployedAddress));

    console.log("---------------------- DEPLOYMENT ENDED ---------------------");
  } catch (e) {
    console.log(e);
    console.log("The deployed contracts are: ", deployedAddress);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initTokenRegistry(_deployedAddress: any) {
  const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
  const tokenRegistryContract = await TokenRegistry.attach(_deployedAddress.TokenRegistry);

  const newToken = [];

  console.log("------- Initializing in TokenRegistry -------");

  var priceOracleArray = [];
  var tokenArray = [];
  var addressArray = [];
  var handlerArray = [];
  var primaryArray = [];
  var rewardArray = [];

  for (let i = 0; i < allTokenListUnfiltered.length; i++) {
    const object = allTokenListUnfiltered[i];
    tokenArray.push(object.token);
    addressArray.push(object.address);
    handlerArray.push(_deployedAddress[object.handler]);
    primaryArray.push(object.primary);
    rewardArray.push([object.rewardToken]);
    priceOracleArray.push(_deployedAddress.PriceOracle);
  }

  const tx1 = await tokenRegistryContract.enableToken(
    priceOracleArray,
    addressArray,
    handlerArray,
    rewardArray,
    primaryArray,
  );
  tx1.wait(2);

  console.log("Enabled Tokens In TokenRegistry");

  for (let i = 0; i < rewardTokens.length; i++) {
    const txI = await tokenRegistryContract.addRewardToken(rewardTokens[i]);
    txI.wait(2);
  }

  console.log("Enabled Reward Tokens");

  const tx4 = await tokenRegistryContract.enablePermittedTokens(permittedTokens, [
    _deployedAddress.PriceOracle,
    _deployedAddress.PriceOracle,
    _deployedAddress.PriceOracle,
  ]);
  tx4.wait(2);
  console.log("Enabled Permitted Token");
  const tx6 = await tokenRegistryContract.enableSwapHandlers([_deployedAddress.SwapHandler]);
  tx6.wait(2);
  console.log("Enabled Swap Handlers");
  const tx7 = await tokenRegistryContract.enableExternalSwapHandler(_deployedAddress.OneInchSwapHandler);
  tx7.wait(2);
  console.log("Enabled 1Inch External Swap Handler");
  const tx8 = await tokenRegistryContract.enableExternalSwapHandler(_deployedAddress.ZeroExSwapHandler);
  tx8.wait(2);
  console.log("Enabled ZeroEx External Swap Handler");
  const tx9 = await tokenRegistryContract.enableExternalSwapHandler(_deployedAddress.ParaswapHandler);
  tx9.wait(2);
  console.log("Enabled Paraswap External Swap Handler");
  const tx10 = await tokenRegistryContract.addNonDerivative(_deployedAddress.WombatHandler);
  tx10.wait(2);
  console.log("Enabled Wombat Non Derivative Handler");
  //   const tx112 =await tokenRegistryContract.addNonDerivative(_deployedAddress.PancakeSwapLPHandler);
  //   tx112.wait(2);
  //   console.log("Enabled PancakeLP Non Derivative Handler")
  //   const tx111 = await tokenRegistryContract.addLPStakingHandler(_deployedAddress.PancakeSwapLPHandler);
  //   tx111.wait(2);
  //   console.log("Enabled PancakeLP LpStaking Handler")
  console.log("------- TokenRegistry Initializing Completed -------");
  return;
}

async function initPriceOracle(_deployedAddress: any, _priceOracleData: any) {
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracleContract = await PriceOracle.attach(_deployedAddress.PriceOracle);

  console.log("------- Initializing in PriceOracle -------");

  const tokenArray = [];
  const quoteArray = [];
  const aggregatorArray = [];

  for (const item of _priceOracleData) {
    tokenArray.push(item.address[0]);
    quoteArray.push(item.address[1]);
    aggregatorArray.push(item.address[2]);
    console.log("Added Token In Array:", item.token);
  }
  const tx = await priceOracleContract._addFeed(tokenArray, quoteArray, aggregatorArray);
  tx.wait(3);

  console.log("------- PriceOracle Initialized -------");
  return;
}

async function initLPHandler(_deployedAddress: any) {
  console.log("------- Initializing in LP Handler -------");

  const PancakeSwapLPHandler = await ethers.getContractFactory("PancakeSwapLPHandler");
  const BiSwapLPHandler = await ethers.getContractFactory("BiSwapLPHandler");
  const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler");
  const WombatHandler = await ethers.getContractFactory("WombatHandler");

  const pancakeLpHandler = await PancakeSwapLPHandler.attach(_deployedAddress.PancakeSwapLPHandler);
  const biswapLpHandler = await BiSwapLPHandler.attach(_deployedAddress.BiSwapLPHandler);
  const apeSwapLPHandler = await ApeSwapLPHandler.attach(_deployedAddress.ApeSwapLPHandler);
  const wombatHandler = await WombatHandler.attach(_deployedAddress.WombatHandler);

  const tx = await pancakeLpHandler.addOrUpdateProtocolSlippage("2500");
  tx.wait(2);
  console.log("PancakeSwapLP Slippage set at 25% Max");
  const tx2 = await biswapLpHandler.addOrUpdateProtocolSlippage("2500");
  tx2.wait(2);
  console.log("BiSwapLP Slippage set at 25% Max");
  const tx3 = await apeSwapLPHandler.addOrUpdateProtocolSlippage("2500");
  tx3.wait(2);
  console.log("ApeSwapLP Slippage set at 25% Max");
  const tx4 = await wombatHandler.addOrUpdateProtocolSlippage("2500");
  tx4.wait(2);
  console.log("WombatLP Slippage set at 25% Max");
  console.log("------- LP Handler Initialised -------");
  return;
}
deploy();
