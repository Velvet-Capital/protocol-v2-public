import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";

import { Exchange, UniswapV2Handler, PriceOracle, TokenRegistry, VelvetSafeModule } from "../../typechain";

import { chainIdToAddresses } from "../../scripts/networkVariables";
import { indexSwapLibrary, tokenAddresses, IAddresses, priceOracle } from "./Deployments.test";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for priceOracle", () => {
  let iaddress: IAddresses;
  let accounts;
  let vaultAddress: string;
  let velvetSafeModule: VelvetSafeModule;
  let tokenRegistry: TokenRegistry;
  let swapHandler: UniswapV2Handler;
  let exchange: Exchange;
  // let priceOracle: PriceOracle;
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
  const chainId: any = forkChainId ? forkChainId : 42161;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for priceOracle contract", () => {
    before(async () => {

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();

      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, addr1, addr2, treasury, ...addrs] = accounts;

      iaddress = await tokenAddresses(priceOracle.address, true);
      await tokenRegistry.initialize(
        "3000000000000000000",
        "120000000000000000000000",
        treasury.address,
        addresses.WETH,
      );

      const PancakeSwapHandler = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler = await PancakeSwapHandler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.SushiSwapRouterAddress, priceOracle.address);

      // const wethPrice = await priceOracle.getPrice(addresses.WETH, "0x0000000000000000000000000000000000000348");
      // const usdtPrice = await priceOracle.getPrice(addresses.USDT, "0x0000000000000000000000000000000000000348");
      // const dogePrice = await priceOracle.getPrice(addresses.ADoge, "0x0000000000000000000000000000000000000348");
      // const normalPrice = await priceOracle.getPrice(
      //   "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      //   "0x0000000000000000000000000000000000000348",
      // );
      // console.log("wethPrice", wethPrice);
      // await mockPriceOracle.setMockData(addresses.WETH, wethPrice);
      // await mockPriceOracle.setMockData(addresses.USDT, usdtPrice);
      // await mockPriceOracle.setMockData(addresses.ADoge, "0");
      // await mockPriceOracle.setMockData("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", normalPrice);
    });

    describe("priceOracle Contract", function () {
      it("should revert if aggregator is already added", async () => {
        await expect(
          priceOracle._addFeed(
            [addresses.WETH],
            ["0x0000000000000000000000000000000000000348"],
            ["0x639fe6ab55c921f74e7fac1ee960c0b6293ba612"],
          ),
        ).to.be.revertedWithCustomError(priceOracle, "AggregatorAlreadyExists");
      });

      it("should revert if base array length does not match the length of other arrays", async () => {
        await expect(
          priceOracle._addFeed(
            [iaddress.wethAddress, iaddress.btcAddress],
            [iaddress.arbAddress],
            ["0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726"],
          ),
        ).to.be.revertedWithCustomError(priceOracle, "IncorrectArrayLength");
      });

      it("should revert if quote array length does not match the length of other arrays", async () => {
        await expect(
          priceOracle._addFeed(
            [iaddress.wethAddress, iaddress.btcAddress],
            [iaddress.arbAddress, "0x0000000000000000000000000000000000000348"],
            ["0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726"],
          ),
        ).to.be.revertedWithCustomError(priceOracle, "IncorrectArrayLength");
      });

      it("should revert if quote array length does not match the length of other arrays", async () => {
        await expect(
          priceOracle._addFeed(
            [iaddress.wethAddress],
            [iaddress.arbAddress],
            ["0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726", "0xcBb98864Ef56E9042e7d2efef76141f15731B82f"],
          ),
        ).to.be.revertedWithCustomError(priceOracle, "IncorrectArrayLength");
      });

      it("Get BTC/USD price", async () => {
        const price = await priceOracle.getPrice(addresses.WBTC, "0x0000000000000000000000000000000000000348");
        // console.log(price);
      });

      it("Get BTC/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(addresses.WBTC, "1000000000000000000");
        // console.log(price);
      });

      it("Get ETH/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.wethAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get USDT/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.usdtAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get DAI/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.daiAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get WETH/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.wethAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get DOGE/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD18Decimals(iaddress.dogeAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get USD/WETH price", async () => {
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
        const price = await priceOracle.getPriceForAmount(iaddress.wethAddress, "1000000000000000000", true);
        console.log(price);
      });

      it("Get WETH/ETH price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.wethAddress, "1000000000000000000", false);
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

      it("Get DOGE/weth price", async () => {
        const price = await priceOracle.getPriceForTokenAmount(iaddress.dogeAddress, iaddress.wethAddress, "100000000");
        console.log("1 doge to weth: ", price);
      });

      it("Get weth/DOGE price", async () => {
        const price = await priceOracle.getPriceForTokenAmount(
          iaddress.wethAddress,
          iaddress.dogeAddress,
          "1000000000000000000",
        );
        console.log("1 weth to doge: ", price);
      });

      it("Get doge/weth price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.dogeAddress, "100000000", true);
        console.log("1 doge to eth: ", price);
      });

      it("Get weth/doge price", async () => {
        const price = await priceOracle.getPriceForAmount(iaddress.dogeAddress, "1000000000000000000", false);
        console.log("1 eth to doge: ", price);
      });

      it("Get DOGE price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(iaddress.dogeAddress);
        console.log("1 doge to usd: ", price);
      });

      it("Get USDT price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(iaddress.usdtAddress);
        console.log("1 busd to usd: ", price);
      });

      it("Get ETH price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(iaddress.wethAddress);
        console.log("1 eth to usd: ", price);
      });

      it("Get BTC price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(iaddress.btcAddress);
        console.log("1 btc to usd: ", price);
      });

      it("Get WETH_USDT price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.SushiSwap_WETH_USDT);
        console.log("1 WETH_USDT to usd: ", price);
      });

      it("Get WETH_ARB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.SushiSwap_WETH_ARB);
        console.log("1 WETH_ARB to usd: ", price);
      });

      it("owner updates the oracleTimeout to 35 hours", async () => {
        await priceOracle.updateOracleExpirationThreshold(126000);
        expect(await priceOracle.oracleExpirationThreshold()).to.be.equal(126000);
      });

      it("non owner should not be able to update oracleTimeout", async () => {
        await expect(priceOracle.connect(nonOwner).updateOracleExpirationThreshold(100000)).to.be.revertedWith(
          "Ownable: caller is not the owner",
        );
      });
    });
  });
});