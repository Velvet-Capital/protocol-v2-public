// SPDX-License-Identifier: BUSL-1.1

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
import {ErrorLibrary} from "../library/ErrorLibrary.sol";

contract VelvetSafeModule is Module {
  address public multiSendLibrary;

  /**
   * @notice This function transfers module ownership
   * @param initializeParams Encoded data having the init parameters
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
   * @param handlerAddresses Address of the handler to be used
   * @param encodedCalls Encoded calldata for the `executeWallet` function
   */
  function executeWallet(
    address handlerAddresses,
    bytes calldata encodedCalls
  ) public onlyOwner returns (bool isSuccess, bytes memory data) {
    (isSuccess, data) = execAndReturnData(handlerAddresses, 0, encodedCalls, Enum.Operation.Call);
    if (!isSuccess) revert ErrorLibrary.CallFailed();
  }

  /**
   * @notice This function executes encoded calls using the module to the vault
   * @param encodedCalls Encoded calldata for the `executeWalletDelegate` function
   */
  function executeWalletDelegate(bytes calldata encodedCalls) public onlyOwner returns (bool isSuccess) {
    isSuccess = exec(multiSendLibrary, 0, encodedCalls, Enum.Operation.DelegateCall);
    if (!isSuccess) revert ErrorLibrary.CallFailed();
  }
}
