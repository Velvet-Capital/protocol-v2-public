// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface IFeeModule {
  function chargeFeesFromIndex(uint256 _vaultBalance) external;

  function init(
    address _indexSwap,
    address _assetManagerConfig,
    address _tokenRegistry,
    address _accessController
  ) external;

  function chargeFees() external;
}
