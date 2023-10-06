// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.16;

interface FactoryInterface {
  function getPair(address tokenA, address tokenB) external view returns (address pair);

  function feeTo() external view returns (address);
}
