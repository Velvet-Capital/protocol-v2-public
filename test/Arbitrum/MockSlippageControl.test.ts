import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { ethers, upgrades } from "hardhat";

import {
  MockSlippageControl,
} from "../../typechain";

import { chainIdToAddresses } from "../../scripts/networkVariables";
import { BigNumber } from "ethers";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for MixedIndex", () => {
  let slippageControl : MockSlippageControl

  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 42161;
  const addresses = chainIdToAddresses[chainId];

  describe("Tests for MixedIndex ", () => {
    describe("Test Slippage Control", async function () {
        beforeEach(async function() {
          const SlippageControlDefault = await ethers.getContractFactory("MockSlippageControl");
          slippageControl = await SlippageControlDefault.deploy();
          await slippageControl.deployed();
        });
        it("Should pass the slippage control for small values", async function() {
          const amountA = ethers.utils.parseEther("1.01"); // Small increment from 1
          const amountB = ethers.utils.parseEther("1.02");
          const priceA = ethers.utils.parseEther("1");
          const priceB = ethers.utils.parseEther("1.005"); // Midway between amountA and amountB
          const lpSlippage = 200; // 2%
          expect(await slippageControl.callStatic._validateLPSlippage(amountA, amountB, priceA, priceB, lpSlippage)).to.equal(true);
        });
        it("Should pass the slippage control for large values", async function() {
          const amountA = ethers.utils.parseEther("1000000000"); // 1 billion
          const amountB = ethers.utils.parseEther("1000000001"); // Slightly more than 1 billion
          const priceA = ethers.utils.parseEther("1000000000"); // 1 billion
          const priceB = ethers.utils.parseEther("1000000000.5"); // Midway between amountA and amountB
          const lpSlippage = 200; // 2%
          expect(await slippageControl.callStatic._validateLPSlippage(amountA, amountB, priceA, priceB, lpSlippage)).to.equal(true);
        });
    });
  });
});
