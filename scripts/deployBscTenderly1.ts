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

import { inputData, priceOracleInfo,tokenRegistryTokenInfo, tokenRegistryTokenInfo3April ,tokenRegistryInfo3April2, alpacaTokens, apeswapLendingTokens, apeswapLPTokens, liqeeTokens, venusTokens, allTokenList, beefyTokens,allTokenListUnfiltered,permittedTokens, rewardTokens, pancakeLPTokens} from "./deploymentInputs";
const fs = require('fs');

const userInputData = inputData;
const priceOracleData = priceOracleInfo;

const deployedAddress: any ={};

import dd from "./deploymentData.json";

async function deploy(){
  try{
    const [deployer,acc1,acc2,acc3,acc4,acc5] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Deployer Balance: ", await ethers.provider.getBalance(deployer.address))

    console.log(userInputData);

    console.log("---------------------- DEPLOYMENT STARTED---------------------");

    //Deploy IndexSwapLibrary
    const IndexSwapLibraryDefault = await ethers.getContractFactory("IndexSwapLibrary");
    const indexSwapLibrary = await IndexSwapLibraryDefault.deploy();
    await indexSwapLibrary.deployed();
    console.log("Deployed IndexSwapLibrary at: ", indexSwapLibrary.address);
    deployedAddress.IndexSwapLibrary = indexSwapLibrary.address;

    await tenderly.verify({
      name: "IndexSwapLibrary",
      address: indexSwapLibrary.address,
    });

    //Deploy FeeLibrary
    const FeeLibrary = await ethers.getContractFactory("FeeLibrary");
    const feeLibrary = await FeeLibrary.deploy();
    await feeLibrary.deployed();
    console.log("Deployed FeeLibrary at: ", feeLibrary.address);
    deployedAddress.FeeLibrary = feeLibrary.address;

    await tenderly.verify({
      name: "FeeLibrary",
      address: feeLibrary.address,
    });

    //Deploy RebalanceLibrary
    const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary",
      {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      }
    );
    const rebalanceLibrary = await RebalanceLibrary.deploy();
    await rebalanceLibrary.deployed();
    console.log("Deployed RebalanceLibrary at: ", rebalanceLibrary.address);
    deployedAddress.RebalanceLibrary = feeLibrary.address;

    await tenderly.verify({
      name: "RebalanceLibrary",
      address: rebalanceLibrary.address,
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });

// ------------------------------------------------------------------------------------------------------------------------ //
    //Deploying Base Contracts 

    const OffChainRebalance = await ethers.getContractFactory("OffChainRebalance",{  //Deploy BaseOffChainRebalance
        libraries: {
          RebalanceLibrary: rebalanceLibrary.address,
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      }
    );
    const offChainRebalanceDefault = await OffChainRebalance.deploy();
    await offChainRebalanceDefault.deployed();
    console.log("Deployed BaseOffChainRebalance at: ", offChainRebalanceDefault.address);
    deployedAddress.BaseOffChainRebalance = offChainRebalanceDefault.address;

    await tenderly.verify({
      name: "OffChainRebalance",
      address: offChainRebalanceDefault.address,
      libraries: {
        RebalanceLibrary: rebalanceLibrary.address,
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });
  
    const RebalanceAggregator = await ethers.getContractFactory("RebalanceAggregator",{ //Deploy BaseRebalanceAggregator
      libraries : {
        RebalanceLibrary: rebalanceLibrary.address,
      }
    });
    const rebalanceAggregatorDefault = await RebalanceAggregator.deploy();
    await rebalanceAggregatorDefault.deployed();
    console.log("Deployed BaseRebalanceAggregator at: ",rebalanceAggregatorDefault.address);
    deployedAddress.BaseRebalanceAggregator = rebalanceAggregatorDefault.address;

    await tenderly.verify({
      name: "RebalanceAggregator",
      address: rebalanceAggregatorDefault.address,
      libraries: {
        RebalanceLibrary: rebalanceLibrary.address,
      },
    });

  
    const Exchange = await ethers.getContractFactory("Exchange",{
      libraries: {
      IndexSwapLibrary: indexSwapLibrary.address
    },
    }); //Deploy BaseExchange 
    const exchangeDefault = await Exchange.deploy();
    await exchangeDefault.deployed();
    console.log("Deployed BaseExchange at: ", exchangeDefault.address);
    deployedAddress.BaseExchange = exchangeDefault.address;

    await tenderly.verify({
      name: "Exchange",
      address: exchangeDefault.address,
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address
      },
    });

    const IndexSwap = await ethers.getContractFactory("IndexSwap", { //Deploy BaseIndexSwap
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
    const indexSwapDefault = await IndexSwap.deploy();
    await indexSwapDefault.deployed();
    console.log("Deployed BaseIndexSwap at: ", indexSwapDefault.address);
    deployedAddress.BaseIndexSwap = indexSwapDefault.address;

    await tenderly.verify({
      name: "IndexSwap",
      address: indexSwapDefault.address,
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address
      },
    });

    const Rebalancing = await ethers.getContractFactory("Rebalancing", { //Deploy BaseRebalancing
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
          RebalanceLibrary: rebalanceLibrary.address,
        },
      });
    const rebalancingDefault = await Rebalancing.deploy();
    await rebalancingDefault.deployed();
    console.log("Deployed BaseRebalancing at: ", rebalancingDefault.address);
    deployedAddress.BaseRebalance = rebalancingDefault.address;

    await tenderly.verify({
      name: "Rebalancing",
      address: rebalancingDefault.address,
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
        RebalanceLibrary: rebalanceLibrary.address,
      },
    });

    const AssetManagerConfigDefault = await ethers.getContractFactory("AssetManagerConfig"); //Deploy BaseAssetManagerConfig
    const assetManagerConfigDefault = await AssetManagerConfigDefault.deploy();
    await assetManagerConfigDefault.deployed();
    console.log("Deployed baseAssetManagerConfig at: ", assetManagerConfigDefault.address);
    deployedAddress.BaseAssetManagerConfig = assetManagerConfigDefault.address;

    await tenderly.verify({
      name: "AssetManagerConfig",
      address: assetManagerConfigDefault.address,
    });

    const FeeModule = await ethers.getContractFactory("FeeModule", {     //Deploy FeeModule
      libraries: {
        FeeLibrary: feeLibrary.address,
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });
    const feeModuleDefault = await FeeModule.deploy();
    await feeModuleDefault.deployed();
    console.log("Deployed FeeModule at: ", feeModuleDefault.address);
    deployedAddress.BaseFeeModule = feeModuleDefault.address;

    await tenderly.verify({
      name: "FeeModule",
      address: feeModuleDefault.address,
      libraries: {
        FeeLibrary: feeLibrary.address,
        IndexSwapLibrary: indexSwapLibrary.address,
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
    deployedAddress.BaseOffChainIndexSwap = offChainIndexSwapDefault.address;

    await tenderly.verify({
      name: "OffChainIndexSwap",
      address: offChainIndexSwapDefault.address,
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });

    const VelvetSafeModule = await ethers.getContractFactory("VelvetSafeModule");
    const velvetSafeModule = await VelvetSafeModule.deploy();
    await velvetSafeModule.deployed();
    console.log("Deployed OffChainIndexSwap at: ", velvetSafeModule.address);
    deployedAddress.VelvetSafeModule = velvetSafeModule.address;

    await tenderly.verify({
      name: "VelvetSafeModule",
      address: velvetSafeModule.address,
    });

 // ------------------------------------------------------------------------------------------------------------------------ //
    // Deploy Price Oracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();
    await priceOracle.deployed();
    console.log("Deployed PriceOracle at: ",priceOracle.address);
    deployedAddress.PriceOracle = priceOracle.address;

    await tenderly.verify({
      name: "PriceOracle",
      address: priceOracle.address,
    });

    await initPriceOracle(deployedAddress,priceOracleData)
// ------------------------------------------------------------------------------------------------------------------------ //
     //Deploy SwapHandler
     const PancakeSwapHandler = await ethers.getContractFactory(
        "PancakeSwapHandler"
      );
      const swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();
      console.log("Deployed SwapHandler at: ", swapHandler.address);
      deployedAddress.SwapHandler = swapHandler.address;

      await tenderly.verify({
        name: "PancakeSwapHandler",
        address: swapHandler.address,
      });

      const swapHandlerContract = await PancakeSwapHandler.attach(swapHandler.address);
      const tx5 = await swapHandlerContract.init(inputData.pancakeSwapRouterAddress,"0x183925bFCC9f7c0ACbEa8f9e8Ff8DfB55a5ead70");
      tx5.wait(2);
// ------------------------------------------------------------------------------------------------------------------------ //
    //Deploy Handlers

    const BaseHandler = await ethers.getContractFactory("BaseHandler"); //Deploy Base Handler
    const baseHandler = await BaseHandler.deploy();
    await baseHandler.deployed();
    console.log("Deployed BaseHandler at: ", baseHandler.address);
    deployedAddress.BaseHandler = baseHandler.address;

    await tenderly.verify({
      name: "BaseHandler",
      address: baseHandler.address,
    });

    const VenusHandler = await ethers.getContractFactory("VenusHandler"); //Deploy Venus Handler
    const venusHandler:any = await VenusHandler.deploy();
    await venusHandler.deployed();
    console.log("Deployed VenusHandler at: ", venusHandler.address);
    deployedAddress.VenusHandler = venusHandler.address;

    await tenderly.verify({
      name: "VenusHandler",
      address: venusHandler.address,
    });

    const AlpacaHandler = await ethers.getContractFactory("AlpacaHandler"); //Deploy Alpaca Handler
    const alpacaHandler = await AlpacaHandler.deploy();
    await alpacaHandler.deployed();
    console.log("Deployed AlpacaHandler at: ", alpacaHandler.address);
    deployedAddress.AlpacaHandler = alpacaHandler.address;
    
    await tenderly.verify({
      name: "AlpacaHandler",
      address: alpacaHandler.address,
    });

    const PancakeSwapLPHandler = await ethers.getContractFactory("PancakeSwapLPHandler"); //Deploy PancakeSwapLP Handler
    const pancakeSwapLPHandler = await PancakeSwapLPHandler.deploy("0x183925bFCC9f7c0ACbEa8f9e8Ff8DfB55a5ead70");
    await pancakeSwapLPHandler.deployed();
    console.log("Deployed PancakeSwapLPHandler at: ", pancakeSwapLPHandler.address);
    deployedAddress.PancakeSwapLPHandler = pancakeSwapLPHandler.address;
    
    await tenderly.verify({
      name: "PancakeSwapLPHandler",
      address: pancakeSwapLPHandler.address,
    });


    const BiSwapLPHandler = await ethers.getContractFactory("BiSwapLPHandler"); //Deploy BiSwapLP Handler
    const biSwapLPHandler = await BiSwapLPHandler.deploy("0x183925bFCC9f7c0ACbEa8f9e8Ff8DfB55a5ead70");
    await biSwapLPHandler.deployed();
    console.log("Deployed BiswapLPHandler at: ", biSwapLPHandler.address);
    deployedAddress.BiSwapLPHandler = biSwapLPHandler.address;

    await tenderly.verify({
      name: "BiSwapLPHandler",
      address: biSwapLPHandler.address,
    });

    const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler"); //Deploy ApeSwapLP Handler
    const apeSwapLPHandler = await ApeSwapLPHandler.deploy("0x183925bFCC9f7c0ACbEa8f9e8Ff8DfB55a5ead70")
    await apeSwapLPHandler.deployed();
    console.log("Deployed ApeSwapLPHandler at: ", apeSwapLPHandler.address);
    deployedAddress.ApeSwapLPHandler = apeSwapLPHandler.address;

    await tenderly.verify({
      name: "ApeSwapLPHandler",
      address: apeSwapLPHandler.address,
    });

    const WombatHandler = await ethers.getContractFactory("WombatHandler"); //Deploy Wombat Handler
    const wombatHandler = await WombatHandler.deploy()
    await wombatHandler.deployed();
    console.log("Deployed WombatHandler at: ", wombatHandler.address);
    deployedAddress.WombatHandler = wombatHandler.address;

    await tenderly.verify({
      name: "WombatHandler",
      address: wombatHandler.address,
    });

    const ApeSwapLendingHandler = await ethers.getContractFactory("ApeSwapLendingHandler"); //Deploy ApeSwapLending Handler
    const apeSwapLendingHandler = await ApeSwapLendingHandler.deploy()
    await apeSwapLendingHandler.deployed();
    console.log("Deployed ApeSwapLendingHandler at: ", apeSwapLendingHandler.address);
    deployedAddress.ApeSwapLendingHandler = apeSwapLendingHandler.address;

    await tenderly.verify({
      name: "ApeSwapLendingHandler",
      address: apeSwapLendingHandler.address,
    });

    const BeefyHandler = await ethers.getContractFactory("BeefyHandler"); //Deploy Beefy Handler
    const beefyHandler = await BeefyHandler.deploy();
    await beefyHandler.deployed();
    console.log("Deployed BeefyLPHandler at: ", beefyHandler.address);
    deployedAddress.BeefyHandler = beefyHandler.address;

    await tenderly.verify({
      name: "BeefyHandler",
      address: beefyHandler.address,
    });

    const BeefyLPHandler = await ethers.getContractFactory("BeefyLPHandler"); //Deploy Beefy Handler
    const beefyLPHandler = await BeefyLPHandler.deploy(pancakeSwapLPHandler.address,"0x183925bFCC9f7c0ACbEa8f9e8Ff8DfB55a5ead70");
    await beefyLPHandler.deployed();
    console.log("Deployed BeefyLPHandler at: ", beefyLPHandler.address);
    deployedAddress.BeefyLPHandler = beefyLPHandler.address;

    await tenderly.verify({
      name: "BeefyLPHandler",
      address: beefyLPHandler.address,
    });

    const ZeroExSwapHandler = await ethers.getContractFactory("ZeroExHandler");
    const zeroExHandler = await ZeroExSwapHandler.deploy()
    await zeroExHandler.deployed();
    console.log("Deployed ZeroExSwapHandler at: ", zeroExHandler.address);
    deployedAddress.ZeroExSwapHandler = zeroExHandler.address;

    await tenderly.verify({
      name: "ZeroExHandler",
      address: zeroExHandler.address,
    });

    const tx = await zeroExHandler.attach(zeroExHandler.address).init("0xdef1c0ded9bec7f1a1670819833240f027b25eff",priceOracle.address);
    tx.wait(2);
    const tx22 = await zeroExHandler.attach(zeroExHandler.address).addOrUpdateProtocolSlippage("100");
    tx22.wait(2);


    const OneInchSwapHandler = await ethers.getContractFactory("OneInchHandler");
    const oneInchHandler = await OneInchSwapHandler.deploy()
    await oneInchHandler.deployed();
    console.log("Deployed OneInchSwapHandler at: ", oneInchHandler.address);
    deployedAddress.OneInchSwapHandler = oneInchHandler.address;

    await tenderly.verify({
      name: "OneInchHandler",
      address: oneInchHandler.address,
    });

    const tx2 = await oneInchHandler.attach(oneInchHandler.address).init("0x1111111254EEB25477B68fb85Ed929f73A960582",priceOracle.address);
    tx2.wait(2);

    const tx23 = await oneInchHandler.attach(oneInchHandler.address).addOrUpdateProtocolSlippage("100");
    tx23.wait(2);

    const ParaswapHandler = await ethers.getContractFactory("ParaswapHandler");
    const paraswapHandler = await ParaswapHandler.deploy()
    await paraswapHandler.deployed();
    console.log("Deployed ParaswapHandler at: ", paraswapHandler.address);
    deployedAddress.ParaswapHandler = paraswapHandler.address;

    await tenderly.verify({
      name: "ParaswapHandler",
      address: paraswapHandler.address,
    });

    const tx3 = await paraswapHandler.attach(paraswapHandler.address).init("0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57","0x216B4B4Ba9F3e719726886d34a177484278Bfcae",priceOracle.address);
    tx3.wait(2);

    const tx24 = await paraswapHandler.attach(paraswapHandler.address).addOrUpdateProtocolSlippage("100");
    tx24.wait(2);

    await initLPHandler(deployedAddress); // Set LP slippage for the handlers

    fs.writeFileSync('scripts/deploymentData.json', JSON.stringify(deployedAddress));
    // ------------------------------------------------------------------------------------------------------------------------ //

// ------------------------------------------------------------------------------------------------------------------------ //
   await delay(1000);

  }catch(e){
    console.log(e);
    console.log("The deployed contracts are: ", deployedAddress);
  }
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

async function initPriceOracle(_deployedAddress:any,_priceOracleData:any){
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracleContract = await PriceOracle.attach(_deployedAddress.PriceOracle);

  console.log("------- Initializing in PriceOracle -------")

  const tokenArray = [];
  const quoteArray = [];
  const aggregatorArray = [];

    for(const item of _priceOracleData){
      tokenArray.push(item.address[0]);
      quoteArray.push(item.address[1]);
      aggregatorArray.push(item.address[2]);
      console.log("Added Token In Array:", item.token);
   }
   const tx = await priceOracleContract._addFeed(tokenArray,quoteArray,aggregatorArray);
      tx.wait(3);

  console.log("------- PriceOracle Initialized -------")
   return
}

async function initLPHandler(_deployedAddress:any){
  console.log("------- Initializing in LP Handler -------")

  const PancakeSwapLPHandler = await ethers.getContractFactory("PancakeSwapLPHandler");
  const BiSwapLPHandler = await ethers.getContractFactory("BiSwapLPHandler");
  const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler");
  const WombatHandler = await ethers.getContractFactory("WombatHandler");

  const pancakeLpHandler = await PancakeSwapLPHandler.attach(_deployedAddress.PancakeSwapLPHandler);
  const biswapLpHandler = await BiSwapLPHandler.attach(_deployedAddress.BiSwapLPHandler);
  const apeSwapLPHandler = await ApeSwapLPHandler.attach(_deployedAddress.ApeSwapLPHandler);
  const wombatHandler = await WombatHandler.attach(_deployedAddress.WombatHandler);

  const tx = await pancakeLpHandler.addOrUpdateProtocolSlippage("2500")
   tx.wait(4);
   console.log("PancakeSwapLP Slippage set at 25% Max")
  const tx2 = await biswapLpHandler.addOrUpdateProtocolSlippage("2500")
   tx2.wait(4);
   console.log("BiSwapLP Slippage set at 25% Max")
  const tx3 = await apeSwapLPHandler.addOrUpdateProtocolSlippage("2500")
   tx3.wait(4);
   console.log("ApeSwapLP Slippage set at 25% Max")
  const tx4 = await wombatHandler.addOrUpdateProtocolSlippage("2500")
   tx4.wait(4);
   console.log("WombatLP Slippage set at 25% Max")
   console.log("------- LP Handler Initialised -------")
   return
}
deploy();

// initTokenRegistry(dd);