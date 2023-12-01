import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { chainIdToAddresses } from "../../scripts/networkVariables";
import console from "console";

import {
  tokenAddresses,
  baseHandler,
  wombatHandler,
  priceOracle,
  apeSwapLPHandler,
  sushiLpHandler,
  hopHandler,
} from "./Deployments.test";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

const ps = require("prompt-sync");
const userInput = ps();

let handlerJSON = require("../../config/ArbitrumHandlerTestingData.json");
let underlyingjson = require("../../config/arbitrum-underlying.json");

var startLoopValue = 0;
var endLoopValue = 0;
var startTokenValue = 0;
var endTokenValue = 0;
let dataArray: any;
let tokenAddresses1: any;
let urChoice: any;
// let priceOracle: any;

// console.log(
//   "\n<-------------------------------------------------->"
// );
// console.log("How would you want to run the handler-based tests? \n 0 --> for all protocols and tokens at once \n 1 --> for a specific token of a protocol");
// console.log(
//   "<-------------------------------------------------->"
// );
// let wishInput = userInput("Enter your choice: ");

// By default, all the handlers will be tested. For specific testing, change the wishInput variable = 1.
let wishInput = 0;

async function deployPriceOracle() {
  // const PriceOracle = await ethers.getContractFactory("PriceOracle");
  // priceOracle = await PriceOracle.deploy();
  // await priceOracle.deployed();
  await tokenAddresses(priceOracle.address, true);
}

if (wishInput == 0) {
  startLoopValue = 1;
  endLoopValue = handlerJSON.length;
  startTokenValue = 3;
} else if (wishInput == 1) {
  console.log("\nEnter the number for the corresponding handler whose functions you want to check: ");
  for (let i = 0; i < handlerJSON.length; i++) {
    console.log("Press ", i + 1, " for ", handlerJSON[i].protocolName);
  }
  let numInput = userInput("Enter your choice : ");
  console.log("\n----------Choose token----------");
  tokenAddresses1 = Object.keys(handlerJSON[numInput - 1]);
  for (let j = 3; j < tokenAddresses1.length; j++) {
    console.log("Press", j - 2, "for", tokenAddresses1[j]);
  }
  urChoice = userInput("Enter the token number you want to test: ");
  let tokenNumber = parseInt(urChoice) + 2;

  startLoopValue = numInput;
  endLoopValue = numInput;
  startTokenValue = tokenNumber;
  endTokenValue = tokenNumber;
} else {
  throw new Error("Wrong input provided!");
}

