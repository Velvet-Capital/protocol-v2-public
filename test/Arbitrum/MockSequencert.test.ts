import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";

import { Exchange, UniswapV2Handler, PriceOracle, TokenRegistry, VelvetSafeModule } from "../../typechain";

import { chainIdToAddresses } from "../../scripts/networkVariables";
import { indexSwapLibrary, tokenAddresses, IAddresses } from "./Deployments.test";

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
  let priceOracle: any;
  //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
  let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
  let token;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 42161;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for priceOracle contract", () => {
    before(async () => {
      const PriceOracle = await ethers.getContractFactory("MockPriceOracleL2");
      priceOracle = await PriceOracle.deploy(addresses.WETH,addresses.SequencerUptimeFeed);
      await priceOracle.deployed();

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();

      const tx = await priceOracle._addFeed(
        [
          addresses.WETH,
          addresses.USDT,
          "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          addresses.WBTC,
          addresses.USDT,
          addresses.ADoge,
        ],
        [
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          "0x0000000000000000000000000000000000000348",
          addresses.WETH,
          "0x0000000000000000000000000000000000000348",
        ],
        [
          "0x639fe6ab55c921f74e7fac1ee960c0b6293ba612",
          "0x3f3f5df88dc9f13eac63df89ec16ef6e7e25dde7",
          "0x639fe6ab55c921f74e7fac1ee960c0b6293ba612",
          "0xc5a90A6d7e4Af242dA238FFe279e9f2BA0c64B2e",
          "0x07C5b924399cc23c24a95c8743DE4006a32b7f2a",
          "0x9a7fb1b3950837a8d9b40517626e11d4127c098c",
        ],
      );

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
        console.log(price);
      });

      it("should revert if sequncer is not up", async () => {
        await priceOracle.changeSequncerUpTime(1);
        await expect(priceOracle.getPrice(addresses.WBTC, "0x0000000000000000000000000000000000000348")).to.be.revertedWithCustomError(priceOracle,"SequencerIsDown");
      })

      it("should revert if sequencer is up after downtime and threshold period is not over",async () => {
        await priceOracle.changeSequncerUpTime(0);
        await priceOracle.setSequencerStartedAt(0);//Setting here zero so startedAt in priceOracle will be set to block.timestamp
        await expect(priceOracle.getPrice(addresses.WBTC, "0x0000000000000000000000000000000000000348")).to.be.revertedWithCustomError(priceOracle,"SequencerThresholdNotCrossed");
      })

      it("getPrice should work after sequencer is up and threshold is crossed",async () => {
        await priceOracle.changeSequncerUpTime(0);
        await priceOracle.setSequencerStartedAt(1);//Setting here 1 so startedAt in priceOracle will be set to actual value
        const price = await priceOracle.getPrice(addresses.WBTC, "0x0000000000000000000000000000000000000348");
        console.log(price);
      })

      it("should changes sequencer threshold ", async () => {
        await priceOracle.updateSequencerThreshold("1000");
        expect(await priceOracle.sequencerThreshold()).to.be.equal(1000)
      })
    });
  });
});