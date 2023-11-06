// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

interface IcToken {
  function underlying(address owner) external returns (address);

  function balanceOf(address owner) external view returns (uint);

  function balanceOfUnderlying(address owner) external returns (uint);

  function mint(uint mintAmount) external returns (uint);

  function mint() external payable;

  function exchangeRateCurrent() external returns (uint);

  function supplyRatePerBlock() external view returns (uint);

  function redeem(uint redeemTokens) external returns (uint);

  function redeemUnderlying(uint redeemAmount) external returns (uint);
}
