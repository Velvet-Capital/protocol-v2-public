// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {IPool} from "./IPool.sol";

interface IWombatRouter {
  function addLiquidityNative(
    IPool pool,
    uint256 minimumLiquidity,
    address to,
    uint256 deadline,
    bool shouldStake
  ) external payable returns (uint256 liquidity);

  function removeLiquidityNative(
    IPool pool,
    uint256 liquidity,
    uint256 minimumAmount,
    address to,
    uint256 deadline
  ) external returns (uint256 amount);
}
