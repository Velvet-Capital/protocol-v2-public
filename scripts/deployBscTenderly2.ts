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

    console.log("---------------------- DEPLOYMENT STARTED PART 2 ---------------------");

    // ------------------------------------------------------------------------------------------------------------------------ //

    // Deploy Token Registry

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    const tokenRegistry = await upgrades.deployProxy(
        TokenRegistry,[inputData.protocolFee,inputData._protocolFeeBottomConstraint,inputData.maxAssetManagerFee,inputData.maxPerformanceFee,inputData._maxEntryFee,inputData._maxExitFee,inputData.minInvestmentAmount,inputData.maxInvestmentAmount,inputData.velvetTreasury,inputData.wBNB,inputData.cooldownPeriod], { kind: "uups" });
    await tokenRegistry.deployed();
    console.log("Deployed TokenRegistry at: ",tokenRegistry.address);
    deployedAddress.TokenRegistry = tokenRegistry.address;

   await initTokenRegistry(dd);

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
            _tokenRegistry: dd.TokenRegistry,
            _velvetProtocolFee: inputData.protocolFee,
            _maxInvestmentAmount: inputData.maxInvestmentAmount,
            _minInvestmentAmount: inputData.minInvestmentAmount,
          },], { kind: "uups" });
    await indexFactory.deployed();
    console.log("Deployed IndexFactory at: ", indexFactory.address);
    deployedAddress.IndexFactory = indexFactory.address;
    console.log("The deployed contracts are: ", deployedAddress);

    console.log("---------------------- DEPLOYMENT ENDED PART 2 ---------------------");
  }catch(e){
    console.log(e);
    console.log("The deployed contracts are: ", deployedAddress);
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

  const tx1 = await tokenRegistryContract.enableToken(priceOracleArray,addressArray,handlerArray,rewardArray,primaryArray);
  tx1.wait(2);

  console.log("Enabled Tokens In TokenRegistry Part 1");

  var priceOracleArray =[]
  var tokenArray = [];
  var addressArray = [];
  var handlerArray = [];
  var primaryArray = [];
  var rewardArray =[];
  
  for (let i = 0; i < pancakeLPTokens.length; i++) {
    
    const object = pancakeLPTokens[i];
    tokenArray.push(object.token);
    addressArray.push(object.address);
    handlerArray.push(_deployedAddress[object.handler]);
    primaryArray.push(object.primary);
    rewardArray.push([object.rewardToken]);
    priceOracleArray.push(_deployedAddress.PriceOracle)
  }

  const tx11 = await tokenRegistryContract.enableToken(priceOracleArray,addressArray,handlerArray,rewardArray,primaryArray);
  tx11.wait(2);

  console.log("Enabled Tokens In TokenRegistry Part 2");


  for(let i =0 ;i <rewardTokens.length;i++){
   const txI = await tokenRegistryContract.addRewardToken(rewardTokens[i]);
   txI.wait(4);
  }

  console.log("Enabled Reward Tokens");
  
  const tx4 = await tokenRegistryContract.enablePermittedTokens(permittedTokens, [_deployedAddress.PriceOracle, _deployedAddress.PriceOracle, _deployedAddress.PriceOracle])
  tx4.wait(2);
  console.log("Enabled Permitted Token")
  const tx6 = await tokenRegistryContract.enableSwapHandlers([_deployedAddress.SwapHandler]);
  tx6.wait(2);
  console.log("Enabled Swap Handlers")
  const tx7 = await tokenRegistryContract.enableExternalSwapHandler(_deployedAddress.OneInchSwapHandler);
  tx7.wait(2);
  console.log("Enabled 1Inch External Swap Handler")
  const tx8 = await tokenRegistryContract.enableExternalSwapHandler(_deployedAddress.ZeroExSwapHandler);
  tx8.wait(2);
  console.log("Enabled ZeroEx External Swap Handler")
  const tx9 = await tokenRegistryContract.enableExternalSwapHandler(_deployedAddress.ParaswapHandler);
  tx9.wait(2);
  console.log("Enabled Paraswap External Swap Handler")
  const tx10 =await tokenRegistryContract.addNonDerivative(_deployedAddress.WombatHandler);
  tx10.wait(2);
  console.log("Enabled Wombat Non Derivative Handler")

  console.log("------- TokenRegistry Initializing Completed -------")
  return

}

