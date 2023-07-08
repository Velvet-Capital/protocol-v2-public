// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.16;

interface IPool {
  function deposit(
    address token,
    uint256 amount,
    uint256 minimumLiquidity,
    address to,
    uint256 deadline,
    bool shouldStake
  ) external returns (uint256 liquidity);

  function withdraw(
    address token,
    uint256 liquidity,
    uint256 minimumAmount,
    address to,
    uint256 deadline
  ) external returns (uint256 amount);

  function quotePotentialWithdraw(address token, uint256 liquidity) external returns (uint256 amount, uint256 fee);

  function quotePotentialDeposit(address token, uint256 liquidity) external returns (uint256 amount, uint256 fee);
}
