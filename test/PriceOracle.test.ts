import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";
import { solidity } from "ethereum-waffle";

import { Exchange, PancakeSwapHandler, PriceOracle, TokenRegistry, Vault, VelvetSafeModule } from "../typechain";

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

      const ZeroExHandler = await ethers.getContractFactory("ZeroExHandler");
      const zeroExHandler = await ZeroExHandler.deploy();
      await zeroExHandler.deployed();

      zeroExHandler.init(iaddress.wbnbAddress, "0xdef1c0ded9bec7f1a1670819833240f027b25eff");

      const IndexOperations = await ethers.getContractFactory("IndexOperations", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const indexOperations = await IndexOperations.deploy();
      await indexOperations.deployed();

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
        const price = await priceOracle.getPriceTokenUSD(
          "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
          "1000000000000000000",
        );
        // console.log(price);
      });

      it("Get ETH/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(iaddress.ethAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get BUSD/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(iaddress.busdAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get DAI/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(iaddress.daiAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get WBNB/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(iaddress.wbnbAddress, "1000000000000000000");
        // console.log(price);
      });

      it("Get DOGE/USD price", async () => {
        const price = await priceOracle.getPriceTokenUSD(iaddress.dogeAddress, "1000000000000000000");
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
        // console.log(price);
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
    });
  });
});
