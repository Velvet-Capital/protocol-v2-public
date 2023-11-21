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
  let mockPriceOracle:any;
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for priceOracle contract", () => {
    before(async () => {
      const PriceOracle = await ethers.getContractFactory("MockPriceOracle");
      mockPriceOracle = await PriceOracle.deploy();
      await mockPriceOracle.deployed();

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();

      const tx = await mockPriceOracle._addFeed(
        [
          addresses.WBNB,
          addresses.BUSD,
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
          addresses.BUSD,
          addresses.DOGE_Address,
        ],
        [
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          addresses.WBNB,
          "0x0000000000000000000000000000000000000348",
        ],
        [
          "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
          "0xcBb98864Ef56E9042e7d2efef76141f15731B82f",
          "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
          "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf",
          "0x87Ea38c9F24264Ec1Fff41B04ec94a97Caf99941",
          "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8",
        ],
      );

      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, addr1, addr2, treasury, ...addrs] = accounts;

      iaddress = await tokenAddresses();
      await tokenRegistry.initialize(
        "3000000000000000000",
        "120000000000000000000000",
        treasury.address,
        addresses.WETH_Address
      );

      const UniswapV2Handler = await ethers.getContractFactory("UniswapV2Handler");
      swapHandler = await UniswapV2Handler.deploy();
      await swapHandler.deployed();

      swapHandler.init(addresses.PancakeSwapRouterAddress, priceOracle.address);

      const wbnbPrice = await priceOracle.getPrice(addresses.WBNB, "0x0000000000000000000000000000000000000348");
      const busdPrice = await priceOracle.getPrice(addresses.BUSD, "0x0000000000000000000000000000000000000348");
      const dogePrice = await priceOracle.getPrice(addresses.DOGE_Address, "0x0000000000000000000000000000000000000348");
      const normalPrice = await priceOracle.getPrice(
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "0x0000000000000000000000000000000000000348",
      );
      console.log("wbnbPrice", wbnbPrice);
      await mockPriceOracle.setMockData(addresses.WBNB, wbnbPrice);
      await mockPriceOracle.setMockData(addresses.BUSD, busdPrice);
      await mockPriceOracle.setMockData(addresses.DOGE_Address, "0");
      await mockPriceOracle.setMockData("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", normalPrice);
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

      it("should revert if base array length does not match the length of other arrays", async () => {
        await expect(
          priceOracle._addFeed(
            [iaddress.ethAddress, iaddress.btcAddress],
            [iaddress.wbnbAddress],
            ["0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726"],
          ),
        ).to.be.revertedWithCustomError(priceOracle, "IncorrectArrayLength");
      });

      it("should revert if quote array length does not match the length of other arrays", async () => {
        await expect(
          priceOracle._addFeed(
            [iaddress.ethAddress, iaddress.btcAddress],
            [iaddress.wbnbAddress, "0x0000000000000000000000000000000000000348"],
            ["0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726"],
          ),
        ).to.be.revertedWithCustomError(priceOracle, "IncorrectArrayLength");
      });

      it("should revert if quote array length does not match the length of other arrays", async () => {
        await expect(
          priceOracle._addFeed(
            [iaddress.ethAddress],
            [iaddress.wbnbAddress],
            ["0x63D407F32Aa72E63C7209ce1c2F5dA40b3AaE726", "0xcBb98864Ef56E9042e7d2efef76141f15731B82f"],
          ),
        ).to.be.revertedWithCustomError(priceOracle, "IncorrectArrayLength");
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

      it("Get DOGE price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(iaddress.dogeAddress);
        console.log("1 doge to usd: ", price);
      });

      it("Get BUSD price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(iaddress.busdAddress);
        console.log("1 busd to usd: ", price);
      });

      it("Get ETH price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(iaddress.ethAddress);
        console.log("1 eth to usd: ", price);
      });

      it("Get BTC price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(iaddress.btcAddress);
        console.log("1 btc to usd: ", price);
      });

      it("Get WBNB_BUSD price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.WBNB_BUSDLP_Address);
        console.log("1 WBNB_BUSDLP to usd: ", price);
      });

      it("Get CAKE_BUSD price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.Cake_BUSDLP_Address);
        console.log("1 CAKE_BUSDLP to usd: ", price);
      });

      it("Get CAKE_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.Cake_WBNBLP_Address);
        console.log("1 CAKE_WBNBLP to usd: ", price);
      });

      it("Get ADA_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.ADA_WBNBLP_Address);
        console.log("1 ADA_WBNBLP to usd: ", price);
      });

      it("Get BAND_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.BAND_WBNBLP_Address);
        console.log("1 BAND_WBNBLP to usd: ", price);
      });

      it("Get DOT_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.DOT_WBNBLP_Address);
        console.log("1 DOT_WBNBLP to usd: ", price);
      });

      it("Get DOGE_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.DOGE_WBNBLP_Address);
        console.log("1 DOGE_WBNBLP to usd: ", price);
      });

      it("Get BSWAP_WBNB_BUSD price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.BSwap_WBNB_BUSDLP_Address);
        console.log("1 BSWAP_WBNB_BUSD LP to usd: ", price);
      });

      it("Get BSWAP_BUSDT_BUSD price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.BSwap_BUSDT_BUSDLP_Address);
        console.log("1 BSWAP_BUSDT_BUSD LP to usd: ", price);
      });

      it("Get BSWAP_BUSDT_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.BSwap_BUSDT_WBNBLP_Address);
        console.log("1 BSWAP_BUSDT_WBNB LP to usd: ", price);
      });

      it("Get BSWAP_ETH_BTC price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.BSwap_ETH_BTCLP_Address);
        console.log("1 BSWAP_ETH_BTC LP to usd: ", price);
      });

      it("Get BSWAP_BTC_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.BSwap_BTC_WBNBLP_Address);
        console.log("1 BSWAP_BTC_WBNB LP to usd: ", price);
      });

      it("Get BSWAP_DOGE_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.BSwap_DOGE_WBNBLPAddress);
        console.log("1 BSWAP_DOGE_WBNB LP to usd: ", price);
      });

      it("Get APESWAP_WBNB_BUSD price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.ApeSwap_WBNB_BUSD_Address);
        console.log("1 APESWAP_WBNB_BUSD LP to usd: ", price);
      });

      it("Get APESWAP_ETH_BTCB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.ApeSwap_ETH_BTCB_Address);
        console.log("1 APESWAP_ETH_BTCB LP to usd: ", price);
      });

      it("Get APESWAP_ETH_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.ApeSwap_ETH_WBNB_Address);
        console.log("1 APESWAP_ETH_WBNB LP to usd: ", price);
      });

      it("Get APESWAP_USDT_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.ApeSwap_USDT_WBNB_Address);
        console.log("1 APESWAP_USDT_WBNB LP to usd: ", price);
      });

      it("Get APESWAP_DOGE_WBNB price in 18 decimals", async () => {
        const price = await priceOracle.getPriceForOneTokenInUSD(addresses.ApeSwap_DOGE_WBNB_Address);
        console.log("1 APESWAP_DOGE_WBNB LP to usd: ", price);
      });

      it("owner updates the oracleTimeout to 35 hours",async () => {
        await priceOracle.updateOracleExpirationThreshold(126000);
        expect(await priceOracle.oracleExpirationThreshold()).to.be.equal(126000);
      });

      it("non owner should not be able to update oracleTimeout",async () => {
        await expect(priceOracle.connect(nonOwner).updateOracleExpirationThreshold(100000)).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });
  });
});