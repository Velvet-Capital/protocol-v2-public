// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.8.16;

import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

contract Vault is Ownable {
  /**
   * @notice This function executes to get non derivative tokens back to vault
   */
  function executeWallet(
    address handlerAddresses,
    bytes calldata encodedCalls
  ) public onlyOwner returns (bool isSuccess) {
    (isSuccess, ) = handlerAddresses.call(encodedCalls);
    require(isSuccess, "Call failed");
  }
}
