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

import { inputData, priceOracleInfo,tokenRegistryTokenInfo, tokenRegistryTokenInfo3April ,tokenRegistryInfo3April2, apeswapLendingTokens, apeswapLPTokens, liqeeTokens, venusTokens, allTokenList, beefyTokens,allTokenListUnfiltered,permittedTokens, rewardTokens, pancakeLPTokens} from "./deploymentInputs";
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
    const indexSwapLibrary = IndexSwapLibraryDefault.attach("0x99d571EbE3FE3D6b3E272cd1d0c403Ec8E17A877");
    // const indexSwapLibrary = await IndexSwapLibraryDefault.deploy();
    // await indexSwapLibrary.deployed();
    console.log("Deployed IndexSwapLibrary at: ", "0x99d571EbE3FE3D6b3E272cd1d0c403Ec8E17A877");
    deployedAddress.IndexSwapLibrary = "0x99d571EbE3FE3D6b3E272cd1d0c403Ec8E17A877";

    // await tenderly.verify({
    //   name: "IndexSwapLibrary",
    //   address: "0x99d571EbE3FE3D6b3E272cd1d0c403Ec8E17A877",
    // });

    //Deploy FeeLibrary
    const FeeLibrary = await ethers.getContractFactory("FeeLibrary");
    const feeLibrary = FeeLibrary.attach("0x2A0Ad6c219BE645296E15aF4098fd37f13035fa0")
    // const feeLibrary = await FeeLibrary.deploy();
    // await feeLibrary.deployed();
    console.log("Deployed FeeLibrary at: ", "0x2A0Ad6c219BE645296E15aF4098fd37f13035fa0");
    deployedAddress.FeeLibrary = "0x2A0Ad6c219BE645296E15aF4098fd37f13035fa0";

    // await tenderly.verify({
    //   name: "FeeLibrary",
    //   address: "0x2A0Ad6c219BE645296E15aF4098fd37f13035fa0",
    // });

    //Deploy RebalanceLibrary
    const RebalanceLibrary = await ethers.getContractFactory("RebalanceLibrary",
      {
        libraries: {
          IndexSwapLibrary: "0x2A0Ad6c219BE645296E15aF4098fd37f13035fa0",
        },
      }
    );
    // const rebalanceLibrary = await RebalanceLibrary.deploy();
    // await rebalanceLibrary.deployed();
    const rebalanceLibrary = RebalanceLibrary.attach("0x971135ACe2fDeD26354D1EB02A555e173DDC06D9");
    console.log("Deployed RebalanceLibrary at: ", "0x971135ACe2fDeD26354D1EB02A555e173DDC06D9");
    deployedAddress.RebalanceLibrary = "0x971135ACe2fDeD26354D1EB02A555e173DDC06D9";

    // await tenderly.verify({
    //   name: "RebalanceLibrary",
    //   address: rebalanceLibrary.address,
    //   libraries: {
    //     IndexSwapLibrary: indexSwapLibrary.address,
    //   },
    // });

