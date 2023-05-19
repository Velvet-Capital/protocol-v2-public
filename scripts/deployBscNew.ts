import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import {
    IndexSwap,
    IndexSwapV2,
    IndexSwap__factory,
    Exchange,
    ExchangeV2,
    TokenRegistryV2,
    Rebalancing__factory,
    AccessController,
    IndexFactory,
    IndexFactoryV2,
    PancakeSwapHandler,
    VelvetSafeModule,
    Vault,
    PriceOracle,
    AssetManagerConfig,
    TokenRegistry
} from "../typechain";

import { inputData, priceOracleInfo,tokenRegistryTokenInfo, tokenRegistryTokenInfo3April ,tokenRegistryInfo3April2, alpacaTokens, apeswapLendingTokens, apeswapLPTokens, liqeeTokens, venusTokens} from "../scripts/deploymentInputs";
import { accessSync } from "fs";

const userInputData = inputData;
const priceOracleData = priceOracleInfo;

const deployedAddress: any ={};

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

    //Deploy ProtocolFee
    const ProtocolFee = await ethers.getContractFactory("ProtocolFee");
    const protocolFee = await ProtocolFee.deploy();
    await protocolFee.deployed();
    console.log("Deployed ProtocolFee at: ", protocolFee.address);
    deployedAddress.ProtocolFee = protocolFee.address;

