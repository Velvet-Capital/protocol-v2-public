// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

interface IVelvetSafeModule {
  function transferModuleOwnership(address newOwner) external;

  /// @dev Initialize function, will be triggered when a new proxy is deployed
  /// @param initializeParams Parameters of initialization encoded
  function setUp(bytes memory initializeParams) external;

  function executeWallet(address handlerAddresses, bytes calldata encodedCalls) external returns (bool, bytes memory);

  function executeWalletDelegate(bytes calldata encodedCalls) external returns (bool isSuccess);
}
