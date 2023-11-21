// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

interface WrappedTokenGateway {
    function depositETH(
    address pool,
    address onBehalfOf,
    uint16 referralCode
  ) external payable;

  function withdrawETH(
    address pool,
    uint256 amount,
    address onBehalfOf
  ) external;
}