// ------------------------------------------------------------------------------------------------------------------------ //
    //Deploying Base Contracts 

    const OffChainRebalance = await ethers.getContractFactory("OffChainRebalance",{  //Deploy BaseOffChainRebalance
        libraries: {
          RebalanceLibrary: rebalanceLibrary.address,
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      }
    );
    const offChainRebalanceDefault = OffChainRebalance.attach("0x59036d67CbD30C31feb6155e2B50a98f6eE13d32");
    // const offChainRebalanceDefault = await OffChainRebalance.deploy();
    // const 
    // await offChainRebalanceDefault.deployed();
    console.log("Deployed BaseOffChainRebalance at: ", offChainRebalanceDefault.address);
    deployedAddress.BaseOffChainRebalance = offChainRebalanceDefault.address;

    // await tenderly.verify({
    //   name: "OffChainRebalance",
    //   address: offChainRebalanceDefault.address,
    //   libraries: {
    //     RebalanceLibrary: rebalanceLibrary.address,
    //     IndexSwapLibrary: indexSwapLibrary.address,
    //   },
    // });
  
    const RebalanceAggregator = await ethers.getContractFactory("RebalanceAggregator",{ //Deploy BaseRebalanceAggregator
      libraries : {
        RebalanceLibrary: rebalanceLibrary.address,
      }
    });
    const rebalanceAggregatorDefault = RebalanceAggregator.attach("0x81d0837F2b34872aD7945e8D7f74c1B212927D9D");
    // const rebalanceAggregatorDefault = await RebalanceAggregator.deploy();
    // await rebalanceAggregatorDefault.deployed();
    console.log("Deployed BaseRebalanceAggregator at: ",rebalanceAggregatorDefault.address);
    deployedAddress.BaseRebalanceAggregator = rebalanceAggregatorDefault.address;

    // await tenderly.verify({
    //   name: "RebalanceAggregator",
    //   address: rebalanceAggregatorDefault.address,
    //   libraries: {
    //     RebalanceLibrary: rebalanceLibrary.address,
    //   },
    // });

  
    const Exchange = await ethers.getContractFactory("Exchange",{
      libraries: {
      IndexSwapLibrary: indexSwapLibrary.address
    },
    }); //Deploy BaseExchange 
    const exchangeDefault = Exchange.attach("0x4F8a9E29daE00e6d4FD8611954DF3151ae637C05");
    // const exchangeDefault = await Exchange.deploy();
    // await exchangeDefault.deployed();
    console.log("Deployed BaseExchange at: ", exchangeDefault.address);
    deployedAddress.BaseExchange = exchangeDefault.address;

    // await tenderly.verify({
    //   name: "Exchange",
    //   address: exchangeDefault.address,
    //   libraries: {
    //     IndexSwapLibrary: indexSwapLibrary.address
    //   },
    // });

    const IndexSwap = await ethers.getContractFactory("IndexSwap", { //Deploy BaseIndexSwap
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const indexSwapDefault = IndexSwap.attach("0x7319601B1A7ed090Ad1da8cb0D5377F076720e8a");
    // const indexSwapDefault = await IndexSwap.deploy();
    // await indexSwapDefault.deployed();
    console.log("Deployed BaseIndexSwap at: ", indexSwapDefault.address);
    deployedAddress.BaseIndexSwap = indexSwapDefault.address;

    // await tenderly.verify({
    //   name: "IndexSwap",
    //   address: indexSwapDefault.address,
    //   libraries: {
    //     IndexSwapLibrary: indexSwapLibrary.address
    //   },
    // });

    const Rebalancing = await ethers.getContractFactory("Rebalancing", { //Deploy BaseRebalancing
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
          RebalanceLibrary: rebalanceLibrary.address,
        },
      });
      const rebalancingDefault = Rebalancing.attach("0xE9861586021C64cF01adC9CFd74B977176b853bB")
    // const rebalancingDefault = await Rebalancing.deploy();
    // await rebalancingDefault.deployed();
    console.log("Deployed BaseRebalancing at: ", rebalancingDefault.address);
    deployedAddress.BaseRebalance = rebalancingDefault.address;

    // await tenderly.verify({
    //   name: "Rebalancing",
    //   address: rebalancingDefault.address,
    //   libraries: {
    //     IndexSwapLibrary: indexSwapLibrary.address,
    //     RebalanceLibrary: rebalanceLibrary.address,
    //   },
    // });

    const AssetManagerConfigDefault = await ethers.getContractFactory("AssetManagerConfig"); //Deploy BaseAssetManagerConfig
    const assetManagerConfigDefault = AssetManagerConfigDefault.attach("0xc0F736dcFaa7292C7454b2f4C24c336A8dF8a810");
    // const assetManagerConfigDefault = await AssetManagerConfigDefault.deploy();
    // await assetManagerConfigDefault.deployed();
    console.log("Deployed baseAssetManagerConfig at: ", assetManagerConfigDefault.address);
    deployedAddress.BaseAssetManagerConfig = assetManagerConfigDefault.address;

    // await tenderly.verify({
    //   name: "AssetManagerConfig",
    //   address: assetManagerConfigDefault.address,
    // });

    const FeeModule = await ethers.getContractFactory("FeeModule", {     //Deploy FeeModule
      libraries: {
        FeeLibrary: feeLibrary.address,
        IndexSwapLibrary: indexSwapLibrary.address,
      },
    });
    const feeModuleDefault = FeeModule.attach("0x57d3c67Ff92D5f38644BB02770a437B5CA4c51f7");
    // const feeModuleDefault = await FeeModule.deploy();
    // await feeModuleDefault.deployed();
    console.log("Deployed FeeModule at: ", feeModuleDefault.address);
    deployedAddress.BaseFeeModule = feeModuleDefault.address;

    // await tenderly.verify({
    //   name: "FeeModule",
    //   address: feeModuleDefault.address,
    //   libraries: {
    //     FeeLibrary: feeLibrary.address,
    //     IndexSwapLibrary: indexSwapLibrary.address,
    //   },
    // });

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
    const priceOracle = await PriceOracle.deploy("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1");
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
      const tx5 = await swapHandlerContract.init(inputData.pancakeSwapRouterAddress,priceOracle.address);
      tx5.wait(2);
// ------------------------------------------------------------------------------------------------------------------------ //
    //Deploy Handlers

    const BaseHandler = await ethers.getContractFactory("BaseHandler"); //Deploy Base Handler
    const baseHandler = await BaseHandler.deploy(priceOracle.address);
    await baseHandler.deployed();
    console.log("Deployed BaseHandler at: ", baseHandler.address);
    deployedAddress.BaseHandler = baseHandler.address;

    await tenderly.verify({
      name: "BaseHandler",
      address: baseHandler.address,
    });

    // const VenusHandler = await ethers.getContractFactory("VenusHandler"); //Deploy Venus Handler
    // const venusHandler:any = await VenusHandler.deploy(priceOracle.address);
    // await venusHandler.deployed();
    // console.log("Deployed VenusHandler at: ", venusHandler.address);
    // deployedAddress.VenusHandler = venusHandler.address;

    // await tenderly.verify({
    //   name: "VenusHandler",
    //   address: venusHandler.address,
    // });


    const AaveHandler = await ethers.getContractFactory("AaveHandler_v3"); //Deploy Venus Handler
    const aaveHandler:any = await AaveHandler.deploy(priceOracle.address);
    await aaveHandler.deployed();
    console.log("Deployed AaveHandler_v3 at: ", aaveHandler.address);
    deployedAddress.AaveHandler = aaveHandler.address;

    await tenderly.verify({
      name: "AaveHandler_v3",
      address: aaveHandler.address,
    });

    const CompoundHandler = await ethers.getContractFactory("CompoundHandler_v3"); //Deploy Venus Handler
    const compoundHandler:any = await CompoundHandler.deploy(priceOracle.address);
    await compoundHandler.deployed();
    console.log("Deployed CompoundHandler_v3 at: ", compoundHandler.address);
    deployedAddress.CompoundHandler = compoundHandler.address;

    await tenderly.verify({
      name: "CompoundHandler_v3",
      address: compoundHandler.address,
    });


    const SushiSwapLPHandler = await ethers.getContractFactory("SushiSwapLPHandler"); //Deploy PancakeSwapLP Handler
    const sushiSwapLPHandler = await SushiSwapLPHandler.deploy(priceOracle.address);
    await sushiSwapLPHandler.deployed();
    console.log("Deployed PancakeSwapLPHandler at: ", sushiSwapLPHandler.address);
    deployedAddress.SushiSwapLPHandler = sushiSwapLPHandler.address;
    await tenderly.verify({
      name: "SushiSwapLPHandler",
      address: sushiSwapLPHandler.address,
    });


    const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler"); //Deploy ApeSwapLP Handler
    const apeSwapLPHandler = await ApeSwapLPHandler.deploy(priceOracle.address,"0x7d13268144adcdbEBDf94F654085CC15502849Ff")
    await apeSwapLPHandler.deployed();
    console.log("Deployed ApeSwapLPHandler at: ", apeSwapLPHandler.address);
    deployedAddress.ApeSwapLPHandler = apeSwapLPHandler.address;

    await tenderly.verify({
      name: "ApeSwapLPHandler",
      address: apeSwapLPHandler.address,
    });

    const WombatHandler = await ethers.getContractFactory("WombatHandler"); //Deploy Wombat Handler
    const wombatHandler = await WombatHandler.deploy(priceOracle.address,"0x62A83C6791A3d7950D823BB71a38e47252b6b6F4","0xc4B2F992496376C6127e73F1211450322E580668")
    await wombatHandler.deployed();
    console.log("Deployed WombatHandler at: ", wombatHandler.address);
    deployedAddress.WombatHandler = wombatHandler.address;

    await tenderly.verify({
      name: "WombatHandler",
      address: wombatHandler.address,
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
    const tx22 = await zeroExHandler.attach(zeroExHandler.address).addOrUpdateProtocolSlippage("300");
    tx22.wait(2);

    console.log("ZeroExSwapHandler initialised");


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
    await delay(1000);
    const tx23 = await oneInchHandler.attach(oneInchHandler.address).addOrUpdateProtocolSlippage("300");
    tx23.wait(2);
    await delay(1000);
    console.log("oneInchHandler initialised");

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
    await delay(1000);
    const tx24 = await paraswapHandler.attach(paraswapHandler.address).addOrUpdateProtocolSlippage("300");
    tx24.wait(2);
    await delay(1000);
    console.log("paraswapHandler initialised");
    await delay(1000);

    await initLPHandler(deployedAddress); // Set LP slippage for the handlers

    fs.writeFileSync('scripts/HandlerData.json', JSON.stringify(deployedAddress));
// ------------------------------------------------------------------------------------------------------------------------ //

  }catch(e){
    console.log(e);
    fs.writeFileSync('scripts/deploymentData.json', JSON.stringify(deployedAddress));
    console.log("The deployed contracts are: ", deployedAddress);
  }
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

async function initPriceOracle(_deployedAddress:any,_priceOracleData:any){
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracleContract = await PriceOracle.attach(_deployedAddress.PriceOracle);
  console.log("priceOracleContract",priceOracleContract);

  console.log("------- Initializing in PriceOracle -------")

let tokenArray = [];
let quoteArray = [];
let aggregatorArray = []

//   const tokenArray = [
//   "0x74885b4D524d497261259B38900f54e6dbAd2210",
//   "0xB20A02dfFb172C474BC4bDa3fD6f4eE70C04daf2",
//   "0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429",
//   "0xba5DdD1f9d7F570dc94a51479a000E3BCE967196",
//   "0xaAFcFD42c9954C6689ef1901e03db742520829c5",
//   "0xe018C7a3d175Fb0fE15D70Da2c874d3CA16313EC",
//   "0x354A6dA3fcde098F8389cad84b0182725c6C91dE",
//   "0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8",
//   "0x7468a5d8E02245B00E8C0217fCE021C70Bc51305",
//   "0x82e3A8F066a6989666b031d916c43672085b1582",
//   "0x31190254504622cEFdFA55a7d3d272e6462629a2",
//   "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
//   "0xb74Da9FE2F96B9E0a5f4A3cf0b92dd2bEC617124",
//   "0xe88998Fb579266628aF6a03e3821d5983e5D0089",
//   "0x561877b6b3DD7651313794e5F2894B2F18bE0766",
//   "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
//   "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
//   "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
//   "0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF",
//   "0xd9f9d2Ee2d3EFE420699079f16D9e924affFdEA4",
//   "0x6c2c06790b3e3e3c38e12ee22f8183b37a13ee55",
//   "0x539bde0d7dbd336b79148aa742883198bbf60342",
//   "0x5979D7b546E38E414F7E9822514be443A4800529",
//   "0x371c7ec6D8039ff7933a2AA28EB827Ffe1F52f07",
//   "0x155f0dd04424939368972f4e1838687d6a831151",
//   "0x69eb4fa4a2fbd498c257c57ea8b7655a2559a581",
//   "0x680447595e8b7b3Aa1B43beB9f6098C79ac2Ab3f",
//   "0x6314C31A7a1652cE482cffe247E9CB7c3f4BB9aF"];
//   const quoteArray = [
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348",
//   "0x0000000000000000000000000000000000000348"];
//   const aggregatorArray = [
//   "0x221912ce795669f628c51c69b7d0873eDA9C03bB",
//   "0x87121F6c9A9F6E90E59591E4Cf4804873f54A95b",
//   "0x2BA975D4D7922cD264267Af16F3bD177F206FE3c",
//   "0xaD1d5344AaDE45F43E596773Bcc4c423EAbdD034",
//   "0x851175a919f36c8e30197c09a9A49dA932c2CC00",
//   "0xe74d69E233faB0d8F48921f2D93aDfDe44cEb3B7",
//   "0xe7C53FFd03Eb6ceF7d208bC4C13446c76d1E5884",
//   "0xBE5eA816870D11239c543F84b71439511D70B94f",
//   "0x0809E3d38d1B4214958faf06D8b1B1a2b73f2ab8",
//   "0x745Ab5b69E01E2BE1104Ca84937Bb71f96f5fB21",
//   "0x8FCb0F3715A82D83270777b3a5f3a7CF95Ce8Eec",
//   "0xaebDA2c976cfd1eE1977Eac079B4382acb849325",
//   "0x24ceA4b8ce57cdA5058b924B9B9987992450590c",
//   "0x5B58aA6E0651Ae311864876A55411F481aD86080",
//   "0x52099D4523531f678Dfc568a7B1e5038aadcE1d6",
//   "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
//   "0xd0C7101eACbB49F3deCcCc166d238410D6D46d57",
//   "0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720",
//   "0x383b3624478124697BEF675F07cA37570b73992f",
//   "0x36a121448D74Fa81450c992A1a44B9b7377CD3a5",
//   "0xc373B9DB0707fD451Bc56bA5E9b029ba26629DF0",
//   "0x47E55cCec6582838E173f252D08Afd8116c2202d",
//   "0x07C5b924399cc23c24a95c8743DE4006a32b7f2a",
//   "0x04180965a782E487d0632013ABa488A472243542",
//   "0x9A7FB1b3950837a8D9b40517626E11D4127C098C",
//   "0xA33a06c119EC08F92735F9ccA37e07Af08C4f281",
//   "0x4Ee1f9ec1048979930aC832a3C1d18a0b4955a02",
//   "0x4bC735Ef24bf286983024CAd5D03f0738865Aaef"];

    for(const item of _priceOracleData){
      tokenArray.push(item.address[0]);
      quoteArray.push(item.address[0]);
      aggregatorArray.push(item.address[2]);
      console.log("Added Token In Array:", item.token);
   }
  //  const tx = await priceOracleContract._addFeed(tokenArray,quoteArray,aggregatorArray);

    for(const item of _priceOracleData){
      console.log("item.address[0]",item.address[0]);
      console.log("item.address[2]",item.address[2]);
      const tx = await priceOracleContract._addFeed([item.address[0]],[item.address[1]],[item.address[2]]);
      tx.wait(3);
    }
      

  console.log("------- PriceOracle Initialized -------")
   return
}

async function initLPHandler(_deployedAddress:any){
  console.log("------- Initializing in LP Handler -------")

  const SushiSwapLPHandler = await ethers.getContractFactory("SushiSwapLPHandler");
  const ApeSwapLPHandler = await ethers.getContractFactory("ApeSwapLPHandler");
  const WombatHandler = await ethers.getContractFactory("WombatHandler");

  const pancakeLpHandler = await SushiSwapLPHandler.attach(_deployedAddress.SushiSwapLPHandler);
  const apeSwapLPHandler = await ApeSwapLPHandler.attach(_deployedAddress.ApeSwapLPHandler);
  const wombatHandler = await WombatHandler.attach(_deployedAddress.WombatHandler);

  const tx = await pancakeLpHandler.addOrUpdateProtocolSlippage("2500")
   tx.wait(4);
   console.log("PancakeSwapLP Slippage set at 25% Max")
  const tx3 = await apeSwapLPHandler.addOrUpdateProtocolSlippage("2500")
   tx3.wait(4);
   console.log("ApeSwapLP Slippage set at 25% Max")
  const tx4 = await wombatHandler.addOrUpdateProtocolSlippage("2500")
   tx4.wait(4);
   console.log("WombatLP Slippage set at 25% Max")
   console.log("------- LP Handler Initialised -------")
   return;
}

async function deployUIDataPoint(){
  // const UIDATA = await ethers.getContractFactory("UIDataPoint", {libraries: {
  //     IndexSwapLibrary: "0x99d571EbE3FE3D6b3E272cd1d0c403Ec8E17A877",
  //     RebalanceLibrary: "0x971135ACe2fDeD26354D1EB02A555e173DDC06D9"
  //   }},);
  //   const uidata = await UIDATA.deploy("0x831c2345BfA6B4F976508F5442701bda9c057C38",{gasPrice: 3000000000});
  //   await uidata.deployed()
  //   console.log(uidata.address);

  // const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
  // const tokenRegistryContract = await TokenRegistry.attach("0x831c2345BfA6B4F976508F5442701bda9c057C38");

  // await tokenRegistryContract.setCoolDownPeriod("60",{gasPrice: 3000000000});
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
  const tx5 = await swapHandlerContract.init(inputData.pancakeSwapRouterAddress,"0xccEc83a1f352fA2F78CfaD5FF9cc3680B8F3C9A9");
  tx5.wait(2);
  console.log("Done");
}

deployUIDataPoint();

// initTokenRegistry(dd);

// async function deployRebalance(){
//   const Rebalancing = await ethers.getContractFactory("Rebalancing", { //Deploy BaseRebalancing
//     libraries: {
//       IndexSwapLibrary: dd.IndexSwapLibrary,
//       RebalanceLibrary: dd.RebalanceLibrary,
//     },
//   });
// const rebalancingDefault = await Rebalancing.deploy();
// await rebalancingDefault.deployed();
// console.log("Deployed NewBaseRebalancing at: ", rebalancingDefault.address);

// await tenderly.verify({
//   name: "Rebalancing",
//   address: rebalancingDefault.address,
//   libraries: {
//     IndexSwapLibrary: dd.IndexSwapLibrary,
//     RebalanceLibrary: dd.RebalanceLibrary,
//   },
// });
// }
// initPriceOracle(dd.PriceOracle,priceOracleData);
// deployRebalance();
// deploy();