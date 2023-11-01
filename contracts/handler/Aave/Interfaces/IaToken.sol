// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

interface IaToken {
  function UNDERLYING_ASSET_ADDRESS() external view returns (address);

  function POOL() external view returns (address);

  function balanceOf(address owner) external view returns (uint);

  function approve(address spender, uint256 amount) external returns (bool);
}