// ------------------------------------------------------------------------------------------------------------------------ //
    //Deploying Base Contracts 

    const OffChainRebalance = await ethers.getContractFactory("OffChainRebalance",{  //Deploy BaseOffChainRebalance
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      }
    );
    const offChainRebalanceDefault = await OffChainRebalance.deploy();
    await offChainRebalanceDefault.deployed();
    console.log("Deployed BaseOffChainRebalance at: ", offChainRebalanceDefault.address);
    deployedAddress.BaseOffChainRebalance = offChainRebalanceDefault.address;

  
    const RebalanceAggregator = await ethers.getContractFactory("RebalanceAggregator",{ //Deploy BaseRebalanceAggregator
      libraries : {
        IndexSwapLibrary : indexSwapLibrary.address
      }
    });
    const rebalanceAggregatorDefault = await RebalanceAggregator.deploy();
    await rebalanceAggregatorDefault.deployed();
    console.log("Deployed BaseRebalanceAggregator at: ",rebalanceAggregatorDefault.address);
    deployedAddress.BaseRebalanceAggregator = rebalanceAggregatorDefault.address;

  
    const Exchange = await ethers.getContractFactory("Exchange"); //Deploy BaseExchange 
    const exchange = await Exchange.deploy();
    await exchange.deployed();
    console.log("Deployed BaseExchange at: ", exchange.address);
    deployedAddress.BaseExchange = exchange.address;

    const IndexSwap = await ethers.getContractFactory("IndexSwap", { //Deploy BaseIndexSwap
        libraries: {
          ProtocolFee: protocolFee.address,
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
    const indexSwapDefault = await IndexSwap.deploy();
    await indexSwapDefault.deployed();
    console.log("Deployed BaseIndexSwap at: ", indexSwapDefault.address);
    deployedAddress.BaseIndexSwap = indexSwapDefault.address;

    const Rebalancing = await ethers.getContractFactory("Rebalancing", { //Deploy BaseRebalancing
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
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
    deployedAddress.BaseRebalance = assetManagerConfigDefault.address;

 // ------------------------------------------------------------------------------------------------------------------------ //
    // Deploy Price Oracle
//     const PriceOracle = await ethers.getContractFactory("PriceOracle");
//     const priceOracle = await PriceOracle.deploy();
//     await priceOracle.deployed();
//     console.log("Deployed PriceOracle at: ",priceOracle.address);
//     deployedAddress.PriceOracle = priceOracle.address;
//     const priceOracleContract = await PriceOracle.attach(priceOracle.address);

//     console.log("Adding tokens to price oracle: ");

//     for(const item of priceOracleData){
//       const tx = await priceOracleContract._addFeed(item.address[0],item.address[1],item.address[2]);
//       tx.wait(2);
//       console.log("Added :", item.token);
//    }
// ------------------------------------------------------------------------------------------------------------------------ //
     //Deploy SwapHandler
     const PancakeSwapHandler = await ethers.getContractFactory(
        "PancakeSwapHandler"
      );
      const swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();
      console.log("Deployed SwapHandler at: ", swapHandler.address);
      deployedAddress.SwapHandler = swapHandler.address;
      const swapHandlerContract = await PancakeSwapHandler.attach(swapHandler.address);
      const tx5 = await swapHandlerContract.init(inputData.pancakeSwapRouterAddress,"0x70378D151D6203219D5bED3A855026f67815E052");
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

    const LiqeeHandler = await ethers.getContractFactory("LiqeeHandler"); //Deploy Liqee Handler
    const liqeeHandler = await LiqeeHandler.deploy();
    await liqeeHandler.deployed();
    console.log("Deployed LiqeeHandler at: ", liqeeHandler.address);
    deployedAddress.LiqeeHandler = liqeeHandler.address;

    const AlpacaHandler = await ethers.getContractFactory("AlpacaHandler"); //Deploy Alpaca Handler
    const alpacaHandler = await AlpacaHandler.deploy();
    await alpacaHandler.deployed();
    console.log("Deployed AlpacaHandler at: ", alpacaHandler.address);
    deployedAddress.AlpacaHandler = alpacaHandler.address;

    const PancakeSwapLPHandler = await ethers.getContractFactory("PancakeSwapLPHandler"); //Deploy PancakeSwapLP Handler
    const pancakeSwapLPHandler = await PancakeSwapLPHandler.deploy();
    await pancakeSwapLPHandler.deployed();
    console.log("Deployed PancakeSwapLPHandler at: ", pancakeSwapLPHandler.address);
    deployedAddress.PancakeSwapLPHandler = pancakeSwapLPHandler.address;

    // const BiSwapLPHandler = await ethers.getContractFactory("BiSwapLPHandler"); //Deploy BiSwapLP Handler
    // const biSwapLPHandler = await BiSwapLPHandler.deploy();
    // await biSwapLPHandler.deployed();
    // console.log("Deployed BiswapLPHandler at: ", biSwapLPHandler.address);
    // deployedAddress.BiSwapLPHandler = biSwapLPHandler.address;

    // const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler"); //Deploy ApeSwapLP Handler
    // const apeSwapLPHandler = await ApeSwapLPHandler.deploy()
    // await apeSwapLPHandler.deployed();
    // console.log("Deployed ApeSwapLPHandler at: ", apeSwapLPHandler.address);
    // deployedAddress.ApeSwapLPHandler = apeSwapLPHandler.address;

    const WombatHandler = await ethers.getContractFactory("WombatHandler"); //Deploy Wombat Handler
    const wombatHandler = await WombatHandler.deploy()
    await wombatHandler.deployed();
    console.log("Deployed WombatHandler at: ", wombatHandler.address);
    deployedAddress.WombatHandler = wombatHandler.address;

    const ApeSwapLendingHandler = await ethers.getContractFactory("ApeSwapLendingHandler"); //Deploy ApeSwapLending Handler
    const apeSwapLendingHandler = await ApeSwapLendingHandler.deploy()
    await apeSwapLendingHandler.deployed();
    console.log("Deployed ApeSwapLendingHandler at: ", apeSwapLendingHandler.address);
    deployedAddress.ApeSwapLendingHandler = apeSwapLendingHandler.address;

    // const WombexHandler = await ethers.getContractFactory("WombexHandler"); //Deploy Wombex Handler
    // const wombexHandler = await WombexHandler.deploy();
    // await wombexHandler.deployed();
    // console.log("Deployed WombexHandler at: ", wombexHandler.address);
    // deployedAddress.WombexHandler = wombexHandler.address;

    const BeefyHandler = await ethers.getContractFactory("BeefyHandler"); //Deploy Beefy Handler
    const beefyHandler = await BeefyHandler.deploy();
    await beefyHandler.deployed();
    console.log("Deployed BeefyHAndler at: ", beefyHandler.address);
    deployedAddress.BeefyHandler = beefyHandler.address;


    const ZeroExSwapHandler = await ethers.getContractFactory("ZeroExHandler");
    const zeroExHandler = await ZeroExSwapHandler.deploy()
    await zeroExHandler.deployed();
    console.log("Deployed ZeroExSwapHandler at: ", zeroExHandler.address);
    deployedAddress.ZeroExSwapHandler = zeroExHandler.address;
    const tx = await zeroExHandler.attach(zeroExHandler.address).init("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c","0xdef1c0ded9bec7f1a1670819833240f027b25eff");
    tx.wait(2);


    const OneInchSwapHandler = await ethers.getContractFactory("OneInchHandler");
    const oneInchHandler = await OneInchSwapHandler.deploy()
    await oneInchHandler.deployed();
    console.log("Deployed OneInchSwapHandler at: ", oneInchHandler.address);
    deployedAddress.OneInchSwapHandler = oneInchHandler.address;

    const tx2 = await oneInchHandler.attach(oneInchHandler.address).init("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c","0x1111111254EEB25477B68fb85Ed929f73A960582");
    tx2.wait(2);

    // const OpenOceanHandler = await ethers.getContractFactory("OpenOceanHandler");
    // openOceanHandler = await OpenOceanHandler.deploy()
    // await openOceanHandler.deployed();

    // openOceanHandler.init(wbnbInstance.address,"0x6352a56caadC4F1E25CD6c75970Fa768A3304e64");

    const ParaswapHandler = await ethers.getContractFactory("ParaswapHandler");
    const paraswapHandler = await ParaswapHandler.deploy()
    await paraswapHandler.deployed();
    console.log("Deployed ParaswapHandler at: ", paraswapHandler.address);
    deployedAddress.ParaswapHandler = paraswapHandler.address;

    const tx3 = await paraswapHandler.attach(paraswapHandler.address).init("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c","0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57","0x216B4B4Ba9F3e719726886d34a177484278Bfcae");
    tx3.wait(2);
    // ------------------------------------------------------------------------------------------------------------------------ //
    //Deploy Token Registry

    const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
    // const tokenRegistry = await upgrades.deployProxy(
    //     TokenRegistry,[inputData.protocolFee,inputData.maxAssetManagerFee,inputData.maxPerformanceFee,inputData.minInvestmentAmount,inputData.maxInvestmentAmount,inputData.velvetTreasury, inputData.rewardVault], { kind: "uups" });
    // await tokenRegistry.deployed();
    // console.log("Deployed TokenRegistry at: ",tokenRegistry.address);
    // deployedAddress.TokenRegistry = tokenRegistry.address;


    const tokenRegistryContract = await TokenRegistry.attach("0x918Cb0fb0fED3Bb986B52c7f1F5B63d4a9E4518F")
    const tx4 = await tokenRegistryContract.enablePermittedTokens(["0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56","0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c","0x2170Ed0880ac9A755fd29B2688956BD959F933F8","0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"])
    tx4.wait(2);
    const tx6 = await tokenRegistryContract.enableSwapHandlers([swapHandler.address]);
    tx6.wait(2);
    const tx7 = await tokenRegistryContract.enableExternalSwapHandler(oneInchHandler.address);
    tx7.wait(2);
    const tx8 = await tokenRegistryContract.enableExternalSwapHandler(paraswapHandler.address);
    tx8.wait(2);
    const tx9 = await tokenRegistryContract.enableExternalSwapHandler(zeroExHandler.address);
    tx9.wait(2);
    const tx10 =await tokenRegistryContract.addNonDerivative(wombatHandler.address);
    tx10.wait(2);

    // await initializeTokenRegistry(tokenRegistry.address,"0x70378D151D6203219D5bED3A855026f67815E052");
    // const tx5 = await tokenRegistry.
    // Add Tokens to Registry TBD

// ------------------------------------------------------------------------------------------------------------------------ //
    const AccessController = await ethers.getContractFactory("AccessController");
    const accessController = await AccessController.deploy();
    await accessController.deployed();
    console.log("Deployed AccessController at: ",accessController.address);
    deployedAddress.AccessController = accessController.address;

    await delay(1000);

    const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
    const assetManagerConfig = await AssetManagerConfig.deploy();
    await assetManagerConfig.deployed();
    console.log("Deployed AssetManagerConfig at: ",assetManagerConfig.address);
    deployedAddress.AssetManagerConfig = assetManagerConfig.address;  
    
    await delay(1000);
// ------------------------------------------------------------------------------------------------------------------------ //
    const IndexFactory = await ethers.getContractFactory("IndexFactory");
    const indexFactory = await upgrades.deployProxy(
        IndexFactory,[{
        _outAsset: inputData.outAsset,
        _indexSwapLibrary: indexSwapLibrary.address,
        _baseIndexSwapAddress: indexSwapDefault.address,
        _baseRebalancingAddres: rebalancingDefault.address,
        _baseOffChainRebalancingAddress: offChainRebalanceDefault.address,
        _baseRebalanceAggregatorAddress : rebalanceAggregatorDefault.address,
        _baseExchangeHandlerAddress: exchange.address,
        _baseAssetManagerConfigAddress: assetManagerConfig.address,
        _priceOracle: "0x70378D151D6203219D5bED3A855026f67815E052",
        _tokenRegistry: "0x918Cb0fb0fED3Bb986B52c7f1F5B63d4a9E4518F",
        _velvetProtocolFee: inputData.velvetProtocolFee,
        _maxInvestmentAmount: inputData.maxInvestmentAmount,
        _minInvestmentAmount: inputData.minInvestmentAmount,
        }], { kind: "uups" });
    await indexFactory.deployed();
    console.log("Deployed IndexFactory at: ", indexFactory.address);
    deployedAddress.IndexFactory = indexFactory.address;

    console.log("---------------------- DEPLOYMENT ENDED ---------------------");
  }catch(e){
    console.log(e);
    console.log("The deployed contracts are: ", deployedAddress);
  }
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

async function initializeTokenRegistry(_tokenRegistry:string,_priceOracle:string){
  console.log("------- Initializing Tokens In TokenRegistry -------")
  const [deployer,acc1,acc2,acc3,acc4,acc5] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Deployer Balance: ", await ethers.provider.getBalance(deployer.address))

  const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
  const tokenRegistryContract = await TokenRegistry.attach(_tokenRegistry)

  const priceOracleArray =[]
  const tokenArray = [];
  const addressArray = [];
  const handlerArray = [];
  const primaryArray = [];
  const rewardArray =[];
  
  for (let i = 0; i < venusTokens.length; i++) {
    const object = venusTokens[i];
    tokenArray.push(object.token);
    addressArray.push(object.address);
    handlerArray.push(object.handler);
    primaryArray.push(object.primary);
    rewardArray.push([object.rewardToken]);
    priceOracleArray.push(_priceOracle)
  }

  console.log(tokenArray);
  console.log(addressArray);
  console.log(handlerArray);
  console.log(primaryArray);
  console.log(rewardArray);
  console.log(priceOracleArray);
  
  const tx = await tokenRegistryContract.enableToken(priceOracleArray,addressArray,handlerArray,rewardArray,primaryArray);
  // console.log(tx);
  tx.wait(2);
  
  console.log("------- Enabled Tokens In TokenRegistry -------")
}

async function getDeployerInfo(){
  const [deployer,acc1,acc2,acc3,acc4,acc5] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Deployer Balance: ", await ethers.provider.getBalance(deployer.address))
  
  const IndexFactory = await ethers.getContractFactory("IndexFactory");
  const indexFactory = await upgrades.deployProxy(
      IndexFactory,[{
      _outAsset: inputData.outAsset,
      _indexSwapLibrary: "0x53fBDae5B0a040bEdC559f7E18EF37Bf756269E7",
      _baseIndexSwapAddress: "0x7c24228024A8753aCAA6c65ba2A30c55044BbCdE",
      _baseRebalancingAddres: "0x0Ce8cfe7dba4D79166B4FcCc28f0bAeAfcB45FBb",
      _baseOffChainRebalancingAddress: "0xdEc687789678Ff497bE1316575a189aEA1E1E3CC",
      _baseRebalanceAggregatorAddress : "0x4d127f5463BFbD0a969FDA9B3d819979fAFF29fB",
      _baseExchangeHandlerAddress: "0xa91f9AC9C0774Bb10B2851B0083B88eC7E1DcdD0",
      _baseAssetManagerConfigAddress: "0x2610dbC050ef95Be586e18351FFAf10747F41569",
      _priceOracle: "0x70378D151D6203219D5bED3A855026f67815E052",
      _tokenRegistry: "0x918Cb0fb0fED3Bb986B52c7f1F5B63d4a9E4518F",
      _velvetProtocolFee: inputData.velvetProtocolFee,
      _maxInvestmentAmount: inputData.maxInvestmentAmount,
      _minInvestmentAmount: inputData.minInvestmentAmount,
      }], { kind: "uups" });
  await indexFactory.deployed();
  console.log("Deployed IndexFactory at: ", indexFactory.address);
  deployedAddress.IndexFactory = indexFactory.address;

}
// getDeployerInfo();

initializeTokenRegistry("0x918Cb0fb0fED3Bb986B52c7f1F5B63d4a9E4518F","0x70378D151D6203219D5bED3A855026f67815E052");
// deploy();