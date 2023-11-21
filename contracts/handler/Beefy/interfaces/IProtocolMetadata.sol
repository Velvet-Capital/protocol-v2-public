// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

interface IProtocolMetadata {
  function getUnderlyingAmount(address _tokenHolder, uint256 _amount, address token) external view returns (uint256);
}