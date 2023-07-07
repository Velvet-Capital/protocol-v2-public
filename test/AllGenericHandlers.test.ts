import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { chainIdToAddresses } from "../scripts/networkVariables";
import console from "console";

var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

const ps = require("prompt-sync");
const userInput = ps();

let handlerJSON = require("../config/HandlerTestingData.json");
let underlyingjson = require("../config/underlying.json");

var startLoopValue = 0;
var endLoopValue = 0;
var startTokenValue = 0;
var endTokenValue = 0;
let dataArray: any;
let tokenAddresses: any;
let urChoice: any;

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
  tokenAddresses = Object.keys(handlerJSON[numInput - 1]);
  for (let j = 3; j < tokenAddresses.length; j++) {
    console.log("Press", j - 2, "for", tokenAddresses[j]);
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
    endTokenValue = temp - 2;
  }
  for (let tokenVariable = startTokenValue; tokenVariable <= endTokenValue; tokenVariable++) {
    describe.only("Tests for Handler", () => {
      let accounts;
      let owner: SignerWithAddress;
      let addrs: SignerWithAddress[];
      //const APPROVE_INFINITE = ethers.BigNumber.from(1157920892373161954235); //115792089237316195423570985008687907853269984665640564039457
      let approve_amount = ethers.constants.MaxUint256; //(2^256 - 1 )
      let token;
      let pancakeswaplp: any;
      let biswaplp: any;
      const forkChainId: any = process.env.FORK_CHAINID;
      const provider = ethers.provider;
      const chainId: any = forkChainId ? forkChainId : 56;
      const addresses = chainIdToAddresses[chainId];
      let handlerVariable: any;
      let underlyingAddresses: any;

      underlyingAddresses = Object.values(underlyingjson);

      describe.only("Initial setup", () => {
        before(async () => {
          accounts = await ethers.getSigners();
          [owner] = accounts;

          const HandlerName = handlerJSON[protocolVariable - 1].handlerName;
          const deployHandler = await ethers.getContractFactory(HandlerName);

          if (HandlerName == "BeefyLPHandler") {
            const pancakeSwapLP = await ethers.getContractFactory("PancakeSwapLPHandler");
            pancakeswaplp = await pancakeSwapLP.deploy();
            await pancakeswaplp.deployed();
            await pancakeswaplp.addOrUpdateProtocolSlippage("700");

            // const biswapLP = await ethers.getContractFactory("BiSwapLPHandler");
            // biswaplp = await biswapLP.deploy();
            // await biswaplp.deployed();

            // if (tokenVariable == 3 || tokenVariable == 4) {
            handlerVariable = await deployHandler.deploy(pancakeswaplp.address);

            await handlerVariable.deployed();

            // }
            // } else if (tokenVariable == 5 || tokenVariable == 6) {
            //   handlerVariable = await deployHandler.deploy(biswaplp.address);
            //   await handlerVariable.deployed();
            // }
          } else {
            handlerVariable = await deployHandler.deploy();
            await handlerVariable.deployed();
          }

          dataArray = Object.values(handlerJSON[protocolVariable - 1]);
          console.log("\nTests running for Handler:", handlerJSON[protocolVariable - 1].protocolName);
          console.log("Token address is: ", dataArray[tokenVariable], "\n");
        });

        describe("Test cases for Handler", function () {
          it("should lend tokens", async () => {
            const time = Math.floor(Date.now() / 1000) + 1000000000;
            const token = await ethers.getContractAt("VBep20Interface", dataArray[tokenVariable]);
            const swapping = await ethers.getContractAt("IUniswapV2Router02", addresses.PancakeSwapRouterAddress);
            const result = await handlerVariable.getUnderlying(dataArray[tokenVariable]);
            const token1 = result[0];
            const token1Count = await ethers.getContractAt("VBep20Interface", token1);
            await token.connect(owner).approve(addresses.PancakeSwapRouterAddress, "10000000000000000000");
            await token1Count.connect(owner).approve(addresses.PancakeSwapRouterAddress, "10000000000000000000");
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
              const token2Count = await ethers.getContractAt("VBep20Interface", token2);
              await token2Count.connect(owner).approve(addresses.PancakeSwapRouterAddress, "10000000000000000000");
              const path2 = async () => {
                let path = new Array(2);
                path[0] = await swapping.WETH();
                path[1] = token2;
                return path;
              };
              const Path2 = await path2();
              if (token1.toUpperCase() != addresses.WETH_Address.toUpperCase()) {
                const swapResult1 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path1, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              if (token2.toUpperCase() != addresses.WETH_Address.toUpperCase()) {
                const swapResult2 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path2, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              if (token2.toUpperCase() != addresses.WETH_Address.toUpperCase()) {
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

              if (token1.toUpperCase() == addresses.WETH_Address.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000", balanceAfterToken2],
                  "600",
                  owner.address,
                  {
                    value: "1000000000000000000",
                  },
                );
                lend.wait();
              } else if (token2.toUpperCase() == addresses.WETH_Address.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  [balanceAfterToken1, "1000000000000000000"],
                  "600",
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
                );
                lend.wait();
              }
            } else {
              //if token is not lp token
              if (token1.toUpperCase() == addresses.WETH_Address.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000"],
                  "600",
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
                );
                lend.wait();
              }
            }
            const balanceAfter = await token.balanceOf(owner.address);
            expect(Number(balanceAfter)).to.be.greaterThan(Number(balanceBefore));
          });

          it("should redeem tokens", async () => {
            const time = Math.floor(Date.now() / 1000) + 1000000000;
            const token = await ethers.getContractAt("VBep20Interface", dataArray[tokenVariable]);
            const swapping = await ethers.getContractAt("IUniswapV2Router02", addresses.PancakeSwapRouterAddress);
            const result = await handlerVariable.getUnderlying(dataArray[tokenVariable]);
            const token1 = result[0];
            const token1Count = await ethers.getContractAt("VBep20Interface", token1);
            await token.connect(owner).approve(addresses.PancakeSwapRouterAddress, "10000000000000000000");
            await token1Count.connect(owner).approve(addresses.PancakeSwapRouterAddress, "10000000000000000000");

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
              const token2Count = await ethers.getContractAt("VBep20Interface", token2);
              await token2Count.connect(owner).approve(addresses.PancakeSwapRouterAddress, "10000000000000000000");
              const path2 = async () => {
                let path = new Array(2);
                path[0] = await swapping.WETH();
                path[1] = token2;
                return path;
              };
              const Path2 = await path2();
              if (token1.toUpperCase() != addresses.WETH_Address.toUpperCase()) {
                const swapResult1 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path1, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              if (token2.toUpperCase() != addresses.WETH_Address.toUpperCase()) {
                const swapResult2 = await swapping
                  .connect(owner)
                  .swapExactETHForTokens(200, Path2, handlerVariable.address, time, {
                    value: "1000000000000000000",
                  });
              }
              const balanceAfterToken1 = await token1Count.balanceOf(handlerVariable.address);
              const balanceAfterToken2 = await token2Count.balanceOf(handlerVariable.address);
              if (token1.toUpperCase() == addresses.WETH_Address.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000", balanceAfterToken2],
                  "600",
                  handlerVariable.address,
                  {
                    value: "1000000000000000000",
                  },
                );
                lend.wait();
              } else if (token2.toUpperCase() == addresses.WETH_Address.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  [balanceAfterToken1, "1000000000000000000"],
                  "600",
                  handlerVariable.address,
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
                );
                lend.wait();
              }
            } else {
              //if token is not lp token
              if (token1.toUpperCase() == addresses.WETH_Address.toUpperCase()) {
                const lend = await handlerVariable.deposit(
                  dataArray[tokenVariable],
                  ["1000000000000000000"],
                  "600",
                  handlerVariable.address,
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
            const token = await ethers.getContractAt("VBep20Interface", dataArray[tokenVariable]);

            const result = await handlerVariable.getTokenBalance(owner.address, token.address);
            expect(Number(result)).to.be.greaterThan(0);
          });

          it("should get the underlying token balance", async () => {
            const token = await ethers.getContractAt("VBep20Interface", dataArray[tokenVariable]);
            const tokenBalance = await handlerVariable.callStatic.getUnderlyingBalance(owner.address, token.address);
            if (tokenBalance[1]) {
              expect(Number(tokenBalance[1])).to.be.greaterThan(0);
            }
            expect(Number(tokenBalance[0])).to.be.greaterThan(0);
          });
        });
      });
    });
  }
}
