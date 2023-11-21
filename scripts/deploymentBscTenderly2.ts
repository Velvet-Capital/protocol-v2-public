import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import hre from "hardhat";
import { ethers, upgrades, tenderly } from "hardhat";
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
    OneInchHandler
} from "../typechain";

import { inputData, priceOracleInfo,tokenRegistryTokenInfo, tokenRegistryTokenInfo3April ,tokenRegistryInfo3April2, apeswapLendingTokens, apeswapLPTokens, liqeeTokens, venusTokens, allTokenList, beefyTokens,allTokenListUnfiltered,permittedTokens, rewardTokens, pancakeLPTokens, allLpTokens} from "./deploymentInputs";
const fs = require('fs');

const userInputData = inputData;
const priceOracleData = priceOracleInfo;

const deployedAddress: any ={};
const tokenData: any ={};

import dd from "./deploymentData.json";

async function deploy(){
  try{
    const [deployer,acc1,acc2,acc3,acc4,acc5] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Deployer Balance: ", await ethers.provider.getBalance(deployer.address))

    console.log(userInputData);

    console.log("---------------------- DEPLOYMENT STARTED PART 2 ---------------------");

    // ------------------------------------------------------------------------------------------------------------------------ //

    // Deploy Token Registry

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    const tokenRegistry = await upgrades.deployProxy(
        TokenRegistry,[inputData.minInvestmentAmount,inputData.maxInvestmentAmount,inputData.velvetTreasury,inputData.WETH], { kind: "uups" });
    await tokenRegistry.deployed();
    console.log("Deployed TokenRegistry at: ",tokenRegistry.address);
    dd.TokenRegistry = tokenRegistry.address;

// ------------------------------------------------------------------------------------------------------------------------ //
   await delay(1000);

// ------------------------------------------------------------------------------------------------------------------------ //
    const IndexFactory = await ethers.getContractFactory("IndexFactory");
    const indexFactory = await upgrades.deployProxy(
        IndexFactory,[{
            _indexSwapLibrary: dd.IndexSwapLibrary,
            _baseIndexSwapAddress: dd.BaseIndexSwap,
            _baseRebalancingAddres: dd.BaseRebalance,
            _baseOffChainRebalancingAddress: dd.BaseOffChainRebalance,
            _baseRebalanceAggregatorAddress: dd.BaseRebalanceAggregator,
            _baseExchangeHandlerAddress: dd.BaseExchange,
            _baseAssetManagerConfigAddress: dd.BaseAssetManagerConfig,
            _baseOffChainIndexSwapAddress: dd.BaseOffChainIndexSwap,
            _feeModuleImplementationAddress: dd.BaseFeeModule,
            _baseVelvetGnosisSafeModuleAddress: dd.VelvetSafeModule,
            _gnosisSingleton: inputData.gnosisSingleton,
            _gnosisFallbackLibrary: inputData.gnosisFallbackLibrary,
            _gnosisMultisendLibrary: inputData.gnosisMultisendLibrary,
            _gnosisSafeProxyFactory: inputData.gnosisSafeProxyFactory,
            _priceOracle: dd.PriceOracle,
            _tokenRegistry: tokenRegistry.address,
            _velvetProtocolFee: inputData.protocolFee,
            _maxInvestmentAmount: inputData.maxInvestmentAmount,
            _minInvestmentAmount: inputData.minInvestmentAmount,
          },], { kind: "uups" });
    await indexFactory.deployed();
    console.log("Deployed IndexFactory at: ", indexFactory.address);
    dd.IndexFactory = indexFactory.address;
    console.log(await indexFactory.owner());
    console.log("The deployed contracts are: ", dd);

    await tenderly.verify({
      name: "IndexFactory",
      address: "0xb00d1c92e367c2a9210130e756317bee72b7ef1e",
    });
    // await transferOwnership();

    // await initTokenRegistry(dd);

    console.log("---------------------- DEPLOYMENT ENDED PART 2 ---------------------");
  }catch(e){
    console.log(e);
    console.log("The deployed contracts are: ", dd);
  }
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

async function initTokenRegistry(_deployedAddress:any){
  const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
  const tokenRegistryContract = await TokenRegistry.attach(_deployedAddress.TokenRegistry)

  const newToken = []

  console.log("------- Initializing in TokenRegistry -------")

  var priceOracleArray =[]
  var tokenArray = [];
  var addressArray = [];
  var handlerArray = [];
  var primaryArray = [];
  var rewardArray =[];
  
  for (let i = 0; i < allTokenListUnfiltered.length; i++) {
    
    const object = allTokenListUnfiltered[i];
    tokenArray.push(object.token);
    addressArray.push(object.address);
    handlerArray.push(_deployedAddress[object.handler]);
    primaryArray.push(object.primary);
    rewardArray.push([object.rewardToken]);
    priceOracleArray.push(_deployedAddress.PriceOracle)
  }

  // console.log(priceOracleArray,addressArray,handlerArray,rewardArray,primaryArray)
  // for(let i = 0; i < allTokenListUnfiltered.length; i++){
    // const object = allTokenListUnfiltered[i];
    // console.log("object.token",object.token);
    const tx1 = await tokenRegistryContract.enableToken(priceOracleArray,addressArray,handlerArray,rewardArray,primaryArray);
  tx1.wait(2);
  // }
  // tokenData.allTokenArray = {
  //   priceOracleArray: priceOracleArray,
  //   addressArray: addressArray,
  //   handlerArray: handlerArray,
  //   rewardArray: rewardArray,
  //   primaryArray: primaryArray
  // }

  console.log("Enabled Tokens In TokenRegistry Part 1");

  // var priceOracleArray =[]
  // var tokenArray = [];
  // var addressArray = [];
  // var handlerArray = [];
  // var primaryArray = [];
  // var rewardArray =[];
  
  // for (let i = 0; i < pancakeLPTokens.length; i++) {
    
  //   const object = pancakeLPTokens[i];
  //   tokenArray.push(object.token);
  //   addressArray.push(object.address);
  //   handlerArray.push(_deployedAddress[object.handler]);
  //   primaryArray.push(object.primary);
  //   rewardArray.push([object.rewardToken]);
  //   priceOracleArray.push(_deployedAddress.PriceOracle)
  // }

  // const tx11 = await tokenRegistryContract.enableToken(priceOracleArray,addressArray,handlerArray,rewardArray,primaryArray);
  // tx11.wait(2);

  // tokenData.pancakeAndBeefyLPTokenArray = {
  //   priceOracleArray: priceOracleArray,
  //   addressArray: addressArray,
  //   handlerArray: handlerArray,
  //   rewardArray: rewardArray,
  //   primaryArray: primaryArray
  // }
  
  fs.writeFileSync('scripts/tokenData.json', JSON.stringify(tokenData));

  console.log("Enabled Tokens In TokenRegistry Part 2");

  //  const txI = await tokenRegistryContract.addRewardToken(rewardTokens,dd.BaseHandler);
  //  txI.wait(4);
  

  // console.log("Enabled Reward Tokens");
  
  const tx4 = await tokenRegistryContract.enablePermittedTokens(permittedTokens, [_deployedAddress.PriceOracle, _deployedAddress.PriceOracle])
  tx4.wait(4);
  await delay(1000);
  console.log("Enabled Permitted Token")
  const tx6 = await tokenRegistryContract.enableSwapHandlers([_deployedAddress.SwapHandler]);
  tx6.wait(4);
  await delay(1000);
  console.log("Enabled Swap Handlers")
  const tx7 = await tokenRegistryContract.enableExternalSwapHandler(_deployedAddress.OneInchSwapHandler);
  tx7.wait(4);
  await delay(1000);
  console.log("Enabled 1Inch External Swap Handler")
  const tx8 = await tokenRegistryContract.enableExternalSwapHandler(_deployedAddress.ZeroExSwapHandler);
  tx8.wait(4);
  await delay(1000);
  console.log("Enabled ZeroEx External Swap Handler")
  // const tx9 = await tokenRegistryContract.enableExternalSwapHandler(_deployedAddress.ParaswapHandler);
  // tx9.wait(4);
  // await delay(1000);
  // console.log("Enabled Paraswap External Swap Handler")
  const tx10 =await tokenRegistryContract.addNonDerivative(_deployedAddress.WombatHandler);
  tx10.wait(4);
  await delay(1000);
  console.log("Enabled Wombat Non Derivative Handler")

  console.log("------- TokenRegistry Initializing Completed -------")
  return

}

async function transferOwnership(){
  const [deployer,acc1,acc2,acc3,acc4,acc5] = await ethers.getSigners();
  // const IndexSwapLibraryDefault = await ethers.getContractFactory("IndexSwapLibrary");
  // const indexSwapLibrary = await IndexSwapLibraryDefault.attach(dd.IndexSwapLibrary)
  // console.log("Transferred Ownership Of IndexSwapLibrary ");

  // const FeeLibrary = await ethers.getContractFactory("FeeLibrary");
  // const feeLibrary = await FeeLibrary.attach(dd.FeeLibrary)
  // console.log("Transferred Ownership Of FeeLibrary");

  // const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary",
  //   {
  //     libraries: {
  //       IndexSwapLibrary: indexSwapLibrary.address,
  //     },
  //   }
  // );
  // const rebalanceLibrary = await RebalanceLibrary.attach(dd.RebalanceLibrary);
  // console.log("Transferred Ownership Of RebalanceLibrary");

  // ------------------------------------------------------------------------------------------------------------------------ //

  // const OffChainRebalance = await ethers.getContractFactory("OffChainRebalance",{ 
  //     libraries: {
  //       RebalanceLibrary: rebalanceLibrary.address,
  //       IndexSwapLibrary: indexSwapLibrary.address,
  //     },
  //   }
  // );
  // const offChainRebalanceDefault = await OffChainRebalance.attach(dd.BaseOffChainRebalance);
  // console.log(await offChainRebalanceDefault.owner());
  // var tx1 = await offChainRebalanceDefault.transferOwnership(inputData.ownerMultiSigWalletAddress)
  // tx1.wait(2);
  // console.log("Transferred Ownership Of OffChainRebalance");

  // const RebalanceAggregator = await ethers.getContractFactory("RebalanceAggregator",{ 
  //   libraries : {
  //     RebalanceLibrary: rebalanceLibrary.address,
  //   }
  // });
  // const rebalanceAggregatorDefault = await RebalanceAggregator.attach(dd.BaseRebalanceAggregator);
  // var tx1 = await rebalanceAggregatorDefault.transferOwnership(inputData.ownerMultiSigWalletAddress)
  // tx1.wait(2);
  // console.log("Transferred Ownership Of BaseRebalanceAggregator");

  // const Exchange = await ethers.getContractFactory("Exchange",{
  //   libraries: {
  //   IndexSwapLibrary: indexSwapLibrary.address
  // },
  // }); 
  // const exchangeDefault = await Exchange.attach(dd.BaseExchange);
  // var tx1 = await exchangeDefault.transferOwnership(inputData.ownerMultiSigWalletAddress)
  // tx1.wait(2);
  // console.log("Transferred Ownership Of BaseExchange at");

  // const IndexSwap = await ethers.getContractFactory("IndexSwap", { //Deploy BaseIndexSwap
  //     libraries: {
  //       IndexSwapLibrary: indexSwapLibrary.address,
  //     },
  //   });
  // const indexSwapDefault = await IndexSwap.attach(dd.BaseIndexSwap);
  // var tx1 = await indexSwapDefault.transferOwnership(inputData.ownerMultiSigWalletAddress)
  // tx1.wait(2);
  // console.log("Transferred Ownership Of BaseIndexSwap");

  // const Rebalancing = await ethers.getContractFactory("Rebalancing", { //Deploy BaseRebalancing
  //     libraries: {
  //       IndexSwapLibrary: indexSwapLibrary.address,
  //       RebalanceLibrary: rebalanceLibrary.address,
  //     },
  //   });
  // const rebalancingDefault = await Rebalancing.attach(dd.BaseRebalance);
  // var tx1 = await rebalancingDefault.transferOwnership(inputData.ownerMultiSigWalletAddress)
  // tx1.wait(2);
  // console.log("Transferred Ownership Of BaseRebalancing");

  // const AssetManagerConfigDefault = await ethers.getContractFactory("AssetManagerConfig"); //Deploy BaseAssetManagerConfig
  // const assetManagerConfigDefault = await AssetManagerConfigDefault.attach(dd.BaseAssetManagerConfig);
  // var tx1 = await assetManagerConfigDefault.transferOwnership(inputData.ownerMultiSigWalletAddress)
  // tx1.wait(2);
  // console.log("Transferred Ownership Of baseAssetManagerConfig");

  // const FeeModule = await ethers.getContractFactory("FeeModule", {     //Deploy FeeModule
  //   libraries: {
  //     FeeLibrary: feeLibrary.address,
  //     IndexSwapLibrary: indexSwapLibrary.address,
  //   },
  // });
  // const feeModuleDefault = await FeeModule.attach(dd.BaseFeeModule);
  // var tx1 = await feeModuleDefault.transferOwnership(inputData.ownerMultiSigWalletAddress)
  // tx1.wait(2);
  // console.log("Transferred Ownership Of FeeModule ");

  // const offChainIndex = await ethers.getContractFactory(
  //   "OffChainIndexSwap",
  //   {
  //     libraries: {
  //       IndexSwapLibrary: indexSwapLibrary.address,
  //     },
  //   }
  // );
  // const offChainIndexSwapDefault = await offChainIndex.attach(dd.BaseOffChainIndexSwap);
  // var tx1 = await offChainIndexSwapDefault.transferOwnership(inputData.ownerMultiSigWalletAddress)
  // tx1.wait(2);
  // console.log("Transferred Ownership Of OffChainIndexSwap");

  // const VelvetSafeModule = await ethers.getContractFactory("VelvetSafeModule");
  // const velvetSafeModule = await VelvetSafeModule.attach(dd.VelvetSafeModule);
  // var tx1 = await velvetSafeModule.transferOwnership(inputData.ownerMultiSigWalletAddress)
  // tx1.wait(2);
  // console.log("Transferred Ownership Of OffChainIndexSwap");


// ------------------------------------------------------------------------------------------------------------------------ //
//   // Deploy Price Oracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.attach(dd.PriceOracle);
  var tx1 = await priceOracle.transferOwnership(inputData.ownerMultiSigWalletAddress)
  tx1.wait(2);
  console.log("Transferred Ownership Of PriceOracle");

// // ------------------------------------------------------------------------------------------------------------------------ //
//    //Deploy SwapHandler
//    const PancakeSwapHandler = await ethers.getContractFactory(
//       "PancakeSwapHandler"
//     );
//     const swapHandler = await PancakeSwapHandler.attach(dd.SwapHandler);
//     var tx1 = await swapHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
//     tx1.wait(2);
//     console.log("Transferred Ownership Of SwapHandler");
// // ------------------------------------------------------------------------------------------------------------------------ //
//   //Deploy Handlers

//   const BaseHandler = await ethers.getContractFactory("BaseHandler"); //Deploy Base Handler
//   const baseHandler = await BaseHandler.attach(dd.BaseHandler);
//   var tx1 = await baseHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
//   tx1.wait(2);
//   console.log("Transferred Ownership Of BaseHandler");


//   const VenusHandler = await ethers.getContractFactory("VenusHandler"); //Deploy Venus Handler
//   const venusHandler = await VenusHandler.attach(dd.VenusHandler);
//   var tx1 = await venusHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
//   tx1.wait(2);
//   console.log("Transferred Ownership Of VenusHandler");

//   const AlpacaHandler = await ethers.getContractFactory("AlpacaHandler"); //Deploy Alpaca Handler
//   const alpacaHandler = await AlpacaHandler.attach(dd.AlpacaHandler);
//   var tx1 = await alpacaHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
//   tx1.wait(2);
//   console.log("Transferred Ownership Of AlpacaHandler");



  const SushiSwapLPHandler = await ethers.getContractFactory("SushiSwapLPHandler"); //Deploy PancakeSwapLP Handler
  const sushiSwapLPHandler = await SushiSwapLPHandler.attach(dd.SushiSwapLPHandler);
  var tx1 = await sushiSwapLPHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
  tx1.wait(2);
  console.log("Transferred Ownership Of PancakeSwapLPHandler");



//   const BiSwapLPHandler = await ethers.getContractFactory("BiSwapLPHandler"); //Deploy BiSwapLP Handler
//   const biSwapLPHandler = await BiSwapLPHandler.attach(dd.BiSwapLPHandler);
//   var tx1 = await biSwapLPHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
//   tx1.wait(2);
//   console.log("Transferred Ownership Of BiswapLPHandler");



  const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler"); //Deploy ApeSwapLP Handler
  const apeSwapLPHandler = await ApeSwapLPHandler.attach(dd.ApeSwapLPHandler)
  var tx1 = await apeSwapLPHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
  tx1.wait(2);
  console.log("Transferred Ownership Of ApeSwapLPHandler");

  const WombatHandler = await ethers.getContractFactory("WombatHandler"); //Deploy Wombat Handler
  const wombatHandler = await WombatHandler.attach(dd.WombatHandler)
  var tx1 = await wombatHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
  tx1.wait(2);
  console.log("Transferred Ownership Of WombatHandler");


//   const ApeSwapLendingHandler = await ethers.getContractFactory("ApeSwapLendingHandler"); //Deploy ApeSwapLending Handler
//   const apeSwapLendingHandler = await ApeSwapLendingHandler.attach(dd.ApeSwapLendingHandler)
//   var tx1 = await apeSwapLendingHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
//   tx1.wait(2);
//   console.log("Transferred Ownership Of ApeSwapLendingHandler");


//   const BeefyHandler = await ethers.getContractFactory("BeefyHandler"); //Deploy Beefy Handler
//   const beefyHandler = await BeefyHandler.attach(dd.BeefyHandler);
//   var tx1 = await beefyHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
//   tx1.wait(2);
//   console.log("Transferred Ownership Of BeefyLPHandler");


//   const BeefyLPHandler = await ethers.getContractFactory("BeefyLPHandler"); //Deploy Beefy Handler
//   const beefyLPHandler = await BeefyLPHandler.attach(dd.BeefyLPHandler);
//   var tx1 = await beefyLPHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
//   tx1.wait(2);
//   console.log("Transferred Ownership Of BeefyLPHandler");


  const ZeroExSwapHandler = await ethers.getContractFactory("ZeroExHandler");
  const zeroExHandler = await ZeroExSwapHandler.attach(dd.ZeroExSwapHandler)
  var tx1 = await zeroExHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
  tx1.wait(2);
  console.log("Transferred Ownership Of ZeroExSwapHandler");


  const OneInchSwapHandler = await ethers.getContractFactory("OneInchHandler");
  const oneInchHandler = await OneInchSwapHandler.attach(dd.OneInchSwapHandler)
  var tx1 = await oneInchHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
  tx1.wait(2);
  console.log("Transferred Ownership Of OneInchSwapHandler");


//   const ParaswapHandler = await ethers.getContractFactory("ParaswapHandler");
//   const paraswapHandler = await ParaswapHandler.attach(dd.ParaswapHandler)
//   var tx1 = await paraswapHandler.transferOwnership(inputData.ownerMultiSigWalletAddress)
//   tx1.wait(2);
//   console.log("Transferred Ownership Of ParaswapHandler");

  const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
  const tokenRegistry = await TokenRegistry.attach(dd.TokenRegistry)
  var tx1 = await tokenRegistry.transferOwnership(inputData.ownerMultiSigWalletAddress)
  tx1.wait(2);
  console.log("Transferred Ownership Of TokenRegistry");

  const IndexFactory = await ethers.getContractFactory("IndexFactory");
  const indexFactory = await IndexFactory.attach(dd.IndexFactory)
  console.log(await indexFactory.owner());
  var tx1 = await indexFactory.transferOwnership(inputData.ownerMultiSigWalletAddress)
  tx1.wait(2);
  
  console.log("Transferred Ownership Of IndexFactory");

}

// deploy();

// transferOwnership();

// initTokenRegistry(dd);

// async function deployUIDataPoint(){
//   const UI = await ethers.getContractFactory("UIDataPoint", {
//     libraries: {
//       RebalanceLibrary: "0xAd8ce99a12aC37d939F3dd116AB88721072e9486",
//       IndexSwapLibrary: "0x09eB41a615eE143e31eb7209a46E6919824C978B",
//     },
//   });
//   const uiDataPoint = await UI.deploy("0xB8D6360945A98d246d4108459ce1906659c25851");
//   await uiDataPoint.deployed();

//   console.log("Deployed At: ", uiDataPoint.address);
// }

// deployUIDataPoint();

async function updateIndex(){
  const IndexSwapLibraryDefault = await ethers.getContractFactory("IndexSwapLibrary");
  const indexSwapLibrary = await IndexSwapLibraryDefault.deploy();
  await indexSwapLibrary.deployed();
  console.log("Deployed IndexSwapLibrary at: ", indexSwapLibrary.address);

  await tenderly.verify({
    name: "IndexSwapLibrary",
    address: indexSwapLibrary.address,
  });

  const IndexSwap = await ethers.getContractFactory("IndexSwap", { //Deploy BaseIndexSwap
    libraries: {
      IndexSwapLibrary: indexSwapLibrary.address,
    },
  });
  const indexSwapDefault = await IndexSwap.deploy();
  await indexSwapDefault.deployed();
  console.log("Deployed BaseIndexSwap at: ", indexSwapDefault.address);

  await tenderly.verify({
    name: "IndexSwap",
    address: indexSwapDefault.address,
    libraries: {
      IndexSwapLibrary: indexSwapLibrary.address
    },
  });

  const offChainIndex = await ethers.getContractFactory(
    "OffChainIndexSwap",
    {
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    }
  );
  const offChainIndexSwapDefault = await offChainIndex.deploy();
  await offChainIndexSwapDefault.deployed();
  console.log("Deployed OffChainIndexSwap at: ", offChainIndexSwapDefault.address);

  await tenderly.verify({
    name: "OffChainIndexSwap",
    address: offChainIndexSwapDefault.address,
    libraries: {
      IndexSwapLibrary: indexSwapLibrary.address,
    },
  });
}

async function deployPriceOracleAggregator(){
//   const lpPriceAggregatorData: any ={};
//   const tokenArray = [];
//   const quoteArray = [];
//   const aggregatorArray = [];
//   const data: any={}
//   try{
//   const Aggregator = await ethers.getContractFactory("UniswapV2LPAggregator");
//   const PriceOracle = await ethers.getContractFactory("PriceOracle");
//   const priceOracle = await PriceOracle.attach("0x0023758363C5B00adf8CaD0FB3F3335065647A2B");
//   for(let i = 0;i<allLpTokens.length;i++){
//    const lpToken = allLpTokens[i].token;
//    const aggregator = await Aggregator.deploy(allLpTokens[i].address,priceOracle.address);
//    await aggregator.deployed()
//    lpPriceAggregatorData[lpToken] = aggregator.address;
//    console.log("Deployed Token " + allLpTokens[i].token + " at " + aggregator.address);
   
//    tokenArray.push(allLpTokens[i].address);
//    quoteArray.push("0x0000000000000000000000000000000000000348");
//    aggregatorArray.push(aggregator.address);
//    await delay(500);
//   }
//   console.log("DEPLOYED ALL AGGREGATOR")
//   data.tokenArray = tokenArray;
//   data.quoteArray = quoteArray;
//   data.aggregatorArray = aggregatorArray;

//   const t1 = await priceOracle._addFeed(tokenArray,quoteArray,aggregatorArray);
//   t1.wait(2);
//   console.log("ADD ALL AGGREGATOR TO ORACLE")
//   fs.writeFileSync('scripts/lpTokenAggregatorInfo.json', JSON.stringify(lpPriceAggregatorData));
//   fs.writeFileSync('scripts/dataArray.json', JSON.stringify(data));
//   console.log("SAVED AGGREGATOR")
// }catch(e){
//   console.log(e)
//   data.tokenArray = tokenArray;
//   data.quoteArray = quoteArray;
//   data.aggregatorArray = aggregatorArray;
//   fs.writeFileSync('scripts/dataArray.json', JSON.stringify(data));
//   fs.writeFileSync('scripts/lpTokenAggregatorInfo.json', JSON.stringify(lpPriceAggregatorData));
// }
const TokenRegistry = await ethers.getContractFactory("TokenRegistry");

const registry = TokenRegistry.attach("0x831c2345BfA6B4F976508F5442701bda9c057C38");
await registry.transferOwnership("0x244AE091Cc6f9A95F42d64B14Aa71d0cC692e312");
}

deployPriceOracleAggregator();