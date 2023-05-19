// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface ISlippageControl {
  function maxSlippage(address) external returns (uint256);
}
