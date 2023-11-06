// SPDX-License-Identifier: BUSL-1.1
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

  function chargeEntryFee(uint256 _mintAmount, uint256 _fee) external returns (uint256);

  function chargeExitFee(uint256 _mintAmount, uint256 _fee) external returns (uint256, uint256, uint256);
}