for (let protocolVariable = startLoopValue; protocolVariable <= endLoopValue; protocolVariable++) {
  if (startTokenValue != endTokenValue) {
    let temp = Object.keys(handlerJSON[protocolVariable - 1]).length;
    endTokenValue = temp - 5;
  }
  if (protocolVariable == startLoopValue) {
    deployPriceOracle();
  }
  for (let tokenVariable = startTokenValue; tokenVariable <= endTokenValue; tokenVariable++) {
    describe.only("Tests for Handler", () => {
      let accounts;
      let owner: SignerWithAddress;
      let addrs: SignerWithAddress[];
      let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
      let token;
      let pancakeswaplp: any;
      let biswaplp: any;
      const forkChainId: any = process.env.FORK_CHAINID;
      const provider = ethers.provider;
      const chainId: any = forkChainId ? forkChainId : 42161;
      const addresses = chainIdToAddresses[chainId];
      let handlerVariable: any;
      let underlyingAddresses: any;

      underlyingAddresses = Object.values(underlyingjson);

      describe.only("Initial setup", () => {
        before(async () => {
          accounts = await ethers.getSigners();
          [owner] = accounts;
          const no_of_inits = handlerJSON[protocolVariable - 1].no_of_inits;
          const HandlerName = handlerJSON[protocolVariable - 1].handlerName;
          const deployHandler = await ethers.getContractFactory(HandlerName);

          if (no_of_inits == "1") {
            handlerVariable = await deployHandler.deploy(
              priceOracle.address,
              handlerJSON[protocolVariable - 1].init_Array[0],
            );
            await handlerVariable.deployed();
          } else if (no_of_inits == "2") {
            handlerVariable = await deployHandler.deploy(
              priceOracle.address,
              handlerJSON[protocolVariable - 1].init_Array[0],
              handlerJSON[protocolVariable - 1].init_Array[1],
            );
            await handlerVariable.deployed();
          } else if (no_of_inits == "3") {
            handlerVariable = await deployHandler.deploy(
              priceOracle.address,
              handlerJSON[protocolVariable - 1].init_Array[0],
              handlerJSON[protocolVariable - 1].init_Array[1],
              handlerJSON[protocolVariable - 1].init_Array[2],
            );
            await handlerVariable.deployed();
          } else {
            handlerVariable = await deployHandler.deploy(priceOracle.address);
            await handlerVariable.deployed();
          }

          dataArray = Object.values(handlerJSON[protocolVariable - 1]);
          console.log("\nTests running for Handler:", handlerJSON[protocolVariable - 1].protocolName);
          console.log("Token address is: ", dataArray[tokenVariable], "\n");
        });

        describe("Test cases for Handler", function () {
          it("should lend tokens", async () => {
            const time = Math.floor(Date.now() / 1000) + 1000000000;
            const token = await ethers.getContractAt("IaToken", dataArray[tokenVariable]);
            const swapping = await ethers.getContractAt("IUniswapV2Router02", addresses.SushiSwapRouterAddress);
            const result = await handlerVariable.getUnderlying(dataArray[tokenVariable]);
            const token1 = result[0];
            const token1Count = await ethers.getContractAt("IaToken", token1);
            await token.connect(owner).approve(addresses.SushiSwapRouterAddress, "10000000000000000000");
            await token1Count.connect(owner).approve(addresses.SushiSwapRouterAddress, "10000000000000000000");
            const balanceBefore = await token.balanceOf(owner.address);
            const path1 = async () => {
              let path = new Array(2);
              path[0] = await swapping.WETH();
              path[1] = token1;
              return path;
            };
            const Path1 = await path1();
            if (result[1]) {
              //if token is lp token
              const token2 = result[1];
              const token2Count = await ethers.getContractAt("IaToken", token2);
              await token2Count.connect(owner).approve(addresses.SushiSwapRouterAddress, "10000000000000000000");
              const path2 = async () => {
                let path = new Array(2);
                path[0] = await swapping.WETH();
                path[1] = token2;
                return path;
              };
              const Path2 = await path2();
              if (token1.toUpperCase() != addresses.WETH.toUpperCase()) {
                const swapResult1 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path1, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              if (token2.toUpperCase() != addresses.WETH.toUpperCase()) {
                const swapResult2 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path2, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              if (token2.toUpperCase() != addresses.WETH.toUpperCase()) {
                const swapResult2 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path2, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              const balanceAfterToken1 = await token1Count.balanceOf(handlerVariable.address);
              const balanceAfterToken2 = await token2Count.balanceOf(handlerVariable.address);

              if (handlerJSON[protocolVariable - 1].handlerInit == "true") {
                handlerVariable.addOrUpdateProtocolSlippage("1000");
              }

              if (token1.toUpperCase() == addresses.WETH.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000", balanceAfterToken2],
                  "600",
                  owner.address,
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
                lend.wait();
              } else if (token2.toUpperCase() == addresses.WETH.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  [balanceAfterToken1, "1000000000000000000"],
                  "600",
                  owner.address,
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
                lend.wait();
              } else {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  [balanceAfterToken1, balanceAfterToken2],
                  "600",
                  owner.address,
                  owner.address,
                );
                lend.wait();
              }
            } else {
              //if token is not lp token
              if (token1.toUpperCase() == addresses.WETH.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000"],
                  "600",
                  owner.address,
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
                lend.wait();
              } else {
                const swapResult1 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path1, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
                const handlerbalance = await token1Count.balanceOf(handlerVariable.address);
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  [handlerbalance],
                  "600",
                  owner.address,
                  owner.address,
                );
                lend.wait();
              }
            }
            const balanceAfter = await token.balanceOf(owner.address);
            expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
          });

          it("return values of deposit should be greater than 0", async () => {
            const time = Math.floor(Date.now() / 1000) + 1000000000;
            const token = await ethers.getContractAt("IaToken", dataArray[tokenVariable]);
            const swapping = await ethers.getContractAt("IUniswapV2Router02", addresses.SushiSwapRouterAddress);
            const result = await handlerVariable.getUnderlying(dataArray[tokenVariable]);
            const token1 = result[0];
            const token1Count = await ethers.getContractAt("IaToken", token1);
            await token.connect(owner).approve(addresses.SushiSwapRouterAddress, "10000000000000000000");
            await token1Count.connect(owner).approve(addresses.SushiSwapRouterAddress, "10000000000000000000");
            const balanceBefore = await token.balanceOf(owner.address);
            const path1 = async () => {
              let path = new Array(2);
              path[0] = await swapping.WETH();
              path[1] = token1;
              return path;
            };
            const Path1 = await path1();
            let depositResult;
            if (result[1]) {
              //if token is lp token
              const token2 = result[1];
              const token2Count = await ethers.getContractAt("IaToken", token2);
              await token2Count.connect(owner).approve(addresses.SushiSwapRouterAddress, "10000000000000000000");
              const path2 = async () => {
                let path = new Array(2);
                path[0] = await swapping.WETH();
                path[1] = token2;
                return path;
              };
              const Path2 = await path2();
              if (token1.toUpperCase() != addresses.WETH.toUpperCase()) {
                const swapResult1 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path1, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              if (token2.toUpperCase() != addresses.WETH.toUpperCase()) {
                const swapResult2 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path2, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              if (token2.toUpperCase() != addresses.WETH.toUpperCase()) {
                const swapResult2 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path2, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              const balanceAfterToken1 = await token1Count.balanceOf(handlerVariable.address);
              const balanceAfterToken2 = await token2Count.balanceOf(handlerVariable.address);

              if (handlerJSON[protocolVariable - 1].handlerInit == "true") {
                handlerVariable.addOrUpdateProtocolSlippage("700");
              }

              if (token1.toUpperCase() == addresses.WETH.toUpperCase()) {
                depositResult = await handlerVariable.callStatic.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000", balanceAfterToken2],
                  "600",
                  owner.address,
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
              } else if (token2.toUpperCase() == addresses.WETH.toUpperCase()) {
                depositResult = await handlerVariable.callStatic.deposit(
                  dataArray[tokenVariable],
                  [balanceAfterToken1, "1000000000000000000"],
                  "600",
                  owner.address,
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
              } else {
                depositResult = await handlerVariable.callStatic.deposit(
                  dataArray[tokenVariable],
                  [balanceAfterToken1, balanceAfterToken2],
                  "600",
                  owner.address,
                  owner.address,
                );
              }
            } else {
              //if token is not lp token
              if (token1.toUpperCase() == addresses.WETH.toUpperCase()) {
                depositResult = await handlerVariable.callStatic.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000"],
                  "600",
                  owner.address,
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
              } else {
                const swapResult1 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path1, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
                const handlerbalance = await token1Count.balanceOf(handlerVariable.address);
                depositResult = await handlerVariable.callStatic.deposit(
                  dataArray[tokenVariable],
                  [handlerbalance],
                  "600",
                  owner.address,
                  owner.address,
                );
              }
            }
            expect(Number(depositResult)).to.be.greaterThan(0);
          });

          it("should redeem tokens", async () => {
            const time = Math.floor(Date.now() / 1000) + 1000000000;
            const token = await ethers.getContractAt("IaToken", dataArray[tokenVariable]);
            const swapping = await ethers.getContractAt("IUniswapV2Router02", addresses.SushiSwapRouterAddress);
            const result = await handlerVariable.getUnderlying(dataArray[tokenVariable]);
            const token1 = result[0];
            const token1Count = await ethers.getContractAt("IaToken", token1);
            await token.connect(owner).approve(addresses.SushiSwapRouterAddress, "10000000000000000000");
            await token1Count.connect(owner).approve(addresses.SushiSwapRouterAddress, "10000000000000000000");

            const isWETH = async () => {
              const protocol = await ethers.getContractAt("IHandler", handlerVariable.address);
              let underlying = await protocol.getUnderlying(dataArray[tokenVariable]);
              let Underlying = underlying;
              let result = await swapping.WETH();
              return Underlying.length > 1
                ? Underlying[0] == result || Underlying[1] == result
                : Underlying[0] == result;
            };
            const checker = isWETH();

            const balanceBefore = await token.balanceOf(owner.address);
            const path1 = async () => {
              let path = new Array(2);
              path[0] = await swapping.WETH();
              path[1] = token1;
              return path;
            };
            const Path1 = await path1();
            if (result[1]) {
              //if token is lp token
              const token2 = result[1];
              const token2Count = await ethers.getContractAt("IaToken", token2);
              await token2Count.connect(owner).approve(addresses.SushiSwapRouterAddress, "10000000000000000000");
              const path2 = async () => {
                let path = new Array(2);
                path[0] = await swapping.WETH();
                path[1] = token2;
                return path;
              };
              const Path2 = await path2();
              if (token1.toUpperCase() != addresses.WETH.toUpperCase()) {
                const swapResult1 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path1, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              if (token2.toUpperCase() != addresses.WETH.toUpperCase()) {
                const swapResult2 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path2, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              const balanceAfterToken1 = await token1Count.balanceOf(handlerVariable.address);
              const balanceAfterToken2 = await token2Count.balanceOf(handlerVariable.address);
              if (token1.toUpperCase() == addresses.WETH.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000", balanceAfterToken2],
                  "600",
                  handlerVariable.address,
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
                lend.wait();
              } else if (token2.toUpperCase() == addresses.WETH.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  [balanceAfterToken1, "1000000000000000000"],
                  "600",
                  handlerVariable.address,
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
                lend.wait();
              } else {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  [balanceAfterToken1, balanceAfterToken2],
                  "600",
                  handlerVariable.address,
                  owner.address,
                );
                lend.wait();
              }
            } else {
              //if token is not lp token
              if (token1.toUpperCase() == addresses.WETH.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000"],
                  "600",
                  handlerVariable.address,
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
                lend.wait();
              } else {
                const swapResult1 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path1, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
                const handlerbalance = await token1Count.balanceOf(handlerVariable.address);
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  [handlerbalance],
                  "600",
                  handlerVariable.address,
                  owner.address,
                );
                lend.wait();
              }
            }
            const handlerBalanceBefore = await token.balanceOf(handlerVariable.address);
            const ownerBalanceBefore = await token1Count.balanceOf(owner.address);

            const redeem = await handlerVariable.redeem({
              _yieldAsset: dataArray[tokenVariable],
              _amount: handlerBalanceBefore,
              _lpSlippage: "600",
              _to: owner.address,
              isWETH: checker,
            });
            redeem.wait();
            const handlerBalanceAfter = await token.balanceOf(handlerVariable.address);
            const ownerBalanceAfter = await token1Count.balanceOf(owner.address);
            expect(Number(handlerBalanceBefore)).to.be.greaterThan(Number(handlerBalanceAfter));
          });

          it("gets underlying asset of the token", async () => {
            const result = await handlerVariable.getUnderlying(dataArray[tokenVariable]);
            const transformed = underlyingAddresses.toString().toUpperCase().split(",");
            const found = transformed.indexOf(result[0].toUpperCase()) > -1;
            expect(found).to.be.true;
          });

          it("should get token balance of the token holder", async () => {
            const token = await ethers.getContractAt("IaToken", dataArray[tokenVariable]);

            const result = await handlerVariable.getTokenBalance(owner.address, token.address);
            expect(Number(result)).to.be.greaterThan(0);
          });

          it("should get the token price in USD", async () => {
            const token = await ethers.getContractAt("IaToken", dataArray[tokenVariable]);
            const tokenBalance = await handlerVariable.callStatic.getTokenBalanceUSD(owner.address, token.address);

            expect(Number(tokenBalance)).to.be.greaterThan(0);
          });
        });
      });
    });
  }
}
