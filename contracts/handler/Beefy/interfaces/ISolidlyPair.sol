// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.16;

interface ISolidlyPair {
  function factory() external view returns (address);

  function token0() external view returns (address);

  function token1() external view returns (address);

  function burn(address to) external returns (uint amount0, uint amount1);

  function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

  function stable() external view returns (bool);

  function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256);
}
