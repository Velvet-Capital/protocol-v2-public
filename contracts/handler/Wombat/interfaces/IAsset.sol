// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.16;

interface IAsset {
  function pool() external view returns (address);

  function approve(address spender, uint256 amount) external returns (bool);

  function transfer(address dst, uint256 amount) external returns (bool);

  function transferFrom(address src, address dst, uint256 amount) external returns (bool);

  function decimals() external view returns (uint8);

  function balanceOf(address owner) external view returns (uint256);

  function underlyingTokenBalance() external view returns (uint256);

  function underlyingToken() external view returns (address);

  function totalSupply() external view returns (uint256);
}
