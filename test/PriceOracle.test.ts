import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";

import { Exchange, PancakeSwapHandler, PriceOracle, TokenRegistry, VelvetSafeModule } from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";
import { indexSwapLibrary, tokenAddresses, IAddresses, RebalancingDeploy } from "./Deployments.test";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for priceOracle", () => {
  let iaddress: IAddresses;
  let accounts;
  let vaultAddress: string;
  let velvetSafeModule: VelvetSafeModule;
  let tokenRegistry: TokenRegistry;
  let swapHandler: PancakeSwapHandler;
  let exchange: Exchange;
  let priceOracle: PriceOracle;
  //let tokenMetadata: TokenMetadata;
  let treasury: SignerWithAddress;
  let owner: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addrs: SignerWithAddress[];
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for priceOracle contract", () => {
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
      await tokenRegistry.initialize(
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
      );

      const PancakeSwapHandler = await ethers.getContractFactory("PancakeSwapHandler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);
    });

    describe("priceOracle Contract", function () {
      it("should revert if aggregator is already added", async () => {
        await expect(
          priceOracle._addFeed(
            [iaddress.ethAddress],
            [iaddress.wbnbAddress],
            ["0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726"],
          ),
        ).to.be.revertedWithCustomError(priceOracle, "AggregatorAlreadyExists");
      });

      it("Get ETH/WBNB price", async () => {
        const price = await priceOracle.getPrice(iaddress.ethAddress, iaddress.wbnbAddress);
        // console.log(price);
      });

      it("Get BTC/ETH price", async () => {
        const price = await priceOracle.getPrice("0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", iaddress.ethAddress);
        // console.log(price);
      });

      it("Get BUSD/WBNB price", async () => {
        const price = await priceOracle.getPrice(iaddress.busdAddress, iaddress.wbnbAddress);
        // console.log(price);
      });

      it("Get BTC/USD price", async () => {
        const price = await priceOracle.getPrice(
          "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
          "0x0000000000000000000000000000000000000348",
        );
        // console.log(price);
      });

      it("Get BTC/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(
          "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
          "1000000000000000000",
        );
        // console.log(price);
      });

      it("Get ETH/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.ethAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get BUSD/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.busdAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get DAI/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.daiAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get WBNB/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.wbnbAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get DOGE/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.dogeAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get USD/WBNB price", async () => {
        const price = await priceOracle.getUsdEthPrice("1000000000000000000");
        // console.log(price);
      });

      it("Get BTC/WETH price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.btcAddress, "1000000000000000000", true);
        // console.log(price);
      });

      it("Get WETH/BTC price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.btcAddress, "1000000000000000000", false);
        // console.log(price);
      });

      it("Get ETH/WETH price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.ethAddress, "1000000000000000000", true);
        console.log(price);
      });

      it("Get WETH/ETH price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.ethAddress, "1000000000000000000", false);
        // console.log(price);
      });

      it("Get DOGE/WETH price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.dogeAddress, "1000000000000000000", true);
        // console.log(price);
      });

      it("Get WETH/DOGE price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.dogeAddress, "1000000000000000000", false);
        // console.log(price);
      });

      // audit testing
      it("Get USD/DOGE price", async () => {
        console.log("---------- AUDIT TESTING ----------");
        const price = await priceOracle.getPriceUSDToken(iaddress.dogeAddress, "1000000000000000000");
        console.log("1 usd to doge: ", price);
      });

      it("Get DOGE/wbnb price", async () => {
        const price = await priceOracle.getPriceForTokenAmount(iaddress.dogeAddress, iaddress.wbnbAddress, "100000000");
        console.log("1 doge to wbnb: ", price);
      });

      it("Get wbnb/DOGE price", async () => {
        const price = await priceOracle.getPriceForTokenAmount(
          iaddress.wbnbAddress,
          iaddress.dogeAddress,
          "1000000000000000000",
        );
        console.log("1 wbnb to doge: ", price);
      });

      it("Get doge/wbnb price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.dogeAddress, "100000000", true);
        console.log("1 doge to eth: ", price);
      });

      it("Get wbnb/doge price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.dogeAddress, "1000000000000000000", false);
        console.log("1 eth to doge: ", price);
      });
    });
  });
});
