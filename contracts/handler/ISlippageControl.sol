// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

interface ISlippageControl {
  function maxSlippage(address) external returns (uint256);
}