async function transferOwnership(){
  const IndexSwapLibraryDefault = await ethers.getContractFactory("IndexSwapLibrary");
  const indexSwapLibrary = await IndexSwapLibraryDefault.attach(dd.IndexSwapLibrary)
  console.log("Transferred Ownership Of IndexSwapLibrary ");

  const FeeLibrary = await ethers.getContractFactory("FeeLibrary");
  const feeLibrary = await FeeLibrary.attach(dd.FeeLibrary)
  console.log("Transferred Ownership Of FeeLibrary");

  const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary",
    {
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    }
  );
  const rebalanceLibrary = await RebalanceLibrary.attach(dd.RebalanceLibrary);
  console.log("Transferred Ownership Of RebalanceLibrary");

  // ------------------------------------------------------------------------------------------------------------------------ //

  const OffChainRebalance = await ethers.getContractFactory("OffChainRebalance",{ 
      libraries: {
        RebalanceLibrary: rebalanceLibrary.address,
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    }
  );
  const offChainRebalanceDefault = await OffChainRebalance.attach(dd.BaseOffChainRebalance);
  const tx1 = await offChainRebalanceDefault.transfer
  console.log("Transferred Ownership Of OffChainRebalance");

  const RebalanceAggregator = await ethers.getContractFactory("RebalanceAggregator",{ 
    libraries : {
      RebalanceLibrary: rebalanceLibrary.address,
    }
  });
  const rebalanceAggregatorDefault = await RebalanceAggregator.deploy();
  console.log("Deployed BaseRebalanceAggregator at: ",rebalanceAggregatorDefault.address);

  const Exchange = await ethers.getContractFactory("Exchange",{
    libraries: {
    IndexSwapLibrary: indexSwapLibrary.address
  },
  }); //Deploy BaseExchange 
  const exchangeDefault = await Exchange.deploy();
  console.log("Deployed BaseExchange at: ", exchangeDefault.address);

  const IndexSwap = await ethers.getContractFactory("IndexSwap", { //Deploy BaseIndexSwap
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });
  const indexSwapDefault = await IndexSwap.deploy();
  console.log("Deployed BaseIndexSwap at: ", indexSwapDefault.address);

  const Rebalancing = await ethers.getContractFactory("Rebalancing", { //Deploy BaseRebalancing
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
        RebalanceLibrary: rebalanceLibrary.address,
      },
    });
  const rebalancingDefault = await Rebalancing.deploy();
  console.log("Deployed BaseRebalancing at: ", rebalancingDefault.address);

  const AssetManagerConfigDefault = await ethers.getContractFactory("AssetManagerConfig"); //Deploy BaseAssetManagerConfig
  const assetManagerConfigDefault = await AssetManagerConfigDefault.deploy();
  console.log("Deployed baseAssetManagerConfig at: ", assetManagerConfigDefault.address);

  const FeeModule = await ethers.getContractFactory("FeeModule", {     //Deploy FeeModule
    libraries: {
      FeeLibrary: feeLibrary.address,
      IndexSwapLibrary: indexSwapLibrary.address,
    },
  });
  const feeModuleDefault = await FeeModule.deploy();
  console.log("Deployed FeeModule at: ", feeModuleDefault.address);

  const offChainIndex = await ethers.getContractFactory(
    "OffChainIndexSwap",
    {
      libraries: {
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    }
  );
  const offChainIndexSwapDefault = await offChainIndex.deploy();
  console.log("Deployed OffChainIndexSwap at: ", offChainIndexSwapDefault.address);

  const VelvetSafeModule = await ethers.getContractFactory("VelvetSafeModule");
  const velvetSafeModule = await VelvetSafeModule.deploy();
  console.log("Deployed OffChainIndexSwap at: ", velvetSafeModule.address);


// ------------------------------------------------------------------------------------------------------------------------ //
  // Deploy Price Oracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  console.log("Deployed PriceOracle at: ",priceOracle.address);

// ------------------------------------------------------------------------------------------------------------------------ //
   //Deploy SwapHandler
   const PancakeSwapHandler = await ethers.getContractFactory(
      "PancakeSwapHandler"
    );
    const swapHandler = await PancakeSwapHandler.deploy();
    console.log("Deployed SwapHandler at: ", swapHandler.address);
// ------------------------------------------------------------------------------------------------------------------------ //
  //Deploy Handlers

  const BaseHandler = await ethers.getContractFactory("BaseHandler"); //Deploy Base Handler
  const baseHandler = await BaseHandler.deploy();
  console.log("Deployed BaseHandler at: ", baseHandler.address);


  const VenusHandler = await ethers.getContractFactory("VenusHandler"); //Deploy Venus Handler
  const venusHandler:any = await VenusHandler.deploy();
  console.log("Deployed VenusHandler at: ", venusHandler.address);

  const AlpacaHandler = await ethers.getContractFactory("AlpacaHandler"); //Deploy Alpaca Handler
  const alpacaHandler = await AlpacaHandler.deploy();
  console.log("Deployed AlpacaHandler at: ", alpacaHandler.address);



  const PancakeSwapLPHandler = await ethers.getContractFactory("PancakeSwapLPHandler"); //Deploy PancakeSwapLP Handler
  const pancakeSwapLPHandler = await PancakeSwapLPHandler.deploy("0x183925bFCC9f7c0ACbEa8f9e8Ff8DfB55a5ead70");
  console.log("Deployed PancakeSwapLPHandler at: ", pancakeSwapLPHandler.address);



  const BiSwapLPHandler = await ethers.getContractFactory("BiSwapLPHandler"); //Deploy BiSwapLP Handler
  const biSwapLPHandler = await BiSwapLPHandler.deploy("0x183925bFCC9f7c0ACbEa8f9e8Ff8DfB55a5ead70");
  console.log("Deployed BiswapLPHandler at: ", biSwapLPHandler.address);



  const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler"); //Deploy ApeSwapLP Handler
  const apeSwapLPHandler = await ApeSwapLPHandler.deploy("0x183925bFCC9f7c0ACbEa8f9e8Ff8DfB55a5ead70")
  console.log("Deployed ApeSwapLPHandler at: ", apeSwapLPHandler.address);



  const WombatHandler = await ethers.getContractFactory("WombatHandler"); //Deploy Wombat Handler
  const wombatHandler = await WombatHandler.deploy()
  console.log("Deployed WombatHandler at: ", wombatHandler.address);


  const ApeSwapLendingHandler = await ethers.getContractFactory("ApeSwapLendingHandler"); //Deploy ApeSwapLending Handler
  const apeSwapLendingHandler = await ApeSwapLendingHandler.deploy()
  console.log("Deployed ApeSwapLendingHandler at: ", apeSwapLendingHandler.address);


  const BeefyHandler = await ethers.getContractFactory("BeefyHandler"); //Deploy Beefy Handler
  const beefyHandler = await BeefyHandler.deploy();
  console.log("Deployed BeefyLPHandler at: ", beefyHandler.address);


  const BeefyLPHandler = await ethers.getContractFactory("BeefyLPHandler"); //Deploy Beefy Handler
  const beefyLPHandler = await BeefyLPHandler.deploy(pancakeSwapLPHandler.address,"0x183925bFCC9f7c0ACbEa8f9e8Ff8DfB55a5ead70");
  console.log("Deployed BeefyLPHandler at: ", beefyLPHandler.address);


  const ZeroExSwapHandler = await ethers.getContractFactory("ZeroExHandler");
  const zeroExHandler = await ZeroExSwapHandler.deploy()
  console.log("Deployed ZeroExSwapHandler at: ", zeroExHandler.address);


  const OneInchSwapHandler = await ethers.getContractFactory("OneInchHandler");
  const oneInchHandler = await OneInchSwapHandler.deploy()
  console.log("Deployed OneInchSwapHandler at: ", oneInchHandler.address);


  const ParaswapHandler = await ethers.getContractFactory("ParaswapHandler");
  const paraswapHandler = await ParaswapHandler.deploy()
  console.log("Deployed ParaswapHandler at: ", paraswapHandler.address);

}

deploy();
