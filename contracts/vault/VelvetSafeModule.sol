// SPDX-License-Identifier: LGPL-3.0-only

/**
 * @title VelvetSafeModule for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used for creating a bridge between the contract and the gnosis safe vault
 * @dev This contract includes functionalities:
 *      1. Add a new owner of the vault
 *      2. Transfer BNB and other tokens to and fro from vault
 */
pragma solidity 0.8.16;

import {Module, Enum} from "@gnosis.pm/zodiac/contracts/core/Module.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

contract VelvetSafeModule is Module {
  address public multiSendLibrary;

  /**
   * @notice This function transfers module ownership
   */
  function setUp(bytes memory initializeParams) public override initializer {
    __Ownable_init();
    (address _safeAddress, address _exchange, address _multiSendLib) = abi.decode(
      initializeParams,
      (address, address, address)
    );
    multiSendLibrary = _multiSendLib;
    setAvatar(_safeAddress);
    setTarget(_safeAddress);
    transferOwnership(_exchange);
  }

  /**
   * @notice This function executes to get non derivative tokens back to vault
   */
  function executeWallet(
    address handlerAddresses,
    bytes calldata encodedCalls
  ) public onlyOwner returns (bool isSuccess) {
    isSuccess = exec(handlerAddresses, 0, encodedCalls, Enum.Operation.Call);
    require(isSuccess, "Call failed");
  }

  /**
   * @notice This function executes encoded calls using the module to the vault
   */
  function executeWalletDelegate(bytes calldata encodedCalls) public onlyOwner returns (bool isSuccess) {
    isSuccess = exec(multiSendLibrary, 0, encodedCalls, Enum.Operation.DelegateCall);
    require(isSuccess, "Call Failed");
  }
}
